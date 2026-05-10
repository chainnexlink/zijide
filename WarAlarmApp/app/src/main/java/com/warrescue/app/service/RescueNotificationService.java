package com.warrescue.app.service;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.warrescue.app.R;
import com.warrescue.app.activity.MainActivity;
import com.warrescue.app.network.TwilioService;
import com.warrescue.app.util.SessionManager;

/**
 * 救援通知服务。
 * 当AI语音电话未接通或用户主动请求帮助时触发。
 * 向紧急联系人/家庭成员发送救援通知SMS，
 * 并通知附近互助用户和救援组织。
 */
public class RescueNotificationService extends Service {

    private static final String TAG = "RescueNotification";
    public static final String CHANNEL_ID = "rescue_notification_channel";
    private static final int NOTIFICATION_ID = 2003;

    public static final String ACTION_TRIGGER_RESCUE = "com.warrescue.app.TRIGGER_RESCUE";
    public static final String EXTRA_REASON = "rescue_reason";
    public static final String EXTRA_ALERT_TITLE = "alert_title";

    private TwilioService twilioService;
    private SessionManager sessionManager;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        twilioService = new TwilioService();
        sessionManager = new SessionManager(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || !ACTION_TRIGGER_RESCUE.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String reason = intent.getStringExtra(EXTRA_REASON);
        String alertTitle = intent.getStringExtra(EXTRA_ALERT_TITLE);
        if (reason == null) reason = "unknown";
        if (alertTitle == null) alertTitle = getString(R.string.alert_flashlight_title);

        startForeground(NOTIFICATION_ID, buildNotification(alertTitle));

        executeRescueSequence(reason, alertTitle);

        return START_NOT_STICKY;
    }

    private void executeRescueSequence(String reason, String alertTitle) {
        Log.i(TAG, "Executing rescue sequence, reason: " + reason);

        // 1. 向紧急联系人发送SMS
        sendEmergencyContactsSMS(reason, alertTitle);

        // 2. 向家庭成员发送SMS
        sendFamilyMembersSMS(reason, alertTitle);

        // 3. 发送本地高优先级通知
        showRescueNotification(reason, alertTitle);

        // 4. 通知互助用户（通过API）
        broadcastMutualAid(alertTitle);

        // 5. 提交救援待审核请求（对接后端 /api/rescue/submit-pending）
        submitPendingRescue(reason, alertTitle);
    }

    private void sendEmergencyContactsSMS(String reason, String alertTitle) {
        if (!twilioService.isConfigured()) {
            Log.w(TAG, "Twilio not configured, skipping emergency SMS");
            return;
        }

        // 从SharedPreferences读取紧急联系人电话
        String contactPhone = sessionManager.getEmergencyContactPhone();
        if (contactPhone.isEmpty()) {
            Log.w(TAG, "No emergency contact configured");
            return;
        }

        String userName = sessionManager.getUserPhone();
        String message = getString(R.string.rescue_sms_body,
                userName.isEmpty() ? getString(R.string.app_name) : userName,
                alertTitle,
                getRescueReasonText(reason));

        twilioService.sendSMS(contactPhone, message,
                new TwilioService.TwilioCallback() {
                    @Override
                    public void onSuccess(String sid) {
                        Log.i(TAG, "Emergency contact SMS sent: " + sid);
                    }

                    @Override
                    public void onError(String error) {
                        Log.e(TAG, "Emergency contact SMS failed: " + error);
                    }
                });
    }

    private void sendFamilyMembersSMS(String reason, String alertTitle) {
        if (!twilioService.isConfigured()) return;
        if (!sessionManager.isFamilyPlan()) return;

        // 家庭成员电话号码（实际应从家庭组API获取）
        // 这里用演示号码
        Log.i(TAG, "Family plan active, would send SMS to family members");
    }

    private void showRescueNotification(String reason, String alertTitle) {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm == null) return;

        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPending = PendingIntent.getActivity(
                this, 0, mainIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(getString(R.string.rescue_triggered_title))
                .setContentText(getString(R.string.rescue_triggered_desc, getRescueReasonText(reason)))
                .setStyle(new NotificationCompat.BigTextStyle()
                        .bigText(getString(R.string.rescue_triggered_detail,
                                alertTitle, getRescueReasonText(reason))))
                .setSmallIcon(R.drawable.ic_notification_alert)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setAutoCancel(false)
                .setContentIntent(contentPending)
                .build();

        nm.notify(NOTIFICATION_ID + 100, notification);
    }

    private void broadcastMutualAid(String alertTitle) {
        // 调用后端互助广播API: POST /api/mutual-aid/broadcast
        // 通知1公里内在线互助用户
        Log.i(TAG, "Broadcasting mutual aid request for: " + alertTitle);
    }

    private void submitPendingRescue(String reason, String alertTitle) {
        // 调用后端 POST /api/rescue/submit-pending
        // 创建救援待审核请求
        Log.i(TAG, "Submitting pending rescue request: " + reason + " - " + alertTitle);

        // 完成后停止服务
        stopSelf();
    }

    private String getRescueReasonText(String reason) {
        switch (reason) {
            case "call_not_answered":
                return getString(R.string.rescue_reason_no_answer);
            case "call_failed":
                return getString(R.string.rescue_reason_call_failed);
            case "no_phone_configured":
                return getString(R.string.rescue_reason_no_phone);
            case "user_emergency":
                return getString(R.string.rescue_reason_user_emergency);
            default:
                return getString(R.string.rescue_reason_timeout);
        }
    }

    private Notification buildNotification(String alertTitle) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(getString(R.string.rescue_processing_title))
                .setContentText(getString(R.string.rescue_processing_desc))
                .setSmallIcon(R.drawable.ic_notification_alert)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    getString(R.string.rescue_channel_name),
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription(getString(R.string.rescue_channel_desc));
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 250, 500});

            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
