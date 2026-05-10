package com.warrescue.app.activity;

import android.graphics.Color;
import android.graphics.Typeface;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import com.warrescue.app.R;
import com.warrescue.app.network.DeepSeekService;

/**
 * Level 3: AI Monitor History page.
 * Shows historical AI detection events with timeline.
 * Integrates DeepSeek AI for real-time threat analysis.
 */
public class AIMonitorHistoryActivity extends BaseDetailActivity {

    private DeepSeekService deepSeekService;
    private LinearLayout aiResultContainer;
    private ProgressBar aiProgress;
    private Button btnRunScan;

    @Override
    protected String getPageTitle() {
        return getString(R.string.ai_monitor_history);
    }

    @Override
    protected void buildContent(LinearLayout container) {
        deepSeekService = new DeepSeekService();

        // Stats card
        LinearLayout statsCard = new LinearLayout(this);
        statsCard.setOrientation(LinearLayout.HORIZONTAL);
        statsCard.setBackgroundResource(R.drawable.bg_safe_status);
        int pad = dp(16);
        statsCard.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams statsLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        statsLp.bottomMargin = dp(16);
        statsCard.setLayoutParams(statsLp);

        addStatColumn(statsCard, "24h", "47", getColor(R.color.green_400));
        addStatColumn(statsCard, "7d", "312", 0xFF3B82F6);
        addStatColumn(statsCard, "30d", "1,284", 0xFFF97316);

        container.addView(statsCard);

        // AI Real-time Analysis Section
        addSectionTitle(container, "DeepSeek AI " + getString(R.string.ai_monitor));

        // AI scan button
        btnRunScan = new Button(this);
        btnRunScan.setText(getString(R.string.sim_step_ai_scan) + " - DeepSeek");
        btnRunScan.setTextColor(Color.WHITE);
        btnRunScan.setTextSize(14);
        btnRunScan.setAllCaps(false);
        btnRunScan.setBackgroundResource(R.drawable.bg_safe_status);
        LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        btnLp.bottomMargin = dp(8);
        btnRunScan.setLayoutParams(btnLp);
        btnRunScan.setOnClickListener(v -> runAIScan());
        container.addView(btnRunScan);

        // Progress indicator (hidden initially)
        aiProgress = new ProgressBar(this);
        aiProgress.setVisibility(android.view.View.GONE);
        LinearLayout.LayoutParams progLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        progLp.gravity = Gravity.CENTER;
        progLp.bottomMargin = dp(8);
        aiProgress.setLayoutParams(progLp);
        container.addView(aiProgress);

        // AI result container (hidden initially)
        aiResultContainer = new LinearLayout(this);
        aiResultContainer.setOrientation(LinearLayout.VERTICAL);
        aiResultContainer.setVisibility(android.view.View.GONE);
        container.addView(aiResultContainer);

        addSectionTitle(container, getString(R.string.ai_monitor_history));

        // History items
        addHistoryItem(container, "08:32", getString(R.string.air_strike), getString(R.string.severity_red), "red",
                getString(R.string.sim_step_air_threat_desc), true);
        addHistoryItem(container, "07:15", getString(R.string.artillery), getString(R.string.severity_orange), "orange",
                getString(R.string.sim_step_art_threat_desc), false);
        addHistoryItem(container, "06:40", getString(R.string.chemical), getString(R.string.severity_orange), "orange",
                getString(R.string.sim_step_chem_threat_desc), false);
        addHistoryItem(container, "05:20", getString(R.string.curfew), getString(R.string.severity_yellow), "yellow",
                getString(R.string.sim_step_curfew_verify_desc), false);
        addHistoryItem(container, "03:45", getString(R.string.conflict), getString(R.string.severity_orange), "orange",
                getString(R.string.sim_step_art_alert_desc), false);
        addHistoryItem(container, "01:10", getString(R.string.air_strike), getString(R.string.severity_red), "red",
                getString(R.string.sim_step_air_alert_desc), true);
    }

    private void runAIScan() {
        if (!deepSeekService.isConfigured()) {
            Toast.makeText(this, "DeepSeek API not configured", Toast.LENGTH_SHORT).show();
            return;
        }

        btnRunScan.setEnabled(false);
        btnRunScan.setText(getString(R.string.loading));
        aiProgress.setVisibility(android.view.View.VISIBLE);
        aiResultContainer.setVisibility(android.view.View.GONE);
        aiResultContainer.removeAllViews();

        // Simulate sensor data for AI analysis
        String sensorData = "Radar: NE direction anomalous signal detected, bearing 045°\n"
                + "Acoustic: Low-frequency vibrations at 2.3Hz, consistent with heavy vehicles\n"
                + "ADS-B: 3 unidentified aircraft, altitude 8000m, speed 600km/h\n"
                + "Seismic: Magnitude 1.2 tremors detected 12km east\n"
                + "Air Quality: PM2.5 normal, NO2 slightly elevated";

        deepSeekService.analyzeThreat(sensorData, "Kyiv, Ukraine (50.4501, 30.5234)",
                new DeepSeekService.ThreatCallback() {
                    @Override
                    public void onResult(DeepSeekService.ThreatAnalysis analysis) {
                        btnRunScan.setEnabled(true);
                        btnRunScan.setText(getString(R.string.sim_step_ai_scan) + " - DeepSeek");
                        aiProgress.setVisibility(android.view.View.GONE);
                        showAIResult(analysis);
                    }

                    @Override
                    public void onError(String error) {
                        btnRunScan.setEnabled(true);
                        btnRunScan.setText(getString(R.string.sim_step_ai_scan) + " - DeepSeek");
                        aiProgress.setVisibility(android.view.View.GONE);
                        Toast.makeText(AIMonitorHistoryActivity.this,
                                "AI Error: " + error, Toast.LENGTH_LONG).show();
                    }
                });
    }

    private void showAIResult(DeepSeekService.ThreatAnalysis analysis) {
        aiResultContainer.setVisibility(android.view.View.VISIBLE);
        aiResultContainer.removeAllViews();

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(16);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        cardLp.bottomMargin = dp(12);
        card.setLayoutParams(cardLp);

        // Title row with level indicator
        LinearLayout titleRow = new LinearLayout(this);
        titleRow.setOrientation(LinearLayout.HORIZONTAL);
        titleRow.setGravity(Gravity.CENTER_VERTICAL);

        TextView tvTitle = new TextView(this);
        tvTitle.setText("DeepSeek AI " + getString(R.string.sim_step_threat_analysis));
        tvTitle.setTextColor(Color.WHITE);
        tvTitle.setTextSize(16);
        tvTitle.setTypeface(null, Typeface.BOLD);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        tvTitle.setLayoutParams(titleLp);
        titleRow.addView(tvTitle);

        // Level badge
        TextView tvLevel = new TextView(this);
        tvLevel.setText(analysis.level.toUpperCase());
        int levelColor;
        switch (analysis.level) {
            case "red": levelColor = getColor(R.color.red_500); break;
            case "orange": levelColor = 0xFFF97316; break;
            case "yellow": levelColor = 0xFFEAB308; break;
            default: levelColor = getColor(R.color.green_400); break;
        }
        tvLevel.setTextColor(levelColor);
        tvLevel.setTextSize(13);
        tvLevel.setTypeface(null, Typeface.BOLD);
        titleRow.addView(tvLevel);
        card.addView(titleRow);

        // Type
        addResultRow(card, getString(R.string.type), analysis.type);
        // Description
        addResultRow(card, getString(R.string.sim_step_threat_analysis), analysis.description);
        // Confidence
        addResultRow(card, getString(R.string.reliability), analysis.confidence + "%");
        // Suggestion
        addResultRow(card, getString(R.string.sim_suggestions), analysis.suggestion);

        aiResultContainer.addView(card);
    }

    private void addResultRow(LinearLayout parent, String label, String value) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams rowLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        rowLp.topMargin = dp(8);
        row.setLayoutParams(rowLp);

        TextView tvLabel = new TextView(this);
        tvLabel.setText(label);
        tvLabel.setTextColor(getColor(R.color.slate_400));
        tvLabel.setTextSize(13);
        LinearLayout.LayoutParams labelLp = new LinearLayout.LayoutParams(dp(80), LinearLayout.LayoutParams.WRAP_CONTENT);
        tvLabel.setLayoutParams(labelLp);
        row.addView(tvLabel);

        TextView tvValue = new TextView(this);
        tvValue.setText(value);
        tvValue.setTextColor(Color.WHITE);
        tvValue.setTextSize(13);
        LinearLayout.LayoutParams valueLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        tvValue.setLayoutParams(valueLp);
        row.addView(tvValue);

        parent.addView(row);
    }

    private void addStatColumn(LinearLayout parent, String label, String value, int color) {
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        col.setLayoutParams(lp);

        TextView tvValue = new TextView(this);
        tvValue.setText(value);
        tvValue.setTextColor(color);
        tvValue.setTextSize(22);
        tvValue.setGravity(Gravity.CENTER);
        col.addView(tvValue);

        TextView tvLabel = new TextView(this);
        tvLabel.setText(label);
        tvLabel.setTextColor(getColor(R.color.slate_400));
        tvLabel.setTextSize(12);
        tvLabel.setGravity(Gravity.CENTER);
        col.addView(tvLabel);

        parent.addView(col);
    }

    private void addHistoryItem(LinearLayout container, String time, String type, String level,
                                 String severity, String desc, boolean isActive) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(14);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(8);
        card.setLayoutParams(lp);

        // Header row
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        TextView tvTime = new TextView(this);
        tvTime.setText(time);
        tvTime.setTextColor(getColor(R.color.slate_400));
        tvTime.setTextSize(12);
        LinearLayout.LayoutParams timeLp = new LinearLayout.LayoutParams(dp(50), LinearLayout.LayoutParams.WRAP_CONTENT);
        tvTime.setLayoutParams(timeLp);
        header.addView(tvTime);

        TextView tvType = new TextView(this);
        tvType.setText(type);
        tvType.setTextColor(Color.WHITE);
        tvType.setTextSize(15);
        LinearLayout.LayoutParams typeLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        tvType.setLayoutParams(typeLp);
        header.addView(tvType);

        TextView tvLevel = new TextView(this);
        tvLevel.setText(level);
        int levelColor;
        switch (severity) {
            case "red": levelColor = getColor(R.color.red_500); break;
            case "orange": levelColor = 0xFFF97316; break;
            default: levelColor = 0xFFEAB308; break;
        }
        tvLevel.setTextColor(levelColor);
        tvLevel.setTextSize(12);
        header.addView(tvLevel);

        card.addView(header);

        // Description
        TextView tvDesc = new TextView(this);
        tvDesc.setText(desc);
        tvDesc.setTextColor(getColor(R.color.slate_400));
        tvDesc.setTextSize(12);
        LinearLayout.LayoutParams descLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        descLp.topMargin = dp(6);
        tvDesc.setLayoutParams(descLp);
        card.addView(tvDesc);

        if (isActive) {
            TextView tvActive = new TextView(this);
            tvActive.setText(getString(R.string.active));
            tvActive.setTextColor(getColor(R.color.green_400));
            tvActive.setTextSize(11);
            LinearLayout.LayoutParams activeLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            activeLp.topMargin = dp(6);
            tvActive.setLayoutParams(activeLp);
            card.addView(tvActive);
        }

        container.addView(card);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (deepSeekService != null) {
            deepSeekService.shutdown();
        }
    }
}
