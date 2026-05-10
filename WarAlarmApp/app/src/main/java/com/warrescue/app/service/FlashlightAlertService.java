package com.warrescue.app.service;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraManager;
import android.os.Build;
import android.os.CountDownTimer;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.warrescue.app.R;
import com.warrescue.app.activity.AlertPopupActivity;

/**
 * 闪光灯强提醒前台服务。
 * 以SOS模式（三短三长三短）闪烁手电筒，直到用户手动关闭。
 * 如超时未关闭，触发AI语音电话核实逻辑。
 */
public class FlashlightAlertService extends Service {

    private static final String TAG = "FlashlightAlert";
    public static final String CHANNEL_ID = "flashlight_alert_channel";
    private static final int NOTIFICATION_ID = 2001;

    public static final String ACTION_START = "com.warrescue.app.FLASHLIGHT_START";
    public static final String ACTION_STOP = "com.warrescue.app.FLASHLIGHT_STOP";
    public static final String EXTRA_ALERT_TITLE = "alert_title";
    public static final String EXTRA_ALERT_DESC = "alert_desc";
    public static final String EXTRA_TIMEOUT_SECONDS = "timeout_seconds";

    private static final int DEFAULT_TIMEOUT = 90; // 默认90秒超时

    // SOS模式: 短-短-短 长-长-长 短-短-短
    private static final long[] SOS_PATTERN = {
            200, 200, 200, 200, 200, 200,  // 三短 (亮200ms 灭200ms x3)
            600, 200, 600, 200, 600, 200,  // 三长 (亮600ms 灭200ms x3)
            200, 200, 200, 200, 200, 600   // 三短 + 间隔
    };

    private CameraManager cameraManager;
    private String cameraId;
    private Handler flashHandler;
    private boolean isFlashing = false;
    private boolean torchOn = false;
    private int patternIndex = 0;
    private CountDownTimer timeoutTimer;
    private String alertTitle;
    private String alertDesc;

    private static boolean isRunning = false;

    public static boolean isServiceRunning() {
        return isRunning;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        cameraManager = (CameraManager) getSystemService(Context.CAMERA_SERVICE);
        flashHandler = new Handler(Looper.getMainLooper());
        try {
            String[] ids = cameraManager.getCameraIdList();
            if (ids.length > 0) {
                cameraId = ids[0];
            }
        } catch (CameraAccessException e) {
            Log.e(TAG, "Camera access error", e);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopFlashlight();
            stopSelf();
            return START_NOT_STICKY;
        }

        // 启动闪光灯
        alertTitle = intent.getStringExtra(EXTRA_ALERT_TITLE);
        alertDesc = intent.getStringExtra(EXTRA_ALERT_DESC);
        int timeoutSeconds = intent.getIntExtra(EXTRA_TIMEOUT_SECONDS, DEFAULT_TIMEOUT);

        if (alertTitle == null) alertTitle = getString(R.string.alert_flashlight_title);
        if (alertDesc == null) alertDesc = getString(R.string.alert_flashlight_desc);

        startForeground(NOTIFICATION_ID, buildNotification());
        isRunning = true;

        startFlashlight();
        startTimeoutTimer(timeoutSeconds);

        // 同时启动全屏弹窗
        launchAlertPopup();

        return START_STICKY;
    }

    private void launchAlertPopup() {
        Intent popupIntent = new Intent(this, AlertPopupActivity.class);
        popupIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        popupIntent.putExtra(AlertPopupActivity.EXTRA_TITLE, alertTitle);
        popupIntent.putExtra(AlertPopupActivity.EXTRA_DESC, alertDesc);
        startActivity(popupIntent);
    }

    private void startFlashlight() {
        if (cameraId == null) {
            Log.e(TAG, "No camera available for flashlight");
            return;
        }
        isFlashing = true;
        patternIndex = 0;
        flashNextStep();
    }

    private void flashNextStep() {
        if (!isFlashing) return;

        boolean shouldBeOn = (patternIndex % 2 == 0);
        long duration = SOS_PATTERN[patternIndex % SOS_PATTERN.length];

        setTorch(shouldBeOn);

        patternIndex++;
        flashHandler.postDelayed(this::flashNextStep, duration);
    }

    private void setTorch(boolean on) {
        try {
            if (cameraId != null) {
                cameraManager.setTorchMode(cameraId, on);
                torchOn = on;
            }
        } catch (CameraAccessException e) {
            Log.e(TAG, "Torch control error", e);
        }
    }

    private void stopFlashlight() {
        isFlashing = false;
        isRunning = false;
        flashHandler.removeCallbacksAndMessages(null);
        if (torchOn) {
            setTorch(false);
        }
        if (timeoutTimer != null) {
            timeoutTimer.cancel();
            timeoutTimer = null;
        }
    }

    private void startTimeoutTimer(int seconds) {
        if (timeoutTimer != null) {
            timeoutTimer.cancel();
        }
        timeoutTimer = new CountDownTimer(seconds * 1000L, 1000) {
            @Override
            public void onTick(long millisUntilFinished) {
                // 更新通知倒计时
                int remaining = (int) (millisUntilFinished / 1000);
                updateNotificationCountdown(remaining);
            }

            @Override
            public void onFinish() {
                // 超时未手动关闭 → 触发AI语音电话核实
                Log.i(TAG, "Flashlight timeout reached, escalating to AI voice call");
                onFlashlightTimeout();
            }
        };
        timeoutTimer.start();
    }

    private void onFlashlightTimeout() {
        // 停止闪光灯
        stopFlashlight();

        // 发送广播触发AI语音电话核实
        Intent escalateIntent = new Intent(this, AIVoiceCallService.class);
        escalateIntent.setAction(AIVoiceCallService.ACTION_VERIFY_SAFETY);
        escalateIntent.putExtra(AIVoiceCallService.EXTRA_ALERT_TITLE, alertTitle);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(escalateIntent);
        } else {
            startService(escalateIntent);
        }

        stopSelf();
    }

    private Notification buildNotification() {
        Intent stopIntent = new Intent(this, FlashlightAlertService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPending = PendingIntent.getService(
                this, 0, stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent popupIntent = new Intent(this, AlertPopupActivity.class);
        popupIntent.putExtra(AlertPopupActivity.EXTRA_TITLE, alertTitle);
        popupIntent.putExtra(AlertPopupActivity.EXTRA_DESC, alertDesc);
        PendingIntent contentPending = PendingIntent.getActivity(
                this, 0, popupIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(getString(R.string.alert_flashlight_active))
                .setContentText(alertTitle)
                .setSmallIcon(R.drawable.ic_notification_alert)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setContentIntent(contentPending)
                .addAction(0, getString(R.string.alert_flashlight_stop), stopPending)
                .build();
    }

    private void updateNotificationCountdown(int secondsRemaining) {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm == null) return;

        Intent stopIntent = new Intent(this, FlashlightAlertService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPending = PendingIntent.getService(
                this, 0, stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(getString(R.string.alert_flashlight_active))
                .setContentText(getString(R.string.alert_flashlight_countdown, secondsRemaining))
                .setSmallIcon(R.drawable.ic_notification_alert)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .addAction(0, getString(R.string.alert_flashlight_stop), stopPending)
                .build();

        nm.notify(NOTIFICATION_ID, notification);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    getString(R.string.alert_channel_name),
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription(getString(R.string.alert_channel_desc));
            channel.enableVibration(true);
            channel.enableLights(true);

            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        stopFlashlight();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
