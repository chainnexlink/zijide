package com.warrescue.app.service;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.CountDownTimer;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.warrescue.app.R;
import com.warrescue.app.network.TwilioService;
import com.warrescue.app.util.SessionManager;

/**
 * AI语音电话核实服务。
 * 当闪光灯超时未被用户手动关闭后，拨打AI语音电话核实用户是否安全。
 * 如用户未接通电话，则触发救援通知逻辑。
 */
public class AIVoiceCallService extends Service {

    private static final String TAG = "AIVoiceCall";
    public static final String CHANNEL_ID = "ai_voice_call_channel";
    private static final int NOTIFICATION_ID = 2002;

    public static final String ACTION_VERIFY_SAFETY = "com.warrescue.app.VERIFY_SAFETY";
    public static final String ACTION_USER_CONFIRMED = "com.warrescue.app.USER_CONFIRMED_SAFE";
    public static final String EXTRA_ALERT_TITLE = "alert_title";

    // AI语音电话等待接听超时（秒）
    private static final int CALL_ANSWER_TIMEOUT = 30;

    // TwiML URL - AI语音验证脚本（部署时替换为真实服务器URL）
    private static final String TWIML_VERIFY_URL =
            "https://warrescue.app/api/twiml/safety-verify";

    private TwilioService twilioService;
    private SessionManager sessionManager;
    private CountDownTimer callTimeoutTimer;
    private boolean callAnswered = false;
    private String alertTitle;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        twilioService = new TwilioService();
        sessionManager = new SessionManager(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String action = intent.getAction();

        if (ACTION_USER_CONFIRMED.equals(action)) {
            onUserConfirmedSafe();
            return START_NOT_STICKY;
        }

        if (!ACTION_VERIFY_SAFETY.equals(action)) {
            stopSelf();
            return START_NOT_STICKY;
        }

        alertTitle = intent.getStringExtra(EXTRA_ALERT_TITLE);
        if (alertTitle == null) alertTitle = getString(R.string.alert_flashlight_title);

        startForeground(NOTIFICATION_ID, buildNotification());
        initiateVerificationCall();

        return START_NOT_STICKY;
    }

    private void initiateVerificationCall() {
        String userPhone = sessionManager.getUserPhone();
        if (userPhone.isEmpty()) {
            Log.w(TAG, "No phone number, skipping call and triggering rescue");
            triggerRescue("no_phone_configured");
            return;
        }

        // 确保电话号码是E.164格式
        String countryCode = sessionManager.getCountryCode();
        String fullPhone = userPhone;
        if (!userPhone.startsWith("+")) {
            fullPhone = countryCode + userPhone;
        }

        Log.i(TAG, "Initiating AI safety verification call to: " + fullPhone);
        updateNotification(getString(R.string.alert_calling_user));

        if (twilioService.isConfigured()) {
            twilioService.makeCall(fullPhone, TWIML_VERIFY_URL,
                    new TwilioService.TwilioCallback() {
                        @Override
                        public void onSuccess(String callSid) {
                            Log.i(TAG, "Call initiated: " + callSid);
                            startCallAnswerTimeout();
                        }

                        @Override
                        public void onError(String error) {
                            Log.e(TAG, "Call failed: " + error);
                            triggerRescue("call_failed");
                        }
                    });
        } else {
            // Twilio未配置，模拟电话流程
            Log.w(TAG, "Twilio not configured, simulating call flow");
            updateNotification(getString(R.string.alert_call_simulated));
            startCallAnswerTimeout();
        }
    }

    private void startCallAnswerTimeout() {
        callTimeoutTimer = new CountDownTimer(CALL_ANSWER_TIMEOUT * 1000L, 1000) {
            @Override
            public void onTick(long millisUntilFinished) {
                int remaining = (int) (millisUntilFinished / 1000);
                updateNotification(getString(R.string.alert_waiting_answer, remaining));
            }

            @Override
            public void onFinish() {
                if (!callAnswered) {
                    Log.i(TAG, "Call not answered, triggering rescue");
                    triggerRescue("call_not_answered");
                }
            }
        };
        callTimeoutTimer.start();
    }

    private void onUserConfirmedSafe() {
        callAnswered = true;
        if (callTimeoutTimer != null) {
            callTimeoutTimer.cancel();
        }
        Log.i(TAG, "User confirmed safe via AI call");
        stopSelf();
    }

    private void triggerRescue(String reason) {
        Log.i(TAG, "Triggering rescue notification, reason: " + reason);

        Intent rescueIntent = new Intent(this, RescueNotificationService.class);
        rescueIntent.setAction(RescueNotificationService.ACTION_TRIGGER_RESCUE);
        rescueIntent.putExtra(RescueNotificationService.EXTRA_REASON, reason);
        rescueIntent.putExtra(RescueNotificationService.EXTRA_ALERT_TITLE, alertTitle);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(rescueIntent);
        } else {
            startService(rescueIntent);
        }
        stopSelf();
    }

    private Notification buildNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(getString(R.string.alert_ai_call_title))
                .setContentText(getString(R.string.alert_ai_call_desc))
                .setSmallIcon(R.drawable.ic_notification_alert)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .build();
    }

    private void updateNotification(String text) {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm == null) return;

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(getString(R.string.alert_ai_call_title))
                .setContentText(text)
                .setSmallIcon(R.drawable.ic_notification_alert)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .build();

        nm.notify(NOTIFICATION_ID, notification);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    getString(R.string.alert_ai_call_channel_name),
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription(getString(R.string.alert_ai_call_channel_desc));

            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        if (callTimeoutTimer != null) callTimeoutTimer.cancel();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
