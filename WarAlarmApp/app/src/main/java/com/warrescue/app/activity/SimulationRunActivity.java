package com.warrescue.app.activity;

import android.content.Context;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.Gravity;
import android.view.View;
import android.view.animation.AlphaAnimation;
import android.view.animation.Animation;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.warrescue.app.R;
import com.warrescue.app.data.DataRepository;
import com.warrescue.app.network.SupabaseClient;
import com.warrescue.app.util.LocaleHelper;
import com.warrescue.app.util.SessionManager;

import org.json.JSONObject;

public class SimulationRunActivity extends AppCompatActivity {

    private String scenarioType;
    private String scenarioTitle;

    private LinearLayout stepsContainer;
    private TextView tvStatus;
    private TextView tvAlertBanner;
    private ProgressBar progressBar;
    private TextView tvProgress;
    private ScrollView scrollView;

    private Handler handler = new Handler(Looper.getMainLooper());
    private int currentStep = 0;
    private String[][] steps;
    private String currentTrialId;

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(LocaleHelper.onAttach(newBase));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        scenarioType = getIntent().getStringExtra("type");
        scenarioTitle = getIntent().getStringExtra("title");
        if (scenarioType == null) scenarioType = "air_strike";
        if (scenarioTitle == null) scenarioTitle = getString(R.string.air_strike_sim);

        buildSteps();
        buildUI();
        startSimulation();
    }

    private void buildSteps() {
        if ("air_strike".equals(scenarioType)) {
            steps = new String[][]{
                    {getString(R.string.sim_step_ai_scan), getString(R.string.sim_step_air_scan_desc), "2"},
                    {getString(R.string.sim_step_threat_analysis), getString(R.string.sim_step_air_threat_desc), "2"},
                    {getString(R.string.sim_step_gen_red_alert), getString(R.string.sim_step_air_alert_desc), "1"},
                    {getString(R.string.sim_step_push_notify), getString(R.string.sim_step_push_desc), "1"},
                    {getString(R.string.sim_step_notify_family), getString(R.string.sim_step_family_desc), "2"},
                    {getString(R.string.sim_step_plan_route), getString(R.string.sim_step_route_desc), "2"},
                    {getString(R.string.sim_step_monitoring), getString(R.string.sim_step_monitor_desc), "1"}
            };
        } else if ("artillery".equals(scenarioType)) {
            steps = new String[][]{
                    {getString(R.string.sim_step_ai_scan), getString(R.string.sim_step_art_scan_desc), "2"},
                    {getString(R.string.sim_step_threat_analysis), getString(R.string.sim_step_art_threat_desc), "2"},
                    {getString(R.string.sim_step_gen_orange_alert), getString(R.string.sim_step_art_alert_desc), "1"},
                    {getString(R.string.sim_step_push_notify), getString(R.string.sim_step_push_sms_desc), "1"},
                    {getString(R.string.sim_step_notify_family), getString(R.string.sim_step_family_loc_desc), "2"},
                    {getString(R.string.sim_step_nav_shelter), getString(R.string.sim_step_shelter_desc), "2"},
                    {getString(R.string.sim_step_monitoring), getString(R.string.sim_step_art_monitor_desc), "1"}
            };
        } else if ("chemical".equals(scenarioType)) {
            steps = new String[][]{
                    {getString(R.string.sim_step_ai_scan), getString(R.string.sim_step_chem_scan_desc), "2"},
                    {getString(R.string.sim_step_threat_analysis), getString(R.string.sim_step_chem_threat_desc), "2"},
                    {getString(R.string.sim_step_gen_orange_alert), getString(R.string.sim_step_chem_alert_desc), "1"},
                    {getString(R.string.sim_step_push_notify), getString(R.string.sim_step_chem_push_desc), "1"},
                    {getString(R.string.sim_step_notify_family), getString(R.string.sim_step_chem_family_desc), "2"},
                    {getString(R.string.sim_step_mark_safe_zone), getString(R.string.sim_step_chem_zone_desc), "2"},
                    {getString(R.string.sim_step_monitoring), getString(R.string.sim_step_chem_monitor_desc), "1"}
            };
        } else {
            steps = new String[][]{
                    {getString(R.string.sim_step_info_collect), getString(R.string.sim_step_curfew_scan_desc), "2"},
                    {getString(R.string.sim_step_verify), getString(R.string.sim_step_curfew_verify_desc), "2"},
                    {getString(R.string.sim_step_gen_yellow_notice), getString(R.string.sim_step_curfew_notice_desc), "1"},
                    {getString(R.string.sim_step_push_notify), getString(R.string.sim_step_curfew_push_desc), "1"},
                    {getString(R.string.sim_step_notify_family), getString(R.string.sim_step_curfew_family_desc), "2"},
                    {getString(R.string.sim_step_set_reminder), getString(R.string.sim_step_curfew_reminder_desc), "1"},
                    {getString(R.string.sim_step_keep_update), getString(R.string.sim_step_curfew_update_desc), "1"}
            };
        }
    }

    private void buildUI() {
        scrollView = new ScrollView(this);
        scrollView.setBackgroundColor(getColor(R.color.slate_950));
        scrollView.setFillViewport(true);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = dp(20);
        root.setPadding(pad, dp(48), pad, pad);

        // Back + Title
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        TextView btnBack = new TextView(this);
        btnBack.setText("\u21A9");
        btnBack.setTextSize(22);
        btnBack.setTextColor(getColor(R.color.slate_400));
        btnBack.setPadding(0, 0, dp(12), 0);
        btnBack.setOnClickListener(v -> finish());
        header.addView(btnBack);

        TextView tvTitle = new TextView(this);
        tvTitle.setText(scenarioTitle);
        tvTitle.setTextSize(20);
        tvTitle.setTextColor(getColor(R.color.white));
        tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
        header.addView(tvTitle);
        root.addView(header);

        // Alert Banner (hidden initially)
        tvAlertBanner = new TextView(this);
        tvAlertBanner.setTextSize(16);
        tvAlertBanner.setTextColor(getColor(R.color.white));
        tvAlertBanner.setTypeface(null, android.graphics.Typeface.BOLD);
        tvAlertBanner.setGravity(Gravity.CENTER);
        tvAlertBanner.setBackgroundResource(R.drawable.bg_alert_red);
        int bannerPad = dp(14);
        tvAlertBanner.setPadding(bannerPad, bannerPad, bannerPad, bannerPad);
        LinearLayout.LayoutParams bannerLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        bannerLp.topMargin = dp(16);
        tvAlertBanner.setLayoutParams(bannerLp);
        tvAlertBanner.setVisibility(View.GONE);
        root.addView(tvAlertBanner);

        // Status
        tvStatus = new TextView(this);
        tvStatus.setText(getString(R.string.sim_starting));
        tvStatus.setTextColor(getColor(R.color.amber_500));
        tvStatus.setTextSize(14);
        LinearLayout.LayoutParams statusLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        statusLp.topMargin = dp(16);
        tvStatus.setLayoutParams(statusLp);
        root.addView(tvStatus);

        // Progress
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(steps.length);
        progressBar.setProgress(0);
        progressBar.setProgressTintList(android.content.res.ColorStateList.valueOf(getColor(R.color.red_500)));
        progressBar.setProgressBackgroundTintList(android.content.res.ColorStateList.valueOf(getColor(R.color.slate_700)));
        LinearLayout.LayoutParams progLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(6));
        progLp.topMargin = dp(12);
        progressBar.setLayoutParams(progLp);
        root.addView(progressBar);

        tvProgress = new TextView(this);
        tvProgress.setText("0 / " + steps.length);
        tvProgress.setTextColor(getColor(R.color.slate_500));
        tvProgress.setTextSize(12);
        tvProgress.setGravity(Gravity.END);
        LinearLayout.LayoutParams progTextLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        progTextLp.topMargin = dp(4);
        tvProgress.setLayoutParams(progTextLp);
        root.addView(tvProgress);

        // Steps container
        stepsContainer = new LinearLayout(this);
        stepsContainer.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams stepsLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        stepsLp.topMargin = dp(20);
        stepsContainer.setLayoutParams(stepsLp);
        root.addView(stepsContainer);

        scrollView.addView(root);
        setContentView(scrollView);
    }

    private void startSimulation() {
        currentStep = 0;

        // Create simulation trial record in backend
        if (SupabaseClient.getInstance().isConfigured()) {
            try {
                SessionManager sm = new SessionManager(this);
                JSONObject trial = new JSONObject();
                trial.put("user_id", sm.getUserId());
                trial.put("is_active", true);
                trial.put("alert_count", steps.length);
                trial.put("started_at", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(new java.util.Date()));
                DataRepository.createSimulationTrial(trial, new DataRepository.DataCallback<JSONObject>() {
                    @Override
                    public void onData(JSONObject data) {
                        try {
                            currentTrialId = data.getString("id");
                        } catch (Exception ignored) {}
                    }
                    @Override
                    public void onError(String error) { }
                });
            } catch (Exception ignored) {}
        }

        handler.postDelayed(this::advanceStep, 1500);
    }

    private void advanceStep() {
        if (currentStep >= steps.length) {
            onSimulationComplete();
            return;
        }

        String title = steps[currentStep][0];
        String desc = steps[currentStep][1];
        int delaySec = Integer.parseInt(steps[currentStep][2]);

        tvStatus.setText(getString(R.string.sim_step_progress, currentStep + 1, steps.length, title));

        if (currentStep == 2) {
            showAlertBanner(desc);
            triggerAlertEffect();
        }

        addStepCard(currentStep + 1, title, desc);

        currentStep++;
        progressBar.setProgress(currentStep);
        tvProgress.setText(currentStep + " / " + steps.length);

        handler.post(() -> scrollView.fullScroll(View.FOCUS_DOWN));
        handler.postDelayed(this::advanceStep, delaySec * 1000L);
    }

    private void addStepCard(int stepNum, String title, String desc) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(14);
        card.setPadding(pad, pad, pad, pad);
        card.setGravity(Gravity.TOP);
        LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        cardLp.bottomMargin = dp(8);
        card.setLayoutParams(cardLp);

        TextView tvNum = new TextView(this);
        tvNum.setText(String.valueOf(stepNum));
        tvNum.setTextColor(getColor(R.color.white));
        tvNum.setTextSize(13);
        tvNum.setTypeface(null, android.graphics.Typeface.BOLD);
        tvNum.setGravity(Gravity.CENTER);
        int circleSize = dp(28);
        LinearLayout.LayoutParams numLp = new LinearLayout.LayoutParams(circleSize, circleSize);
        numLp.rightMargin = dp(12);
        tvNum.setLayoutParams(numLp);

        int bgRes;
        if (stepNum <= 2) bgRes = R.drawable.bg_icon_blue;
        else if (stepNum == 3) bgRes = R.drawable.bg_icon_red;
        else if (stepNum <= 5) bgRes = R.drawable.bg_icon_amber;
        else bgRes = R.drawable.bg_icon_green;
        tvNum.setBackgroundResource(bgRes);
        card.addView(tvNum);

        LinearLayout textContainer = new LinearLayout(this);
        textContainer.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams textLp = new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        textContainer.setLayoutParams(textLp);

        TextView tvTitle = new TextView(this);
        tvTitle.setText(title);
        tvTitle.setTextColor(getColor(R.color.white));
        tvTitle.setTextSize(15);
        tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
        textContainer.addView(tvTitle);

        TextView tvDesc = new TextView(this);
        tvDesc.setText(desc);
        tvDesc.setTextColor(getColor(R.color.slate_300));
        tvDesc.setTextSize(13);
        LinearLayout.LayoutParams descLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        descLp.topMargin = dp(4);
        tvDesc.setLayoutParams(descLp);
        textContainer.addView(tvDesc);

        TextView tvCheck = new TextView(this);
        tvCheck.setText("\u2713");
        tvCheck.setTextColor(getColor(R.color.green_400));
        tvCheck.setTextSize(16);
        tvCheck.setTypeface(null, android.graphics.Typeface.BOLD);

        card.addView(textContainer);
        card.addView(tvCheck);

        card.setAlpha(0f);
        stepsContainer.addView(card);
        card.animate().alpha(1f).setDuration(400).start();
    }

    private void showAlertBanner(String text) {
        tvAlertBanner.setText(text);
        tvAlertBanner.setVisibility(View.VISIBLE);

        AlphaAnimation flash = new AlphaAnimation(0.3f, 1f);
        flash.setDuration(500);
        flash.setRepeatCount(3);
        flash.setRepeatMode(Animation.REVERSE);
        tvAlertBanner.startAnimation(flash);
    }

    private void triggerAlertEffect() {
        try {
            Vibrator vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            if (vibrator != null) {
                vibrator.vibrate(VibrationEffect.createWaveform(
                        new long[]{0, 200, 100, 200, 100, 400}, -1));
            }
        } catch (Exception ignored) {}

        try {
            ToneGenerator toneGen = new ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80);
            toneGen.startTone(ToneGenerator.TONE_CDMA_EMERGENCY_RINGBACK, 1000);
            handler.postDelayed(toneGen::release, 1500);
        } catch (Exception ignored) {}
    }

    private void onSimulationComplete() {
        tvStatus.setText(getString(R.string.sim_complete));
        tvStatus.setTextColor(getColor(R.color.green_400));

        // Save simulation alert summary to backend
        if (currentTrialId != null && SupabaseClient.getInstance().isConfigured()) {
            try {
                SessionManager sm = new SessionManager(this);
                JSONObject alert = new JSONObject();
                alert.put("trial_id", currentTrialId);
                alert.put("user_id", sm.getUserId());
                alert.put("title", scenarioTitle);
                alert.put("description", getString(R.string.sim_complete) + " - " + steps.length + " steps");
                alert.put("alert_type", scenarioType);
                alert.put("severity", "simulation");
                alert.put("acknowledged", true);
                alert.put("acknowledged_at", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(new java.util.Date()));
                DataRepository.createSimulationAlert(alert, new DataRepository.DataCallback<JSONObject>() {
                    @Override
                    public void onData(JSONObject data) { }
                    @Override
                    public void onError(String error) { }
                });
            } catch (Exception ignored) {}
        }

        LinearLayout doneCard = new LinearLayout(this);
        doneCard.setOrientation(LinearLayout.VERTICAL);
        doneCard.setBackgroundResource(R.drawable.bg_safe_status);
        int pad = dp(16);
        doneCard.setPadding(pad, pad, pad, pad);
        doneCard.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(12);
        doneCard.setLayoutParams(lp);

        TextView tvDone = new TextView(this);
        tvDone.setText(getString(R.string.sim_complete));
        tvDone.setTextColor(getColor(R.color.green_400));
        tvDone.setTextSize(18);
        tvDone.setTypeface(null, android.graphics.Typeface.BOLD);
        tvDone.setGravity(Gravity.CENTER);
        doneCard.addView(tvDone);

        TextView tvSummary = new TextView(this);
        tvSummary.setText(getString(R.string.sim_summary));
        tvSummary.setTextColor(getColor(R.color.slate_300));
        tvSummary.setTextSize(13);
        tvSummary.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams sumLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        sumLp.topMargin = dp(8);
        tvSummary.setLayoutParams(sumLp);
        doneCard.addView(tvSummary);

        // View Report button (Level 4)
        TextView btnReport = new TextView(this);
        btnReport.setText(getString(R.string.sim_report));
        btnReport.setTextColor(getColor(R.color.white));
        btnReport.setBackgroundColor(0xFF3B82F6);
        btnReport.setTextSize(15);
        btnReport.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams rptLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(44));
        rptLp.topMargin = dp(12);
        btnReport.setLayoutParams(rptLp);
        btnReport.setOnClickListener(v -> {
            android.content.Intent intent = new android.content.Intent(this, SimulationReportActivity.class);
            intent.putExtra("type", scenarioType);
            intent.putExtra("title", scenarioTitle);
            intent.putExtra("steps", steps.length);
            startActivity(intent);
        });
        doneCard.addView(btnReport);

        TextView btnFinish = new TextView(this);
        btnFinish.setText(getString(R.string.sim_back_home));
        btnFinish.setTextColor(getColor(R.color.white));
        btnFinish.setBackgroundResource(R.drawable.bg_button_primary);
        btnFinish.setTextSize(15);
        btnFinish.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(44));
        btnLp.topMargin = dp(10);
        btnFinish.setLayoutParams(btnLp);
        btnFinish.setOnClickListener(v -> finish());
        doneCard.addView(btnFinish);

        doneCard.setAlpha(0f);
        stepsContainer.addView(doneCard);
        doneCard.animate().alpha(1f).setDuration(500).start();

        handler.post(() -> scrollView.fullScroll(View.FOCUS_DOWN));

        Toast.makeText(this, getString(R.string.sim_complete), Toast.LENGTH_LONG).show();
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        handler.removeCallbacksAndMessages(null);
    }
}
