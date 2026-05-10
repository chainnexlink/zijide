package com.warrescue.app.activity;

import android.widget.LinearLayout;
import android.widget.Switch;

import com.warrescue.app.R;

public class NotificationSettingsActivity extends BaseDetailActivity {
    @Override
    protected String getPageTitle() { return getString(R.string.notifications); }

    @Override
    protected void buildContent(LinearLayout container) {
        addSectionTitle(container, getString(R.string.push_notifications));
        addToggleSetting(container, getString(R.string.notif_alert_push), getString(R.string.notif_alert_push_desc), true);
        addToggleSetting(container, getString(R.string.notif_family_status), getString(R.string.notif_family_status_desc), true);
        addToggleSetting(container, getString(R.string.notif_sos), getString(R.string.notif_sos_desc), true);

        addSectionTitle(container, getString(R.string.sound_vibration));
        addToggleSetting(container, getString(R.string.notif_alert_sound), getString(R.string.notif_alert_sound_desc), true);
        addToggleSetting(container, getString(R.string.notif_vibration), getString(R.string.notif_vibration_desc), true);
        addToggleSetting(container, getString(R.string.notif_dnd), getString(R.string.notif_dnd_desc), false);

        addSectionTitle(container, getString(R.string.sms_notifications));
        addToggleSetting(container, getString(R.string.notif_twilio), getString(R.string.notif_twilio_desc), true);
        addToggleSetting(container, getString(R.string.notif_sms_level), getString(R.string.notif_sms_level_desc), true);
    }

    private void addToggleSetting(LinearLayout container, String title, String desc, boolean defaultOn) {
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

        LinearLayout textContainer = new LinearLayout(this);
        textContainer.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams textLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        textContainer.setLayoutParams(textLp);

        android.widget.TextView tvTitle = new android.widget.TextView(this);
        tvTitle.setText(title);
        tvTitle.setTextColor(getColor(R.color.white));
        tvTitle.setTextSize(15);
        textContainer.addView(tvTitle);

        android.widget.TextView tvDesc = new android.widget.TextView(this);
        tvDesc.setText(desc);
        tvDesc.setTextColor(getColor(R.color.slate_400));
        tvDesc.setTextSize(12);
        textContainer.addView(tvDesc);

        card.addView(textContainer);

        Switch toggle = new Switch(this);
        toggle.setChecked(defaultOn);
        card.addView(toggle);

        container.addView(card);
    }
}
