package com.warrescue.app.activity;

import android.graphics.Color;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.warrescue.app.R;

/**
 * Level 3: City alert detail page with timeline, user list, and response action.
 * Accessible from CityAlertActivity. Can navigate to RoutePlanActivity (Level 4).
 */
public class CityAlertDetailActivity extends BaseDetailActivity {

    private String alertCity, alertType, alertSeverity, alertDesc, alertTime;
    private int alertUsers;

    @Override
    protected String getPageTitle() {
        return getString(R.string.city_alert_detail);
    }

    @Override
    protected void buildContent(LinearLayout container) {
        alertCity = getIntent().getStringExtra("city_alert_city");
        alertType = getIntent().getStringExtra("city_alert_type");
        alertSeverity = getIntent().getStringExtra("city_alert_severity");
        alertDesc = getIntent().getStringExtra("city_alert_desc");
        alertTime = getIntent().getStringExtra("city_alert_time");
        alertUsers = getIntent().getIntExtra("city_alert_users", 0);

        // Status banner
        LinearLayout banner = new LinearLayout(this);
        banner.setOrientation(LinearLayout.VERTICAL);
        banner.setGravity(Gravity.CENTER);
        int bannerColor = alertUsers >= 3 ? getColor(R.color.red_500) : 0xFFEAB308;
        banner.setBackgroundColor(bannerColor);
        int pad = dp(20);
        banner.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams bannerLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        bannerLp.bottomMargin = dp(16);
        banner.setLayoutParams(bannerLp);

        TextView tvBannerStatus = new TextView(this);
        tvBannerStatus.setText(alertUsers >= 3 ? R.string.city_alert_active : R.string.city_alert_pending);
        tvBannerStatus.setTextColor(Color.WHITE);
        tvBannerStatus.setTextSize(20);
        tvBannerStatus.setGravity(Gravity.CENTER);
        banner.addView(tvBannerStatus);

        TextView tvBannerInfo = new TextView(this);
        tvBannerInfo.setText(String.format(getString(R.string.city_alert_trigger), alertUsers));
        tvBannerInfo.setTextColor(0xCCFFFFFF);
        tvBannerInfo.setTextSize(13);
        tvBannerInfo.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams infoLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        infoLp.topMargin = dp(4);
        tvBannerInfo.setLayoutParams(infoLp);
        banner.addView(tvBannerInfo);

        container.addView(banner);

        // Alert info card
        addSectionTitle(container, getString(R.string.city_alert_detail));
        addInfoRow(container, getString(R.string.location), alertCity != null ? alertCity : "");
        addInfoRow(container, getString(R.string.type), getAlertTypeName(alertType));
        addInfoRow(container, getString(R.string.city_alert_users), alertUsers + " " + getString(R.string.city_alert_responded));
        addInfoRow(container, getString(R.string.time), alertTime != null ? alertTime : "");

        // Timeline section
        addSectionTitle(container, getString(R.string.city_alert_timeline));
        addTimelineItem(container, "08:32:15", getString(R.string.city_alert_source_ai), true);
        addTimelineItem(container, "08:32:48", "User_A7x2 " + getString(R.string.city_alert_responded), false);
        addTimelineItem(container, "08:33:12", "User_K9m4 " + getString(R.string.city_alert_responded), false);
        addTimelineItem(container, "08:34:01", "User_R3p8 " + getString(R.string.city_alert_responded), false);
        if (alertUsers >= 3) {
            addTimelineItem(container, "08:34:01", getString(R.string.city_alert_active) + " (" + getString(R.string.trigger_condition) + ")", true);
        }

        // Responding users
        addSectionTitle(container, getString(R.string.city_alert_users));
        addUserCard(container, "User_A7x2", "0.3km", "2" + getString(R.string.minutes_ago));
        addUserCard(container, "User_K9m4", "0.8km", "3" + getString(R.string.minutes_ago));
        addUserCard(container, "User_R3p8", "1.2km", "4" + getString(R.string.minutes_ago));
        if (alertUsers > 3) {
            addUserCard(container, "User_F5n1", "0.5km", "4" + getString(R.string.minutes_ago));
            addUserCard(container, "User_W2j6", "1.5km", "5" + getString(R.string.minutes_ago));
        }

        // Action buttons
        LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        btnLp.topMargin = dp(16);

        Button btnRespond = new Button(this);
        btnRespond.setText(R.string.city_alert_respond);
        btnRespond.setTextColor(Color.WHITE);
        btnRespond.setBackgroundResource(R.drawable.bg_button_primary);
        btnRespond.setAllCaps(false);
        btnRespond.setLayoutParams(btnLp);
        btnRespond.setOnClickListener(v -> {
            btnRespond.setText(R.string.city_alert_responded);
            btnRespond.setEnabled(false);
            Toast.makeText(this, getString(R.string.city_alert_responded), Toast.LENGTH_SHORT).show();
        });
        container.addView(btnRespond);

        // Navigate to shelter
        LinearLayout.LayoutParams navLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        navLp.topMargin = dp(10);

        Button btnNavigate = new Button(this);
        btnNavigate.setText(R.string.start_navigate);
        btnNavigate.setTextColor(Color.WHITE);
        btnNavigate.setBackgroundColor(0xFF3B82F6);
        btnNavigate.setAllCaps(false);
        btnNavigate.setLayoutParams(navLp);
        btnNavigate.setOnClickListener(v -> startActivity(new android.content.Intent(this, RoutePlanActivity.class)));
        container.addView(btnNavigate);
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
        LinearLayout.LayoutParams lblLp = new LinearLayout.LayoutParams(dp(100), LinearLayout.LayoutParams.WRAP_CONTENT);
        tvLabel.setLayoutParams(lblLp);
        row.addView(tvLabel);

        TextView tvValue = new TextView(this);
        tvValue.setText(value);
        tvValue.setTextColor(Color.WHITE);
        tvValue.setTextSize(14);
        row.addView(tvValue);

        container.addView(row);
    }

    private void addTimelineItem(LinearLayout container, String time, String event, boolean isSystem) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        int pad = dp(10);
        row.setPadding(pad, dp(8), pad, dp(8));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        row.setLayoutParams(lp);

        // Timeline dot
        View dot = new View(this);
        dot.setBackgroundColor(isSystem ? 0xFF3B82F6 : 0xFF10B981);
        LinearLayout.LayoutParams dotLp = new LinearLayout.LayoutParams(dp(8), dp(8));
        dotLp.rightMargin = dp(12);
        dot.setLayoutParams(dotLp);
        row.addView(dot);

        TextView tvTime = new TextView(this);
        tvTime.setText(time);
        tvTime.setTextColor(getColor(R.color.slate_400));
        tvTime.setTextSize(12);
        LinearLayout.LayoutParams timeLp = new LinearLayout.LayoutParams(dp(70), LinearLayout.LayoutParams.WRAP_CONTENT);
        tvTime.setLayoutParams(timeLp);
        row.addView(tvTime);

        TextView tvEvent = new TextView(this);
        tvEvent.setText(event);
        tvEvent.setTextColor(Color.WHITE);
        tvEvent.setTextSize(13);
        row.addView(tvEvent);

        container.addView(row);
    }

    private void addUserCard(LinearLayout container, String name, String dist, String time) {
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

        // Green dot
        View dot = new View(this);
        dot.setBackgroundColor(0xFF10B981);
        LinearLayout.LayoutParams dotLp = new LinearLayout.LayoutParams(dp(10), dp(10));
        dotLp.rightMargin = dp(10);
        dot.setLayoutParams(dotLp);
        card.addView(dot);

        TextView tvName = new TextView(this);
        tvName.setText(name);
        tvName.setTextColor(Color.WHITE);
        tvName.setTextSize(14);
        LinearLayout.LayoutParams nameLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        tvName.setLayoutParams(nameLp);
        card.addView(tvName);

        TextView tvDist = new TextView(this);
        tvDist.setText(dist);
        tvDist.setTextColor(getColor(R.color.slate_400));
        tvDist.setTextSize(12);
        LinearLayout.LayoutParams distLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        distLp.rightMargin = dp(12);
        tvDist.setLayoutParams(distLp);
        card.addView(tvDist);

        TextView tvTime = new TextView(this);
        tvTime.setText(time);
        tvTime.setTextColor(getColor(R.color.slate_400));
        tvTime.setTextSize(12);
        card.addView(tvTime);

        container.addView(card);
    }

    private String getAlertTypeName(String type) {
        if (type == null) return getString(R.string.other);
        switch (type) {
            case "air_strike": return getString(R.string.air_strike);
            case "artillery": return getString(R.string.artillery);
            case "chemical": return getString(R.string.chemical);
            case "conflict": return getString(R.string.conflict);
            case "curfew": return getString(R.string.curfew);
            default: return getString(R.string.other);
        }
    }
}
