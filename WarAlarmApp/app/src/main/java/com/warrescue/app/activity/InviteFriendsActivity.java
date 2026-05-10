package com.warrescue.app.activity;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.warrescue.app.R;
import com.warrescue.app.util.SessionManager;

public class InviteFriendsActivity extends BaseDetailActivity {

    private SessionManager sessionManager;

    @Override
    protected String getPageTitle() {
        return getString(R.string.invite_friends);
    }

    @Override
    protected void buildContent(LinearLayout container) {
        sessionManager = new SessionManager(this);
        String inviteCode = sessionManager.getInviteCode();

        // Invite code card
        LinearLayout codeCard = new LinearLayout(this);
        codeCard.setOrientation(LinearLayout.VERTICAL);
        codeCard.setBackgroundResource(R.drawable.bg_alert_orange);
        codeCard.setGravity(Gravity.CENTER);
        int pad = dp(24);
        codeCard.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams codeLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        codeLp.bottomMargin = dp(16);
        codeCard.setLayoutParams(codeLp);

        TextView tvLabel = new TextView(this);
        tvLabel.setText(getString(R.string.invite_code_label));
        tvLabel.setTextColor(getColor(R.color.slate_300));
        tvLabel.setTextSize(14);
        tvLabel.setGravity(Gravity.CENTER);
        codeCard.addView(tvLabel);

        TextView tvCode = new TextView(this);
        tvCode.setText(inviteCode);
        tvCode.setTextColor(getColor(R.color.white));
        tvCode.setTextSize(28);
        tvCode.setTypeface(null, Typeface.BOLD);
        tvCode.setGravity(Gravity.CENTER);
        tvCode.setLetterSpacing(0.15f);
        LinearLayout.LayoutParams cLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        cLp.topMargin = dp(8);
        tvCode.setLayoutParams(cLp);
        codeCard.addView(tvCode);

        // Discount status
        if (sessionManager.hasInviteDiscount()) {
            TextView tvDiscount = new TextView(this);
            tvDiscount.setText(getString(R.string.sub_invite_discount_active));
            tvDiscount.setTextColor(getColor(R.color.green_400));
            tvDiscount.setTextSize(13);
            tvDiscount.setGravity(Gravity.CENTER);
            LinearLayout.LayoutParams dLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            dLp.topMargin = dp(8);
            tvDiscount.setLayoutParams(dLp);
            codeCard.addView(tvDiscount);
        }

        container.addView(codeCard);

        // Copy button
        Button btnCopy = new Button(this);
        btnCopy.setText(getString(R.string.copy_code));
        btnCopy.setTextColor(getColor(R.color.white));
        btnCopy.setBackgroundResource(R.drawable.bg_button_primary);
        btnCopy.setAllCaps(false);
        btnCopy.setTextSize(15);
        LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        btnCopy.setLayoutParams(btnLp);
        btnCopy.setOnClickListener(v -> {
            ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            ClipData clip = ClipData.newPlainText("invite_code", inviteCode);
            clipboard.setPrimaryClip(clip);
            Toast.makeText(this, getString(R.string.invite_code_copied), Toast.LENGTH_SHORT).show();
        });
        container.addView(btnCopy);

        // Share button
        Button btnShare = new Button(this);
        btnShare.setText(getString(R.string.share_invite));
        btnShare.setTextColor(getColor(R.color.blue_400));
        btnShare.setBackgroundResource(R.drawable.bg_button_secondary);
        btnShare.setAllCaps(false);
        btnShare.setTextSize(15);
        LinearLayout.LayoutParams shareLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        shareLp.topMargin = dp(10);
        btnShare.setLayoutParams(shareLp);
        btnShare.setOnClickListener(v -> {
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("text/plain");
            shareIntent.putExtra(Intent.EXTRA_TEXT,
                    String.format(getString(R.string.invite_share_text), inviteCode));
            startActivity(Intent.createChooser(shareIntent, getString(R.string.invite_share_chooser)));
        });
        container.addView(btnShare);

        // Reward rules
        addSectionTitle(container, getString(R.string.invite_reward));
        addSettingCard(container, getString(R.string.invite_reward_rule_title),
                getString(R.string.invite_reward_rule_desc), R.drawable.bg_icon_green);

        // Stats
        addSectionTitle(container, getString(R.string.invite_stats));
        int count = sessionManager.getInviteCount();
        addSettingCard(container,
                getString(R.string.invite_total_invited, count),
                getString(R.string.invite_discount_months, count),
                R.drawable.bg_icon_blue);
    }
}
