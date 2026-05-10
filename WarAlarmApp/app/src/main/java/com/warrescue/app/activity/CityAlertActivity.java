package com.warrescue.app.activity;

import android.animation.ValueAnimator;
import android.graphics.Color;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import com.warrescue.app.R;
import com.warrescue.app.data.DataRepository;
import com.warrescue.app.util.SessionManager;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * City Alert trigger interaction page.
 * Users long-press for 3 seconds to trigger a city alert.
 * When 3-5 users in the same city trigger, it activates the full
 * AI alert + rescue response pipeline in parallel.
 */
public class CityAlertActivity extends BaseDetailActivity {

    private static final long TRIGGER_DURATION = 3000; // 3 seconds
    private static final int TRIGGER_THRESHOLD_MIN = 3;
    private static final int TRIGGER_THRESHOLD_MAX = 5;

    private Handler triggerHandler;
    private Runnable triggerCompleteRunnable;
    private ValueAnimator progressAnimator;
    private boolean isTriggering = false;

    private TextView btnTrigger;
    private ProgressBar pbProgress;
    private TextView tvStatus;
    private ProgressBar pbThreshold;
    private TextView tvProgressLabel;

    @Override
    protected String getPageTitle() {
        return getString(R.string.city_alert);
    }

    @Override
    protected void buildContent(LinearLayout container) {
        triggerHandler = new Handler(Looper.getMainLooper());

        // 1. Mechanism explanation card
        addMechanismCard(container);

        // 2. Current status card
        addStatusCard(container);

        // 3. Trigger button
        addTriggerSection(container);

        // 4. Advantage explanation
        addAdvantageCard(container);

        // 5. How it works
        addHowItWorksCard(container);

        // 6. Load real city alert status from backend
        loadCityAlertStatus();
    }

    private void addMechanismCard(LinearLayout container) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_safe_status);
        int pad = dp(20);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(16);
        card.setLayoutParams(lp);

        TextView tvTitle = new TextView(this);
        tvTitle.setText(R.string.city_alert_mechanism_title);
        tvTitle.setTextColor(Color.WHITE);
        tvTitle.setTextSize(18);
        tvTitle.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
        tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
        card.addView(tvTitle);

        TextView tvDesc = new TextView(this);
        tvDesc.setText(R.string.city_alert_mechanism_desc);
        tvDesc.setTextColor(getColor(R.color.slate_300));
        tvDesc.setTextSize(13);
        tvDesc.setTextAlignment(View.TEXT_ALIGNMENT_CENTER);
        LinearLayout.LayoutParams descLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        descLp.topMargin = dp(8);
        tvDesc.setLayoutParams(descLp);
        card.addView(tvDesc);

        container.addView(card);
    }

    private void addStatusCard(LinearLayout container) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(16);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(16);
        card.setLayoutParams(lp);

        // Title row
        LinearLayout titleRow = new LinearLayout(this);
        titleRow.setOrientation(LinearLayout.HORIZONTAL);
        titleRow.setGravity(Gravity.CENTER_VERTICAL);

        View dot = new View(this);
        dot.setBackgroundColor(getColor(R.color.green_400));
        LinearLayout.LayoutParams dotLp = new LinearLayout.LayoutParams(dp(10), dp(10));
        dotLp.rightMargin = dp(8);
        dot.setLayoutParams(dotLp);
        titleRow.addView(dot);

        TextView tvLabel = new TextView(this);
        tvLabel.setText(R.string.city_alert_nearby_status);
        tvLabel.setTextColor(Color.WHITE);
        tvLabel.setTextSize(15);
        tvLabel.setTypeface(null, android.graphics.Typeface.BOLD);
        titleRow.addView(tvLabel);

        card.addView(titleRow);

        // Status text
        tvStatus = new TextView(this);
        tvStatus.setText(R.string.city_alert_no_active);
        tvStatus.setTextColor(getColor(R.color.slate_400));
        tvStatus.setTextSize(13);
        LinearLayout.LayoutParams statusLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        statusLp.topMargin = dp(8);
        tvStatus.setLayoutParams(statusLp);
        card.addView(tvStatus);

        // Threshold info
        TextView tvThreshold = new TextView(this);
        tvThreshold.setText(String.format(getString(R.string.city_alert_threshold_info),
                TRIGGER_THRESHOLD_MIN, TRIGGER_THRESHOLD_MAX));
        tvThreshold.setTextColor(getColor(R.color.slate_500));
        tvThreshold.setTextSize(12);
        LinearLayout.LayoutParams threshLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        threshLp.topMargin = dp(4);
        tvThreshold.setLayoutParams(threshLp);
        card.addView(tvThreshold);

        // Progress bar (showing 0/5)
        pbThreshold = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        pbThreshold.setMax(TRIGGER_THRESHOLD_MAX);
        pbThreshold.setProgress(0);
        LinearLayout.LayoutParams pbLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(6));
        pbLp.topMargin = dp(10);
        pbThreshold.setLayoutParams(pbLp);
        card.addView(pbThreshold);

        // Progress label
        tvProgressLabel = new TextView(this);
        tvProgressLabel.setText(String.format(getString(R.string.city_alert_nearby_count), 0));
        tvProgressLabel.setTextColor(getColor(R.color.slate_400));
        tvProgressLabel.setTextSize(11);
        tvProgressLabel.setGravity(Gravity.END);
        LinearLayout.LayoutParams progLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        progLp.topMargin = dp(4);
        tvProgressLabel.setLayoutParams(progLp);
        card.addView(tvProgressLabel);

        container.addView(card);
    }

    private void addTriggerSection(LinearLayout container) {
        LinearLayout section = new LinearLayout(this);
        section.setOrientation(LinearLayout.VERTICAL);
        section.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(20);
        section.setPadding(pad, pad, pad, pad);
        section.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(16);
        section.setLayoutParams(lp);

        // Instruction text
        TextView tvInstruction = new TextView(this);
        tvInstruction.setText(R.string.city_alert_trigger_instruction);
        tvInstruction.setTextColor(getColor(R.color.slate_300));
        tvInstruction.setTextSize(14);
        tvInstruction.setGravity(Gravity.CENTER);
        section.addView(tvInstruction);

        // Large trigger button
        btnTrigger = new TextView(this);
        btnTrigger.setText(R.string.city_alert_long_press);
        btnTrigger.setTextColor(Color.WHITE);
        btnTrigger.setTextSize(18);
        btnTrigger.setTypeface(null, android.graphics.Typeface.BOLD);
        btnTrigger.setGravity(Gravity.CENTER);
        btnTrigger.setBackgroundResource(R.drawable.bg_trigger_button);
        int btnPad = dp(24);
        btnTrigger.setPadding(btnPad, btnPad, btnPad, btnPad);
        LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        btnLp.topMargin = dp(16);
        btnTrigger.setLayoutParams(btnLp);
        section.addView(btnTrigger);

        // Progress bar
        pbProgress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        pbProgress.setMax(100);
        pbProgress.setProgress(0);
        pbProgress.setVisibility(View.GONE);
        LinearLayout.LayoutParams pbLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(6));
        pbLp.topMargin = dp(8);
        pbProgress.setLayoutParams(pbLp);
        section.addView(pbProgress);

        // Hint text
        TextView tvHint = new TextView(this);
        tvHint.setText(R.string.city_alert_trigger_hint);
        tvHint.setTextColor(getColor(R.color.slate_500));
        tvHint.setTextSize(12);
        tvHint.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams hintLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        hintLp.topMargin = dp(12);
        tvHint.setLayoutParams(hintLp);
        section.addView(tvHint);

        // Setup long-press touch listener
        setupTriggerButton();

        container.addView(section);
    }

    private void setupTriggerButton() {
        triggerCompleteRunnable = () -> {
            isTriggering = false;
            btnTrigger.setText(R.string.city_alert_triggered_success);
            pbProgress.setVisibility(View.GONE);

            // Submit trigger to backend
            SessionManager sm = new SessionManager(CityAlertActivity.this);
            try {
                JSONObject trigger = new JSONObject();
                trigger.put("user_id", sm.getUserId());
                trigger.put("city", "Kyiv");
                trigger.put("country", "Ukraine");
                trigger.put("trigger_rank", 1);
                // alert_id is nullable; try to link to existing city_alert if one exists
                DataRepository.getCityAlerts(null, new DataRepository.DataCallback<JSONArray>() {
                    @Override
                    public void onData(JSONArray alerts) {
                        try {
                            if (alerts.length() > 0) {
                                trigger.put("alert_id", alerts.optJSONObject(0).optString("id"));
                            }
                            DataRepository.submitCityAlertTrigger(trigger, new DataRepository.DataCallback<JSONObject>() {
                                @Override
                                public void onData(JSONObject r) { loadCityAlertStatus(); }
                                @Override
                                public void onError(String e) {
                                    android.util.Log.w("CityAlert", "Trigger submit failed: " + e);
                                }
                            });
                        } catch (Exception ignored) {}
                    }
                    @Override
                    public void onError(String e) {
                        // Even if getCityAlerts fails, still submit trigger without alert_id
                        try {
                            DataRepository.submitCityAlertTrigger(trigger, new DataRepository.DataCallback<JSONObject>() {
                                @Override
                                public void onData(JSONObject r) { loadCityAlertStatus(); }
                                @Override
                                public void onError(String e2) {
                                    android.util.Log.w("CityAlert", "Trigger submit failed: " + e2);
                                }
                            });
                        } catch (Exception ignored) {}
                    }
                });
            } catch (Exception ignored) {}

            tvStatus.setText(String.format(getString(R.string.city_alert_nearby_count), 1));
            Toast.makeText(this, getString(R.string.city_alert_triggered_success), Toast.LENGTH_LONG).show();

            // Reset button after 3 seconds
            triggerHandler.postDelayed(() -> {
                btnTrigger.setText(R.string.city_alert_long_press);
            }, 3000);
        };

        btnTrigger.setOnTouchListener((v, event) -> {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    startTrigger();
                    return true;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    cancelTrigger();
                    return true;
            }
            return false;
        });
    }

    private void startTrigger() {
        isTriggering = true;
        btnTrigger.setText(R.string.city_alert_triggering);
        pbProgress.setVisibility(View.VISIBLE);
        pbProgress.setProgress(0);

        progressAnimator = ValueAnimator.ofInt(0, 100);
        progressAnimator.setDuration(TRIGGER_DURATION);
        progressAnimator.addUpdateListener(animation ->
                pbProgress.setProgress((int) animation.getAnimatedValue()));
        progressAnimator.start();

        triggerHandler.postDelayed(triggerCompleteRunnable, TRIGGER_DURATION);
    }

    private void cancelTrigger() {
        if (isTriggering) {
            isTriggering = false;
            triggerHandler.removeCallbacks(triggerCompleteRunnable);
            if (progressAnimator != null) {
                progressAnimator.cancel();
            }
            pbProgress.setVisibility(View.GONE);
            pbProgress.setProgress(0);
            btnTrigger.setText(R.string.city_alert_long_press);
        }
    }

    private void addAdvantageCard(LinearLayout container) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(16);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(16);
        card.setLayoutParams(lp);

        TextView tvTitle = new TextView(this);
        tvTitle.setText(R.string.city_alert_advantage_title);
        tvTitle.setTextColor(Color.WHITE);
        tvTitle.setTextSize(14);
        tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
        card.addView(tvTitle);

        TextView tvContent = new TextView(this);
        tvContent.setText(R.string.city_alert_advantage);
        tvContent.setTextColor(getColor(R.color.slate_400));
        tvContent.setTextSize(13);
        LinearLayout.LayoutParams contentLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        contentLp.topMargin = dp(6);
        tvContent.setLayoutParams(contentLp);
        card.addView(tvContent);

        container.addView(card);
    }

    private void addHowItWorksCard(LinearLayout container) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(16);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(16);
        card.setLayoutParams(lp);

        TextView tvTitle = new TextView(this);
        tvTitle.setText(R.string.city_alert_how_it_works);
        tvTitle.setTextColor(Color.WHITE);
        tvTitle.setTextSize(14);
        tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
        card.addView(tvTitle);

        // Step 1
        addStepItem(card, "1", getString(R.string.city_alert_step1));
        // Step 2
        addStepItem(card, "2", getString(R.string.city_alert_step2));
        // Step 3
        addStepItem(card, "3", getString(R.string.city_alert_step3));
        // Step 4
        addStepItem(card, "4", getString(R.string.city_alert_step4));

        container.addView(card);
    }

    private void addStepItem(LinearLayout parent, String number, String text) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.TOP);
        LinearLayout.LayoutParams rowLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        rowLp.topMargin = dp(10);
        row.setLayoutParams(rowLp);

        // Number badge
        TextView tvNum = new TextView(this);
        tvNum.setText(number);
        tvNum.setTextColor(Color.WHITE);
        tvNum.setTextSize(11);
        tvNum.setGravity(Gravity.CENTER);
        tvNum.setBackgroundColor(getColor(R.color.orange_500));
        int numPad = dp(2);
        tvNum.setPadding(numPad, numPad, numPad, numPad);
        LinearLayout.LayoutParams numLp = new LinearLayout.LayoutParams(dp(22), dp(22));
        numLp.rightMargin = dp(10);
        tvNum.setLayoutParams(numLp);
        row.addView(tvNum);

        // Step text
        TextView tvStep = new TextView(this);
        tvStep.setText(text);
        tvStep.setTextColor(getColor(R.color.slate_300));
        tvStep.setTextSize(13);
        LinearLayout.LayoutParams stepLp = new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        tvStep.setLayoutParams(stepLp);
        row.addView(tvStep);

        parent.addView(row);
    }

    private void loadCityAlertStatus() {
        DataRepository.getCityAlerts(null, new DataRepository.DataCallback<JSONArray>() {
            @Override
            public void onData(JSONArray alerts) {
                if (alerts.length() > 0) {
                    JSONObject latest = alerts.optJSONObject(0);
                    int userCount = latest.optInt("user_count", 0);
                    boolean confirmed = latest.optBoolean("is_confirmed", false);
                    if (confirmed) {
                        tvStatus.setText(R.string.city_alert_triggered_success);
                    } else if (userCount > 0) {
                        tvStatus.setText(String.format(getString(R.string.city_alert_nearby_count), userCount));
                    } else {
                        tvStatus.setText(R.string.city_alert_no_active);
                    }
                    if (pbThreshold != null) pbThreshold.setProgress(userCount);
                    if (tvProgressLabel != null) tvProgressLabel.setText(String.format(getString(R.string.city_alert_nearby_count), userCount));
                }
            }
            @Override
            public void onError(String error) {}
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        cancelTrigger();
    }
}
