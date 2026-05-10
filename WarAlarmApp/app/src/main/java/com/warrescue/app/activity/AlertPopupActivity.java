package com.warrescue.app.activity;

import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.warrescue.app.R;
import com.warrescue.app.service.FlashlightAlertService;
import com.warrescue.app.service.RescueNotificationService;

/**
 * 全屏预警弹窗Activity。
 * 在锁屏之上显示，用户点击"我是安全的"关闭闪光灯。
 * 显示倒计时，提示若不操作将升级为AI语音电话核实。
 */
public class AlertPopupActivity extends AppCompatActivity {

    public static final String EXTRA_TITLE = "popup_title";
    public static final String EXTRA_DESC = "popup_desc";
    public static final String EXTRA_TIMEOUT = "popup_timeout";

    private static final int DEFAULT_TIMEOUT = 90;

    private View flashOverlay;
    private TextView tvCountdown;
    private ObjectAnimator flashAnimator;
    private CountDownTimer countdownTimer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 在锁屏之上显示
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        }
        getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        );

        setContentView(R.layout.activity_alert_popup);

        String title = getIntent().getStringExtra(EXTRA_TITLE);
        String desc = getIntent().getStringExtra(EXTRA_DESC);
        int timeout = getIntent().getIntExtra(EXTRA_TIMEOUT, DEFAULT_TIMEOUT);

        TextView tvTitle = findViewById(R.id.tvAlertTitle);
        TextView tvDesc = findViewById(R.id.tvAlertDesc);
        tvCountdown = findViewById(R.id.tvCountdown);
        flashOverlay = findViewById(R.id.flashOverlay);

        if (title != null) tvTitle.setText(title);
        if (desc != null) tvDesc.setText(desc);

        // 红色闪烁动画
        startFlashAnimation();

        // 倒计时
        startCountdown(timeout);

        // "我是安全的" 按钮
        findViewById(R.id.btnDismissAlert).setOnClickListener(v -> dismissAlert());

        // "我需要帮助" 按钮 -> 直接触发救援
        findViewById(R.id.btnEmergency).setOnClickListener(v -> triggerEmergency());
    }

    private void startFlashAnimation() {
        flashAnimator = ObjectAnimator.ofFloat(flashOverlay, "alpha", 0f, 0.6f);
        flashAnimator.setDuration(500);
        flashAnimator.setRepeatMode(ValueAnimator.REVERSE);
        flashAnimator.setRepeatCount(ValueAnimator.INFINITE);
        flashAnimator.start();
    }

    private void startCountdown(int seconds) {
        countdownTimer = new CountDownTimer(seconds * 1000L, 1000) {
            @Override
            public void onTick(long millisUntilFinished) {
                int remaining = (int) (millisUntilFinished / 1000);
                tvCountdown.setText(getString(R.string.alert_countdown_fmt, remaining));
            }

            @Override
            public void onFinish() {
                tvCountdown.setText(getString(R.string.alert_escalating));
                finish();
            }
        };
        countdownTimer.start();
    }

    private void dismissAlert() {
        // 停止闪光灯服务
        Intent stopIntent = new Intent(this, FlashlightAlertService.class);
        stopIntent.setAction(FlashlightAlertService.ACTION_STOP);
        startService(stopIntent);
        finish();
    }

    private void triggerEmergency() {
        // 停止闪光灯
        Intent stopIntent = new Intent(this, FlashlightAlertService.class);
        stopIntent.setAction(FlashlightAlertService.ACTION_STOP);
        startService(stopIntent);

        // 直接触发救援通知
        Intent rescueIntent = new Intent(this, RescueNotificationService.class);
        rescueIntent.setAction(RescueNotificationService.ACTION_TRIGGER_RESCUE);
        rescueIntent.putExtra(RescueNotificationService.EXTRA_REASON, "user_emergency");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(rescueIntent);
        } else {
            startService(rescueIntent);
        }
        finish();
    }

    @Override
    protected void onDestroy() {
        if (flashAnimator != null) flashAnimator.cancel();
        if (countdownTimer != null) countdownTimer.cancel();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        // 禁止后退键关闭，必须点按钮
    }
}
