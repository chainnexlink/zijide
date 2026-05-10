package com.warrescue.app.service;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * 告警升级链协调器。
 * 管理完整的预警响应升级流程：
 *
 * 1. 消息弹窗提醒 + 闪光灯强提醒（FlashlightAlertService + AlertPopupActivity）
 * 2. 等待用户手动关闭闪光灯（90秒超时）
 * 3. 超时 → AI语音电话核实（AIVoiceCallService，30秒等待接听）
 * 4. 未接通 → 触发救援通知（RescueNotificationService）
 *
 * 调用入口：AlertEscalationManager.startEscalation(context, title, desc)
 */
public class AlertEscalationManager {

    private static final String TAG = "AlertEscalation";

    // 闪光灯超时时间（秒）
    public static final int FLASHLIGHT_TIMEOUT = 90;

    /**
     * 启动完整的告警升级链。
     * 由预警系统（AI监控/同城预警/平民上报）在确认威胁后调用。
     *
     * @param context    Application/Activity context
     * @param alertTitle 预警标题（如"基辅市区检测到空袭警报"）
     * @param alertDesc  预警描述
     */
    public static void startEscalation(Context context, String alertTitle, String alertDesc) {
        Log.i(TAG, "Starting alert escalation: " + alertTitle);

        // 第一步：启动闪光灯前台服务 + 全屏弹窗
        // FlashlightAlertService 内部会：
        //   - 启动SOS模式闪光灯
        //   - 启动AlertPopupActivity全屏弹窗
        //   - 启动超时倒计时（90秒）
        //   - 超时后自动升级到AIVoiceCallService
        Intent flashIntent = new Intent(context, FlashlightAlertService.class);
        flashIntent.setAction(FlashlightAlertService.ACTION_START);
        flashIntent.putExtra(FlashlightAlertService.EXTRA_ALERT_TITLE, alertTitle);
        flashIntent.putExtra(FlashlightAlertService.EXTRA_ALERT_DESC, alertDesc);
        flashIntent.putExtra(FlashlightAlertService.EXTRA_TIMEOUT_SECONDS, FLASHLIGHT_TIMEOUT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(flashIntent);
        } else {
            context.startService(flashIntent);
        }
    }

    /**
     * 用户手动取消告警（点击"我是安全的"）。
     * 停止整个升级链。
     */
    public static void cancelEscalation(Context context) {
        Log.i(TAG, "User cancelled alert escalation");

        Intent stopFlash = new Intent(context, FlashlightAlertService.class);
        stopFlash.setAction(FlashlightAlertService.ACTION_STOP);
        context.startService(stopFlash);
    }

    /**
     * 直接触发救援（跳过闪光灯和AI电话阶段）。
     * 用于用户主动点击"我需要帮助"的情况。
     */
    public static void triggerImmediateRescue(Context context, String alertTitle, String reason) {
        Log.i(TAG, "Immediate rescue triggered: " + reason);

        // 先停止闪光灯（如果正在运行）
        Intent stopFlash = new Intent(context, FlashlightAlertService.class);
        stopFlash.setAction(FlashlightAlertService.ACTION_STOP);
        context.startService(stopFlash);

        // 直接启动救援服务
        Intent rescueIntent = new Intent(context, RescueNotificationService.class);
        rescueIntent.setAction(RescueNotificationService.ACTION_TRIGGER_RESCUE);
        rescueIntent.putExtra(RescueNotificationService.EXTRA_REASON, reason);
        rescueIntent.putExtra(RescueNotificationService.EXTRA_ALERT_TITLE, alertTitle);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(rescueIntent);
        } else {
            context.startService(rescueIntent);
        }
    }

    /**
     * 检查告警升级链是否正在运行。
     */
    public static boolean isEscalationActive() {
        return FlashlightAlertService.isServiceRunning();
    }
}
