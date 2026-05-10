package com.warrescue.app.activity;

import android.graphics.Color;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.warrescue.app.R;

/**
 * Level 3: Family member detail page.
 * Shows member location, status, and communication options.
 */
public class FamilyMemberDetailActivity extends BaseDetailActivity {

    @Override
    protected String getPageTitle() {
        return getString(R.string.family_member_detail);
    }

    @Override
    protected void buildContent(LinearLayout container) {
        String name = getIntent().getStringExtra("member_name");
        boolean isOnline = getIntent().getBooleanExtra("member_online", false);
        String role = getIntent().getStringExtra("member_role");
        String lastSeen = getIntent().getStringExtra("member_last_seen");

        if (name == null) name = "---";
        if (role == null) role = "member";

        // Profile card
        LinearLayout profileCard = new LinearLayout(this);
        profileCard.setOrientation(LinearLayout.VERTICAL);
        profileCard.setBackgroundResource(R.drawable.bg_card);
        profileCard.setGravity(Gravity.CENTER);
        int pad = dp(24);
        profileCard.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        cardLp.bottomMargin = dp(16);
        profileCard.setLayoutParams(cardLp);

        // Avatar circle
        TextView avatar = new TextView(this);
        avatar.setText(name.substring(0, 1));
        avatar.setTextColor(Color.WHITE);
        avatar.setTextSize(32);
        avatar.setGravity(Gravity.CENTER);
        avatar.setBackgroundColor(0xFFF97316);
        LinearLayout.LayoutParams avatarLp = new LinearLayout.LayoutParams(dp(72), dp(72));
        avatar.setLayoutParams(avatarLp);
        profileCard.addView(avatar);

        TextView tvName = new TextView(this);
        tvName.setText(name);
        tvName.setTextColor(Color.WHITE);
        tvName.setTextSize(22);
        LinearLayout.LayoutParams nameLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        nameLp.topMargin = dp(12);
        tvName.setLayoutParams(nameLp);
        profileCard.addView(tvName);

        // Status + role
        String statusText = isOnline ? getString(R.string.online) : getString(R.string.offline);
        String roleText = "admin".equals(role) ? " · " + getString(R.string.admin) : " · " + getString(R.string.member);
        TextView tvStatus = new TextView(this);
        tvStatus.setText(statusText + roleText);
        tvStatus.setTextColor(isOnline ? getColor(R.color.green_400) : getColor(R.color.slate_400));
        tvStatus.setTextSize(14);
        LinearLayout.LayoutParams statusLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        statusLp.topMargin = dp(4);
        tvStatus.setLayoutParams(statusLp);
        profileCard.addView(tvStatus);

        if (!isOnline && lastSeen != null) {
            TextView tvLastSeen = new TextView(this);
            tvLastSeen.setText(String.format(getString(R.string.last_seen), lastSeen));
            tvLastSeen.setTextColor(getColor(R.color.slate_400));
            tvLastSeen.setTextSize(12);
            LinearLayout.LayoutParams lsLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lsLp.topMargin = dp(4);
            tvLastSeen.setLayoutParams(lsLp);
            profileCard.addView(tvLastSeen);
        }

        container.addView(profileCard);

        // Location info
        addSectionTitle(container, getString(R.string.member_location));
        addSettingCard(container, isOnline ? "50.4501, 30.5234" : getString(R.string.offline),
                isOnline ? getString(R.string.current_location) + " · GPS" : String.format(getString(R.string.last_seen), lastSeen != null ? lastSeen : ""),
                isOnline ? R.drawable.bg_icon_green : R.drawable.bg_icon_red);

        // Action buttons
        addSectionTitle(container, "");

        LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        btnLp.topMargin = dp(8);

        Button btnMessage = new Button(this);
        btnMessage.setText(R.string.send_message);
        btnMessage.setTextColor(Color.WHITE);
        btnMessage.setBackgroundResource(R.drawable.bg_button_primary);
        btnMessage.setAllCaps(false);
        btnMessage.setLayoutParams(btnLp);
        btnMessage.setOnClickListener(v -> Toast.makeText(this, getString(R.string.send_message), Toast.LENGTH_SHORT).show());
        container.addView(btnMessage);

        LinearLayout.LayoutParams btn2Lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        btn2Lp.topMargin = dp(10);

        Button btnTrack = new Button(this);
        btnTrack.setText(R.string.view_track);
        btnTrack.setTextColor(Color.WHITE);
        btnTrack.setBackgroundColor(0xFF3B82F6);
        btnTrack.setAllCaps(false);
        btnTrack.setLayoutParams(btn2Lp);
        btnTrack.setOnClickListener(v -> Toast.makeText(this, getString(R.string.view_track), Toast.LENGTH_SHORT).show());
        container.addView(btnTrack);

        Button btnNavigate = new Button(this);
        btnNavigate.setText(R.string.navigate_to);
        btnNavigate.setTextColor(Color.WHITE);
        btnNavigate.setBackgroundColor(0xFF10B981);
        btnNavigate.setAllCaps(false);
        LinearLayout.LayoutParams btn3Lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        btn3Lp.topMargin = dp(10);
        btnNavigate.setLayoutParams(btn3Lp);
        btnNavigate.setOnClickListener(v -> startActivity(new android.content.Intent(this, RoutePlanActivity.class)));
        container.addView(btnNavigate);
    }
}
