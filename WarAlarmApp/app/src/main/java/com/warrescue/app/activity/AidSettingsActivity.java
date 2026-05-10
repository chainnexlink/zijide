package com.warrescue.app.activity;

import android.graphics.Typeface;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import com.warrescue.app.R;
import com.warrescue.app.data.DataRepository;
import com.warrescue.app.util.SessionManager;

import org.json.JSONObject;

/**
 * L2: 互助设置 - 管理互助偏好设置（范围、自动响应、通知等）
 */
public class AidSettingsActivity extends BaseDetailActivity {

    private SeekBar rangeSeekBar;
    private TextView rangeLabel;
    private Switch autoRespondSwitch;
    private Switch soundSwitch;
    private Switch vibrateSwitch;
    private Switch showLocationSwitch;
    private double currentRange = 1.0;

    @Override
    protected String getPageTitle() { return getString(R.string.aid_settings_detail); }

    @Override
    protected void buildContent(LinearLayout container) {
        SessionManager sm = new SessionManager(this);
        String userId = sm.getUserId();

        // Range setting
        addSectionTitle(container, getString(R.string.receive_range));

        LinearLayout rangeCard = new LinearLayout(this);
        rangeCard.setOrientation(LinearLayout.VERTICAL);
        rangeCard.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(16);
        rangeCard.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams rcLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        rcLp.bottomMargin = dp(16);
        rangeCard.setLayoutParams(rcLp);

        rangeLabel = new TextView(this);
        rangeLabel.setText(String.format(getString(R.string.aid_range_setting), currentRange));
        rangeLabel.setTextColor(getColor(R.color.white));
        rangeLabel.setTextSize(16);
        rangeLabel.setTypeface(null, Typeface.BOLD);
        rangeCard.addView(rangeLabel);

        TextView rangeHint = new TextView(this);
        rangeHint.setText("调整接收附近求助的范围 (0.5km - 5km)");
        rangeHint.setTextColor(getColor(R.color.slate_400));
        rangeHint.setTextSize(12);
        LinearLayout.LayoutParams hLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        hLp.topMargin = dp(4);
        hLp.bottomMargin = dp(12);
        rangeHint.setLayoutParams(hLp);
        rangeCard.addView(rangeHint);

        rangeSeekBar = new SeekBar(this);
        rangeSeekBar.setMax(9); // 0.5 to 5.0, step 0.5 → 9 steps
        rangeSeekBar.setProgress(1); // default 1.0km
        rangeSeekBar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            @Override
            public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                currentRange = 0.5 + progress * 0.5;
                rangeLabel.setText(String.format(getString(R.string.aid_range_setting), currentRange));
            }
            @Override
            public void onStartTrackingTouch(SeekBar seekBar) {}
            @Override
            public void onStopTrackingTouch(SeekBar seekBar) {}
        });
        rangeCard.addView(rangeSeekBar);

        container.addView(rangeCard);

        // Toggle settings
        addSectionTitle(container, "通知设置");

        autoRespondSwitch = addToggleSetting(container, getString(R.string.aid_auto_respond_setting),
                "收到附近SOS后自动显示位置给求助者");
        soundSwitch = addToggleSetting(container, getString(R.string.aid_sound_setting),
                "收到附近求助时播放提示音");
        vibrateSwitch = addToggleSetting(container, getString(R.string.aid_vibrate_setting),
                "收到附近求助时振动提醒");
        showLocationSwitch = addToggleSetting(container, getString(R.string.aid_show_location_setting),
                "向附近互助者展示您的大致位置");

        // Defaults
        soundSwitch.setChecked(true);
        vibrateSwitch.setChecked(true);
        showLocationSwitch.setChecked(true);

        // Save button
        LinearLayout.LayoutParams saveLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        saveLp.topMargin = dp(24);

        TextView saveBtn = new TextView(this);
        saveBtn.setText(getString(R.string.save));
        saveBtn.setTextColor(getColor(R.color.white));
        saveBtn.setTextSize(16);
        saveBtn.setTypeface(null, Typeface.BOLD);
        saveBtn.setGravity(Gravity.CENTER);
        saveBtn.setBackgroundResource(R.drawable.bg_icon_blue);
        saveBtn.setLayoutParams(saveLp);
        saveBtn.setOnClickListener(v -> saveSettings(userId));
        container.addView(saveBtn);

        // Load existing settings
        if (userId != null && !userId.isEmpty()) {
            DataRepository.getMutualAidSettings(userId, new DataRepository.DataCallback<JSONObject>() {
                @Override
                public void onData(JSONObject data) {
                    if (data.length() > 0) {
                        currentRange = data.optDouble("receive_range_km", 1.0);
                        rangeSeekBar.setProgress((int) ((currentRange - 0.5) / 0.5));
                        rangeLabel.setText(String.format(getString(R.string.aid_range_setting), currentRange));
                        autoRespondSwitch.setChecked(data.optBoolean("auto_respond", false));
                        soundSwitch.setChecked(data.optBoolean("notification_sound", true));
                        vibrateSwitch.setChecked(data.optBoolean("notification_vibrate", true));
                        showLocationSwitch.setChecked(data.optBoolean("show_location", true));
                    }
                }
                @Override
                public void onError(String error) {}
            });
        }
    }

    private Switch addToggleSetting(LinearLayout container, String title, String desc) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setBackgroundResource(R.drawable.bg_card);
        card.setGravity(Gravity.CENTER_VERTICAL);
        int pad = dp(16);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(8);
        card.setLayoutParams(lp);

        LinearLayout textCol = new LinearLayout(this);
        textCol.setOrientation(LinearLayout.VERTICAL);
        textCol.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        TextView tvTitle = new TextView(this);
        tvTitle.setText(title);
        tvTitle.setTextColor(getColor(R.color.white));
        tvTitle.setTextSize(14);
        textCol.addView(tvTitle);

        if (desc != null) {
            TextView tvDesc = new TextView(this);
            tvDesc.setText(desc);
            tvDesc.setTextColor(getColor(R.color.slate_400));
            tvDesc.setTextSize(12);
            textCol.addView(tvDesc);
        }

        card.addView(textCol);

        Switch sw = new Switch(this);
        card.addView(sw);

        container.addView(card);
        return sw;
    }

    private void saveSettings(String userId) {
        if (userId == null || userId.isEmpty()) {
            Toast.makeText(this, "请先登录", Toast.LENGTH_SHORT).show();
            return;
        }
        try {
            JSONObject settings = new JSONObject();
            settings.put("user_id", userId);
            settings.put("receive_range_km", currentRange);
            settings.put("auto_respond", autoRespondSwitch.isChecked());
            settings.put("notification_sound", soundSwitch.isChecked());
            settings.put("notification_vibrate", vibrateSwitch.isChecked());
            settings.put("show_location", showLocationSwitch.isChecked());

            DataRepository.saveMutualAidSettings(settings, new DataRepository.DataCallback<JSONObject>() {
                @Override
                public void onData(JSONObject data) {
                    Toast.makeText(AidSettingsActivity.this, getString(R.string.aid_settings_saved), Toast.LENGTH_SHORT).show();
                }
                @Override
                public void onError(String error) {
                    Toast.makeText(AidSettingsActivity.this, "保存失败: " + error, Toast.LENGTH_SHORT).show();
                }
            });
        } catch (Exception e) {
            Toast.makeText(this, "保存失败", Toast.LENGTH_SHORT).show();
        }
    }
}
