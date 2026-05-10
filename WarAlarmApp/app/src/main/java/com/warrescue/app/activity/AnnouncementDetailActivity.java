package com.warrescue.app.activity;

import android.graphics.Color;
import android.graphics.Typeface;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.content.ContextCompat;

import com.warrescue.app.R;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Level 3 page: Announcement detail view.
 * Shows full announcement content with type badge and timestamp.
 */
public class AnnouncementDetailActivity extends BaseDetailActivity {

    private String annTitle;
    private String annContent;
    private String annType;
    private String annCreatedAt;

    @Override
    protected String getPageTitle() {
        return getString(R.string.announcement_detail);
    }

    @Override
    protected void buildContent(LinearLayout container) {
        // Get data from intent
        annTitle = getIntent().getStringExtra("ann_title");
        annContent = getIntent().getStringExtra("ann_content");
        annType = getIntent().getStringExtra("ann_type");
        annCreatedAt = getIntent().getStringExtra("ann_created_at");

        if (annTitle == null) annTitle = "";
        if (annContent == null) annContent = "";
        if (annType == null) annType = "info";
        if (annCreatedAt == null) annCreatedAt = "";

        // 1. Header card with type badge and title
        addHeaderCard(container);

        // 2. Content card
        addContentCard(container);

        // 3. Meta info card
        addMetaCard(container);
    }

    private void addHeaderCard(LinearLayout container) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(20);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(12);
        card.setLayoutParams(lp);

        // Type badge row
        LinearLayout badgeRow = new LinearLayout(this);
        badgeRow.setOrientation(LinearLayout.HORIZONTAL);
        badgeRow.setGravity(Gravity.CENTER_VERTICAL);

        // Type indicator dot
        View dot = new View(this);
        int dotSize = dp(10);
        LinearLayout.LayoutParams dotLp = new LinearLayout.LayoutParams(dotSize, dotSize);
        dotLp.setMarginEnd(dp(8));
        dot.setLayoutParams(dotLp);

        // Type badge text
        TextView tvBadge = new TextView(this);
        tvBadge.setTextSize(12);
        tvBadge.setGravity(Gravity.CENTER);
        int bPadH = dp(10);
        int bPadV = dp(4);
        tvBadge.setPadding(bPadH, bPadV, bPadH, bPadV);

        switch (annType) {
            case "reward":
                dot.setBackgroundColor(ContextCompat.getColor(this, R.color.amber_400));
                tvBadge.setText(R.string.announcement_reward);
                tvBadge.setBackgroundColor(ContextCompat.getColor(this, R.color.amber_400));
                tvBadge.setTextColor(Color.BLACK);
                break;
            case "subscription":
                dot.setBackgroundColor(ContextCompat.getColor(this, R.color.blue_400));
                tvBadge.setText(R.string.announcement_subscription);
                tvBadge.setBackgroundColor(ContextCompat.getColor(this, R.color.blue_400));
                tvBadge.setTextColor(Color.WHITE);
                break;
            default:
                dot.setBackgroundColor(ContextCompat.getColor(this, R.color.slate_500));
                tvBadge.setText(R.string.announcement_system);
                tvBadge.setBackgroundColor(ContextCompat.getColor(this, R.color.slate_500));
                tvBadge.setTextColor(Color.WHITE);
                break;
        }

        badgeRow.addView(dot);
        badgeRow.addView(tvBadge);
        card.addView(badgeRow);

        // Title
        TextView tvTitle = new TextView(this);
        tvTitle.setText(annTitle);
        tvTitle.setTextColor(Color.WHITE);
        tvTitle.setTextSize(20);
        tvTitle.setTypeface(null, Typeface.BOLD);
        tvTitle.setLineSpacing(dp(4), 1f);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        titleLp.topMargin = dp(14);
        tvTitle.setLayoutParams(titleLp);
        card.addView(tvTitle);

        // Time
        if (!annCreatedAt.isEmpty()) {
            TextView tvTime = new TextView(this);
            tvTime.setText(formatDisplayTime(annCreatedAt));
            tvTime.setTextColor(ContextCompat.getColor(this, R.color.slate_500));
            tvTime.setTextSize(12);
            LinearLayout.LayoutParams timeLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            timeLp.topMargin = dp(8);
            tvTime.setLayoutParams(timeLp);
            card.addView(tvTime);
        }

        container.addView(card);
    }

    private void addContentCard(LinearLayout container) {
        if (annContent.isEmpty()) return;

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(20);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(12);
        card.setLayoutParams(lp);

        // Section title
        TextView tvLabel = new TextView(this);
        tvLabel.setText(R.string.announcement_content_label);
        tvLabel.setTextColor(ContextCompat.getColor(this, R.color.slate_400));
        tvLabel.setTextSize(12);
        tvLabel.setTypeface(null, Typeface.BOLD);
        card.addView(tvLabel);

        // Divider
        View divider = new View(this);
        divider.setBackgroundColor(ContextCompat.getColor(this, R.color.slate_700));
        LinearLayout.LayoutParams divLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(1));
        divLp.topMargin = dp(8);
        divLp.bottomMargin = dp(12);
        divider.setLayoutParams(divLp);
        card.addView(divider);

        // Full content
        TextView tvContent = new TextView(this);
        tvContent.setText(annContent);
        tvContent.setTextColor(ContextCompat.getColor(this, R.color.slate_300));
        tvContent.setTextSize(15);
        tvContent.setLineSpacing(dp(6), 1f);
        card.addView(tvContent);

        container.addView(card);
    }

    private void addMetaCard(LinearLayout container) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(16);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(12);
        card.setLayoutParams(lp);

        // Type row
        addMetaRow(card, getString(R.string.announcement_type_label), getTypeDisplayName());

        // Published time row
        if (!annCreatedAt.isEmpty()) {
            addMetaRow(card, getString(R.string.announcement_published_at), formatDisplayTime(annCreatedAt));
        }

        // Source row
        addMetaRow(card, getString(R.string.announcement_source), "WarRescue " + getString(R.string.announcement_official));

        container.addView(card);
    }

    private void addMetaRow(LinearLayout parent, String label, String value) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams rowLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        rowLp.bottomMargin = dp(8);
        row.setLayoutParams(rowLp);

        TextView tvLabel = new TextView(this);
        tvLabel.setText(label);
        tvLabel.setTextColor(ContextCompat.getColor(this, R.color.slate_500));
        tvLabel.setTextSize(13);
        LinearLayout.LayoutParams labelLp = new LinearLayout.LayoutParams(
                dp(80), LinearLayout.LayoutParams.WRAP_CONTENT);
        tvLabel.setLayoutParams(labelLp);
        row.addView(tvLabel);

        TextView tvValue = new TextView(this);
        tvValue.setText(value);
        tvValue.setTextColor(ContextCompat.getColor(this, R.color.slate_300));
        tvValue.setTextSize(13);
        LinearLayout.LayoutParams valueLp = new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        tvValue.setLayoutParams(valueLp);
        row.addView(tvValue);

        parent.addView(row);
    }

    private String getTypeDisplayName() {
        switch (annType) {
            case "reward": return getString(R.string.announcement_reward);
            case "subscription": return getString(R.string.announcement_subscription);
            default: return getString(R.string.announcement_system);
        }
    }

    private String formatDisplayTime(String isoTime) {
        try {
            SimpleDateFormat sdfIn = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());
            Date date = sdfIn.parse(isoTime);
            if (date != null) {
                SimpleDateFormat sdfOut = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());
                return sdfOut.format(date);
            }
        } catch (ParseException e) {
            // ignore
        }
        return isoTime;
    }
}
