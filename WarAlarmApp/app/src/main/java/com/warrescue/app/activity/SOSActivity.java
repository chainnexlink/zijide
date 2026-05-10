package com.warrescue.app.activity;

import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.warrescue.app.R;

public class SOSActivity extends BaseDetailActivity {
    @Override
    protected String getPageTitle() { return getString(R.string.sos_history); }

    @Override
    protected void buildContent(LinearLayout container) {
        // Summary card
        LinearLayout summaryCard = new LinearLayout(this);
        summaryCard.setOrientation(LinearLayout.HORIZONTAL);
        summaryCard.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(16);
        summaryCard.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams sumLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        sumLp.bottomMargin = dp(16);
        summaryCard.setLayoutParams(sumLp);

        addStatColumn(summaryCard, getString(R.string.sos_total), "5", R.color.white);
        addStatColumn(summaryCard, getString(R.string.sos_alert_trigger), "3", R.color.red_500);
        addStatColumn(summaryCard, getString(R.string.sos_manual_trigger), "2", R.color.amber_500);
        addStatColumn(summaryCard, getString(R.string.sos_resolved), "5", R.color.green_400);

        container.addView(summaryCard);

        addSectionTitle(container, getString(R.string.sos_history_records));

        addSosRecord(container, "2026-04-22 14:32", getString(R.string.sos_rec_air_title),
                getString(R.string.sos_rec_air_desc), getString(R.string.sos_rec_air_timeline),
                "red", true);
        addSosRecord(container, "2026-04-20 09:15", getString(R.string.sos_manual_trigger),
                getString(R.string.sos_rec_manual_desc), getString(R.string.sos_rec_manual_timeline_1),
                "amber", true);
        addSosRecord(container, "2026-04-18 22:48", getString(R.string.sos_rec_art_title),
                getString(R.string.sos_rec_art_desc), getString(R.string.sos_rec_art_timeline),
                "red", true);
        addSosRecord(container, "2026-04-15 06:30", getString(R.string.sos_manual_trigger),
                getString(R.string.sos_rec_drill_desc), getString(R.string.sos_rec_drill_timeline),
                "amber", true);
        addSosRecord(container, "2026-04-10 18:20", getString(R.string.sos_rec_chem_title),
                getString(R.string.sos_rec_chem_desc), getString(R.string.sos_rec_chem_timeline),
                "red", true);
    }

    private void addStatColumn(LinearLayout parent, String label, String value, int colorRes) {
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams colLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        col.setLayoutParams(colLp);

        TextView tvVal = new TextView(this);
        tvVal.setText(value);
        tvVal.setTextColor(getColor(colorRes));
        tvVal.setTextSize(22);
        tvVal.setTypeface(null, android.graphics.Typeface.BOLD);
        tvVal.setGravity(Gravity.CENTER);
        col.addView(tvVal);

        TextView tvLabel = new TextView(this);
        tvLabel.setText(label);
        tvLabel.setTextColor(getColor(R.color.slate_400));
        tvLabel.setTextSize(12);
        tvLabel.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lblLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lblLp.topMargin = dp(4);
        tvLabel.setLayoutParams(lblLp);
        col.addView(tvLabel);

        parent.addView(col);
    }

    private void addSosRecord(LinearLayout container, String time, String trigger,
                              String desc, String timeline, String severity, boolean resolved) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(14);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(10);
        card.setLayoutParams(lp);

        // Header row
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        int dotBg = "red".equals(severity) ? R.drawable.bg_icon_red : R.drawable.bg_icon_amber;
        android.view.View dot = new android.view.View(this);
        dot.setBackgroundResource(dotBg);
        LinearLayout.LayoutParams dotLp = new LinearLayout.LayoutParams(dp(10), dp(10));
        dotLp.rightMargin = dp(8);
        dot.setLayoutParams(dotLp);
        header.addView(dot);

        TextView tvTrigger = new TextView(this);
        tvTrigger.setText(trigger);
        tvTrigger.setTextColor(getColor(R.color.white));
        tvTrigger.setTextSize(15);
        tvTrigger.setTypeface(null, android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams trigLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        tvTrigger.setLayoutParams(trigLp);
        header.addView(tvTrigger);

        TextView tvStatus = new TextView(this);
        tvStatus.setText(resolved ? getString(R.string.sos_resolved) : getString(R.string.status_ongoing));
        tvStatus.setTextColor(getColor(resolved ? R.color.green_400 : R.color.red_500));
        tvStatus.setTextSize(13);
        header.addView(tvStatus);
        card.addView(header);

        // Time
        TextView tvTime = new TextView(this);
        tvTime.setText(time);
        tvTime.setTextColor(getColor(R.color.slate_400));
        tvTime.setTextSize(12);
        LinearLayout.LayoutParams timeLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        timeLp.topMargin = dp(4);
        tvTime.setLayoutParams(timeLp);
        card.addView(tvTime);

        // Description
        TextView tvDesc = new TextView(this);
        tvDesc.setText(desc);
        tvDesc.setTextColor(getColor(R.color.slate_300));
        tvDesc.setTextSize(13);
        LinearLayout.LayoutParams descLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        descLp.topMargin = dp(6);
        tvDesc.setLayoutParams(descLp);
        card.addView(tvDesc);

        // Timeline
        TextView tvTimeline = new TextView(this);
        tvTimeline.setText(timeline);
        tvTimeline.setTextColor(getColor(R.color.slate_500));
        tvTimeline.setTextSize(11);
        tvTimeline.setBackgroundResource(R.drawable.bg_chip);
        int chipPad = dp(8);
        tvTimeline.setPadding(chipPad, dp(6), chipPad, dp(6));
        LinearLayout.LayoutParams tlLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        tlLp.topMargin = dp(8);
        tvTimeline.setLayoutParams(tlLp);
        card.addView(tvTimeline);

        container.addView(card);
    }
}
