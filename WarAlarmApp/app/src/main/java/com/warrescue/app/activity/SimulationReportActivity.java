package com.warrescue.app.activity;

import android.graphics.Color;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import com.warrescue.app.R;

/**
 * Level 4: Simulation drill report page.
 * Shows detailed score, response time, and step completion after a simulation.
 */
public class SimulationReportActivity extends BaseDetailActivity {

    @Override
    protected String getPageTitle() {
        return getString(R.string.sim_report);
    }

    @Override
    protected void buildContent(LinearLayout container) {
        String type = getIntent().getStringExtra("type");
        String title = getIntent().getStringExtra("title");
        int totalSteps = getIntent().getIntExtra("steps", 7);

        if (title == null) title = getString(R.string.simulation_drill);

        // Score card
        LinearLayout scoreCard = new LinearLayout(this);
        scoreCard.setOrientation(LinearLayout.VERTICAL);
        scoreCard.setBackgroundResource(R.drawable.bg_safe_status);
        scoreCard.setGravity(Gravity.CENTER);
        int pad = dp(24);
        scoreCard.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams scoreLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        scoreLp.bottomMargin = dp(16);
        scoreCard.setLayoutParams(scoreLp);

        TextView tvScoreLabel = new TextView(this);
        tvScoreLabel.setText(getString(R.string.sim_score));
        tvScoreLabel.setTextColor(getColor(R.color.slate_400));
        tvScoreLabel.setTextSize(14);
        scoreCard.addView(tvScoreLabel);

        TextView tvScore = new TextView(this);
        tvScore.setText("96");
        tvScore.setTextColor(getColor(R.color.green_400));
        tvScore.setTextSize(48);
        tvScore.setTypeface(null, android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams sLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        sLp.topMargin = dp(8);
        tvScore.setLayoutParams(sLp);
        scoreCard.addView(tvScore);

        TextView tvGrade = new TextView(this);
        tvGrade.setText("A+");
        tvGrade.setTextColor(getColor(R.color.green_400));
        tvGrade.setTextSize(20);
        tvGrade.setTypeface(null, android.graphics.Typeface.BOLD);
        scoreCard.addView(tvGrade);

        container.addView(scoreCard);

        // Stats row
        LinearLayout statsRow = new LinearLayout(this);
        statsRow.setOrientation(LinearLayout.HORIZONTAL);
        statsRow.setBackgroundResource(R.drawable.bg_card);
        int sPad = dp(16);
        statsRow.setPadding(sPad, sPad, sPad, sPad);
        LinearLayout.LayoutParams statsLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        statsLp.bottomMargin = dp(16);
        statsRow.setLayoutParams(statsLp);

        addStatColumn(statsRow, "12s", getString(R.string.sim_response_time), getColor(R.color.blue_400));
        addStatColumn(statsRow, totalSteps + "/" + totalSteps, getString(R.string.sim_steps_completed), getColor(R.color.green_400));
        addStatColumn(statsRow, "100%", getString(R.string.sim_completion_rate), 0xFFF97316);

        container.addView(statsRow);

        // Scenario info
        addSectionTitle(container, getString(R.string.sim_scenario_info));
        addInfoRow(container, getString(R.string.type), title);
        addInfoRow(container, getString(R.string.sim_steps_completed), totalSteps + " " + getString(R.string.sim_steps_unit));
        addInfoRow(container, getString(R.string.sim_response_time), "12s (" + getString(R.string.sim_excellent) + ")");
        addInfoRow(container, getString(R.string.sim_family_notified), "4 " + getString(R.string.family_members));

        // Score breakdown
        addSectionTitle(container, getString(R.string.sim_score_breakdown));
        addScoreBar(container, getString(R.string.sim_detect_speed), 98);
        addScoreBar(container, getString(R.string.sim_alert_accuracy), 95);
        addScoreBar(container, getString(R.string.sim_notification_speed), 97);
        addScoreBar(container, getString(R.string.sim_route_planning), 94);
        addScoreBar(container, getString(R.string.sim_family_coordination), 96);

        // Suggestions
        addSectionTitle(container, getString(R.string.sim_suggestions));
        addSuggestionCard(container, getString(R.string.sim_suggestion_1));
        addSuggestionCard(container, getString(R.string.sim_suggestion_2));
        addSuggestionCard(container, getString(R.string.sim_suggestion_3));

        // Buttons
        LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        btnLp.topMargin = dp(16);

        Button btnRetry = new Button(this);
        btnRetry.setText(getString(R.string.sim_retry));
        btnRetry.setTextColor(Color.WHITE);
        btnRetry.setBackgroundResource(R.drawable.bg_button_primary);
        btnRetry.setAllCaps(false);
        btnRetry.setLayoutParams(btnLp);
        btnRetry.setOnClickListener(v -> {
            finish();
        });
        container.addView(btnRetry);

        LinearLayout.LayoutParams btn2Lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        btn2Lp.topMargin = dp(10);

        Button btnHome = new Button(this);
        btnHome.setText(getString(R.string.sim_back_home));
        btnHome.setTextColor(Color.WHITE);
        btnHome.setBackgroundColor(0xFF3B82F6);
        btnHome.setAllCaps(false);
        btnHome.setLayoutParams(btn2Lp);
        btnHome.setOnClickListener(v -> {
            // finish both SimulationReportActivity and SimulationRunActivity
            finish();
        });
        container.addView(btnHome);
    }

    private void addStatColumn(LinearLayout parent, String value, String label, int color) {
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        col.setLayoutParams(lp);

        TextView tvValue = new TextView(this);
        tvValue.setText(value);
        tvValue.setTextColor(color);
        tvValue.setTextSize(20);
        tvValue.setTypeface(null, android.graphics.Typeface.BOLD);
        tvValue.setGravity(Gravity.CENTER);
        col.addView(tvValue);

        TextView tvLabel = new TextView(this);
        tvLabel.setText(label);
        tvLabel.setTextColor(getColor(R.color.slate_400));
        tvLabel.setTextSize(11);
        tvLabel.setGravity(Gravity.CENTER);
        col.addView(tvLabel);

        parent.addView(col);
    }

    private void addInfoRow(LinearLayout container, String label, String value) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(14);
        row.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(6);
        row.setLayoutParams(lp);

        TextView tvLabel = new TextView(this);
        tvLabel.setText(label);
        tvLabel.setTextColor(getColor(R.color.slate_400));
        tvLabel.setTextSize(14);
        LinearLayout.LayoutParams lblLp = new LinearLayout.LayoutParams(dp(110), LinearLayout.LayoutParams.WRAP_CONTENT);
        tvLabel.setLayoutParams(lblLp);
        row.addView(tvLabel);

        TextView tvValue = new TextView(this);
        tvValue.setText(value);
        tvValue.setTextColor(Color.WHITE);
        tvValue.setTextSize(14);
        row.addView(tvValue);

        container.addView(row);
    }

    private void addScoreBar(LinearLayout container, String label, int score) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.VERTICAL);
        row.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(12);
        row.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(6);
        row.setLayoutParams(lp);

        LinearLayout headerRow = new LinearLayout(this);
        headerRow.setOrientation(LinearLayout.HORIZONTAL);

        TextView tvLabel = new TextView(this);
        tvLabel.setText(label);
        tvLabel.setTextColor(Color.WHITE);
        tvLabel.setTextSize(13);
        LinearLayout.LayoutParams lblLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        tvLabel.setLayoutParams(lblLp);
        headerRow.addView(tvLabel);

        TextView tvScore = new TextView(this);
        tvScore.setText(score + "/100");
        tvScore.setTextColor(getColor(R.color.green_400));
        tvScore.setTextSize(13);
        headerRow.addView(tvScore);

        row.addView(headerRow);

        ProgressBar pb = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        pb.setMax(100);
        pb.setProgress(score);
        int barColor = score >= 90 ? getColor(R.color.green_400) :
                       score >= 70 ? getColor(R.color.amber_500) : getColor(R.color.red_500);
        pb.setProgressTintList(android.content.res.ColorStateList.valueOf(barColor));
        pb.setProgressBackgroundTintList(android.content.res.ColorStateList.valueOf(getColor(R.color.slate_700)));
        LinearLayout.LayoutParams pbLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(6));
        pbLp.topMargin = dp(8);
        pb.setLayoutParams(pbLp);
        row.addView(pb);

        container.addView(row);
    }

    private void addSuggestionCard(LinearLayout container, String text) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setBackgroundResource(R.drawable.bg_card);
        card.setGravity(Gravity.CENTER_VERTICAL);
        int pad = dp(12);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(6);
        card.setLayoutParams(lp);

        TextView dot = new TextView(this);
        dot.setText("\u2022");
        dot.setTextColor(0xFF3B82F6);
        dot.setTextSize(16);
        LinearLayout.LayoutParams dotLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        dotLp.rightMargin = dp(10);
        dot.setLayoutParams(dotLp);
        card.addView(dot);

        TextView tvText = new TextView(this);
        tvText.setText(text);
        tvText.setTextColor(getColor(R.color.slate_300));
        tvText.setTextSize(13);
        card.addView(tvText);

        container.addView(card);
    }
}
