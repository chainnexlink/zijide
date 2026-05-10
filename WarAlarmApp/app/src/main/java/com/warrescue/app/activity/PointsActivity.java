package com.warrescue.app.activity;

import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.content.ContextCompat;

import com.warrescue.app.R;
import com.warrescue.app.data.DataRepository;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class PointsActivity extends BaseDetailActivity {
    @Override
    protected String getPageTitle() { return getString(R.string.my_points); }

    @Override
    protected void buildContent(LinearLayout container) {
        // Balance card
        LinearLayout balanceCard = new LinearLayout(this);
        balanceCard.setOrientation(LinearLayout.VERTICAL);
        balanceCard.setBackgroundResource(R.drawable.bg_card);
        balanceCard.setGravity(Gravity.CENTER);
        int pad = dp(24);
        balanceCard.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams balLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        balLp.bottomMargin = dp(16);
        balanceCard.setLayoutParams(balLp);

        TextView tvLabel = new TextView(this);
        tvLabel.setText(getString(R.string.points_balance));
        tvLabel.setTextColor(ContextCompat.getColor(this, R.color.slate_400));
        tvLabel.setTextSize(14);
        tvLabel.setGravity(Gravity.CENTER);
        balanceCard.addView(tvLabel);

        TextView tvBalance = new TextView(this);
        tvBalance.setId(android.R.id.text1);
        tvBalance.setText("--");
        tvBalance.setTextColor(ContextCompat.getColor(this, R.color.amber_400));
        tvBalance.setTextSize(36);
        tvBalance.setTypeface(null, android.graphics.Typeface.BOLD);
        tvBalance.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams balTvLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        balTvLp.topMargin = dp(8);
        tvBalance.setLayoutParams(balTvLp);
        balanceCard.addView(tvBalance);

        TextView tvHint = new TextView(this);
        tvHint.setText(getString(R.string.points_desc));
        tvHint.setTextColor(ContextCompat.getColor(this, R.color.slate_400));
        tvHint.setTextSize(12);
        tvHint.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams hintLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        hintLp.topMargin = dp(4);
        tvHint.setLayoutParams(hintLp);
        balanceCard.addView(tvHint);

        container.addView(balanceCard);

        // History section
        addSectionTitle(container, getString(R.string.points_history));

        LinearLayout historyContainer = new LinearLayout(this);
        historyContainer.setOrientation(LinearLayout.VERTICAL);
        container.addView(historyContainer);

        // Load data
        DataRepository.getPoints(this, new DataRepository.DataCallback<JSONObject>() {
            @Override
            public void onData(JSONObject data) {
                tvBalance.setText(String.valueOf(data.optInt("balance", 0)));
            }
            @Override
            public void onError(String error) {
                tvBalance.setText("0");
            }
        });

        DataRepository.getPointTransactions(this, new DataRepository.DataCallback<List<JSONObject>>() {
            @Override
            public void onData(List<JSONObject> transactions) {
                if (transactions.isEmpty()) {
                    TextView tvEmpty = new TextView(PointsActivity.this);
                    tvEmpty.setText(getString(R.string.no_points_records));
                    tvEmpty.setTextColor(ContextCompat.getColor(PointsActivity.this, R.color.slate_400));
                    tvEmpty.setTextSize(14);
                    tvEmpty.setGravity(Gravity.CENTER);
                    LinearLayout.LayoutParams elp = new LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                    elp.topMargin = dp(32);
                    tvEmpty.setLayoutParams(elp);
                    historyContainer.addView(tvEmpty);
                    return;
                }
                for (JSONObject tx : transactions) {
                    renderTransaction(historyContainer, tx);
                }
            }
            @Override
            public void onError(String error) { /* empty */ }
        });
    }

    private void renderTransaction(LinearLayout container, JSONObject tx) {
        int amount = tx.optInt("amount", 0);
        String type = tx.optString("type", "");
        String reason = tx.optString("reason", "");
        String createdAt = tx.optString("created_at", "");

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setBackgroundResource(R.drawable.bg_card);
        card.setGravity(Gravity.CENTER_VERTICAL);
        int p = dp(14);
        card.setPadding(p, p, p, p);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(6);
        card.setLayoutParams(lp);

        LinearLayout textBlock = new LinearLayout(this);
        textBlock.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams tbLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        textBlock.setLayoutParams(tbLp);

        TextView tvType = new TextView(this);
        tvType.setText(getTypeLabel(type));
        tvType.setTextColor(ContextCompat.getColor(this, R.color.white));
        tvType.setTextSize(14);
        textBlock.addView(tvType);

        if (!reason.isEmpty()) {
            TextView tvReason = new TextView(this);
            tvReason.setText(reason);
            tvReason.setTextColor(ContextCompat.getColor(this, R.color.slate_400));
            tvReason.setTextSize(12);
            tvReason.setMaxLines(1);
            tvReason.setEllipsize(android.text.TextUtils.TruncateAt.END);
            textBlock.addView(tvReason);
        }

        if (!createdAt.isEmpty() && createdAt.length() >= 10) {
            TextView tvDate = new TextView(this);
            tvDate.setText(createdAt.substring(0, 10));
            tvDate.setTextColor(ContextCompat.getColor(this, R.color.slate_500));
            tvDate.setTextSize(11);
            textBlock.addView(tvDate);
        }

        card.addView(textBlock);

        TextView tvAmount = new TextView(this);
        tvAmount.setText((amount > 0 ? "+" : "") + amount);
        tvAmount.setTextColor(ContextCompat.getColor(this, amount > 0 ? R.color.green_400 : R.color.red_500));
        tvAmount.setTextSize(16);
        tvAmount.setTypeface(null, android.graphics.Typeface.BOLD);
        card.addView(tvAmount);

        container.addView(card);
    }

    private String getTypeLabel(String type) {
        switch (type) {
            case "earn_rescue": return getString(R.string.points_earn_rescue);
            case "earn_alert": return getString(R.string.points_earn_alert);
            case "earn_referral": return getString(R.string.points_earn_referral);
            case "earn_admin": return getString(R.string.points_earn_admin);
            case "spend_subscription": return getString(R.string.points_spend_subscription);
            default: return type;
        }
    }
}
