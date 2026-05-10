package com.warrescue.app.activity;

import android.content.Intent;
import android.widget.LinearLayout;
import android.widget.Switch;

import com.warrescue.app.R;

public class AlertSettingsActivity extends BaseDetailActivity {
    @Override
    protected String getPageTitle() { return getString(R.string.alert_settings); }

    @Override
    protected void buildContent(LinearLayout container) {
        addSectionTitle(container, getString(R.string.alert_type_settings));
        addToggle(container, getString(R.string.alert_air_strike), true);
        addToggle(container, getString(R.string.alert_artillery), true);
        addToggle(container, getString(R.string.alert_conflict), true);
        addToggle(container, getString(R.string.alert_curfew), true);
        addToggle(container, getString(R.string.alert_chemical), true);

        addSectionTitle(container, getString(R.string.alert_level_settings));
        addToggle(container, getString(R.string.level_red), true);
        addToggle(container, getString(R.string.level_orange), true);
        addToggle(container, getString(R.string.level_yellow), false);

        addSectionTitle(container, getString(R.string.monitor_range));
        addSettingCard(container, String.format(getString(R.string.monitor_radius), 50),
                String.format(getString(R.string.monitor_radius_desc), 50), R.drawable.bg_icon_blue);

        // Navigate to AI Monitor History (Level 3)
        addSectionTitle(container, getString(R.string.ai_monitor_history));
        addSettingCard(container, getString(R.string.ai_monitor_history),
                getString(R.string.ai_monitor_detail), R.drawable.bg_icon_amber)
                .setOnClickListener(v -> startActivity(new Intent(this, AIMonitorHistoryActivity.class)));
    }

    private void addToggle(LinearLayout container, String title, boolean on) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setBackgroundResource(R.drawable.bg_card);
        card.setGravity(android.view.Gravity.CENTER_VERTICAL);
        int pad = dp(16);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(8);
        card.setLayoutParams(lp);

        android.widget.TextView tv = new android.widget.TextView(this);
        tv.setText(title);
        tv.setTextColor(getColor(R.color.white));
        tv.setTextSize(15);
        LinearLayout.LayoutParams tvLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        tv.setLayoutParams(tvLp);
        card.addView(tv);

        Switch toggle = new Switch(this);
        toggle.setChecked(on);
        card.addView(toggle);

        container.addView(card);
    }
}
