package com.warrescue.app.activity;

import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.content.ContextCompat;

import com.warrescue.app.R;
import com.warrescue.app.data.DataRepository;
import com.warrescue.app.model.Announcement;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Level 2 page: Announcement list with type filtering.
 * Shows all announcements, clickable to navigate to detail page.
 */
public class AnnouncementListActivity extends BaseDetailActivity {

    private LinearLayout listContainer;
    private List<Announcement> allAnnouncements = new ArrayList<>();
    private String currentFilter = "all";

    // Filter tab references
    private TextView tabAll, tabReward, tabSubscription, tabSystem;

    @Override
    protected String getPageTitle() {
        return getString(R.string.announcements);
    }

    @Override
    protected void buildContent(LinearLayout container) {
        // 1. Filter tabs
        addFilterTabs(container);

        // 2. List container
        listContainer = new LinearLayout(this);
        listContainer.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(12);
        listContainer.setLayoutParams(lp);
        container.addView(listContainer);

        // 3. Load data
        loadAnnouncements();
    }

    private void addFilterTabs(LinearLayout container) {
        LinearLayout tabRow = new LinearLayout(this);
        tabRow.setOrientation(LinearLayout.HORIZONTAL);
        tabRow.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams rowLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        tabRow.setLayoutParams(rowLp);

        tabAll = createFilterTab(getString(R.string.announcement_all), "all", true);
        tabReward = createFilterTab(getString(R.string.announcement_reward), "reward", false);
        tabSubscription = createFilterTab(getString(R.string.announcement_subscription), "subscription", false);
        tabSystem = createFilterTab(getString(R.string.announcement_system), "system", false);

        tabRow.addView(tabAll);
        tabRow.addView(tabReward);
        tabRow.addView(tabSubscription);
        tabRow.addView(tabSystem);

        container.addView(tabRow);
    }

    private TextView createFilterTab(String text, String filter, boolean active) {
        TextView tab = new TextView(this);
        tab.setText(text);
        tab.setTextSize(13);
        tab.setGravity(Gravity.CENTER);
        int hPad = dp(14);
        int vPad = dp(8);
        tab.setPadding(hPad, vPad, hPad, vPad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        lp.setMarginEnd(dp(6));
        tab.setLayoutParams(lp);

        updateTabStyle(tab, active);

        tab.setOnClickListener(v -> {
            currentFilter = filter;
            updateTabStyle(tabAll, "all".equals(filter));
            updateTabStyle(tabReward, "reward".equals(filter));
            updateTabStyle(tabSubscription, "subscription".equals(filter));
            updateTabStyle(tabSystem, "system".equals(filter));
            renderList();
        });

        return tab;
    }

    private void updateTabStyle(TextView tab, boolean active) {
        if (active) {
            tab.setBackgroundResource(R.drawable.bg_trigger_button);
            tab.setTextColor(Color.WHITE);
            tab.setTypeface(null, Typeface.BOLD);
        } else {
            tab.setBackgroundResource(R.drawable.bg_card);
            tab.setTextColor(ContextCompat.getColor(this, R.color.slate_400));
            tab.setTypeface(null, Typeface.NORMAL);
        }
    }

    private void loadAnnouncements() {
        DataRepository.getAnnouncements(this, new DataRepository.DataCallback<List<Announcement>>() {
            @Override
            public void onData(List<Announcement> announcements) {
                allAnnouncements = announcements;
                renderList();
            }

            @Override
            public void onError(String error) {
                allAnnouncements = new ArrayList<>();
                renderList();
            }
        });
    }

    private void renderList() {
        listContainer.removeAllViews();

        List<Announcement> filtered;
        if ("all".equals(currentFilter)) {
            filtered = allAnnouncements;
        } else {
            filtered = new ArrayList<>();
            for (Announcement ann : allAnnouncements) {
                if (currentFilter.equals(ann.getType())) {
                    filtered.add(ann);
                }
            }
        }

        if (filtered.isEmpty()) {
            TextView tvEmpty = new TextView(this);
            tvEmpty.setText(R.string.no_announcements);
            tvEmpty.setTextColor(ContextCompat.getColor(this, R.color.slate_500));
            tvEmpty.setTextSize(14);
            tvEmpty.setGravity(Gravity.CENTER);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.topMargin = dp(40);
            tvEmpty.setLayoutParams(lp);
            listContainer.addView(tvEmpty);
            return;
        }

        for (Announcement ann : filtered) {
            addAnnouncementCard(ann);
        }
    }

    private void addAnnouncementCard(Announcement ann) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(16);
        card.setPadding(pad, dp(14), pad, dp(14));
        LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        cardLp.bottomMargin = dp(10);
        card.setLayoutParams(cardLp);

        // Row 1: Type badge + Title
        LinearLayout titleRow = new LinearLayout(this);
        titleRow.setOrientation(LinearLayout.HORIZONTAL);
        titleRow.setGravity(Gravity.CENTER_VERTICAL);

        // Type badge
        TextView tvBadge = new TextView(this);
        tvBadge.setTextSize(10);
        tvBadge.setTextColor(Color.WHITE);
        tvBadge.setGravity(Gravity.CENTER);
        int badgePadH = dp(8);
        int badgePadV = dp(3);
        tvBadge.setPadding(badgePadH, badgePadV, badgePadH, badgePadV);

        switch (ann.getType()) {
            case "reward":
                tvBadge.setText(R.string.announcement_reward);
                tvBadge.setBackgroundColor(ContextCompat.getColor(this, R.color.amber_400));
                tvBadge.setTextColor(Color.BLACK);
                break;
            case "subscription":
                tvBadge.setText(R.string.announcement_subscription);
                tvBadge.setBackgroundColor(ContextCompat.getColor(this, R.color.blue_400));
                break;
            default:
                tvBadge.setText(R.string.announcement_system);
                tvBadge.setBackgroundColor(ContextCompat.getColor(this, R.color.slate_500));
                break;
        }
        LinearLayout.LayoutParams badgeLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        badgeLp.setMarginEnd(dp(10));
        tvBadge.setLayoutParams(badgeLp);
        titleRow.addView(tvBadge);

        // Title
        TextView tvTitle = new TextView(this);
        tvTitle.setText(ann.getTitle());
        tvTitle.setTextColor(Color.WHITE);
        tvTitle.setTextSize(15);
        tvTitle.setTypeface(null, Typeface.BOLD);
        tvTitle.setMaxLines(1);
        tvTitle.setEllipsize(android.text.TextUtils.TruncateAt.END);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        tvTitle.setLayoutParams(titleLp);
        titleRow.addView(tvTitle);

        card.addView(titleRow);

        // Row 2: Content preview
        if (ann.getContent() != null && !ann.getContent().isEmpty()) {
            TextView tvContent = new TextView(this);
            tvContent.setText(ann.getContent());
            tvContent.setTextColor(ContextCompat.getColor(this, R.color.slate_400));
            tvContent.setTextSize(13);
            tvContent.setMaxLines(2);
            tvContent.setEllipsize(android.text.TextUtils.TruncateAt.END);
            LinearLayout.LayoutParams contentLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            contentLp.topMargin = dp(8);
            tvContent.setLayoutParams(contentLp);
            card.addView(tvContent);
        }

        // Row 3: Time
        if (ann.getCreatedAt() != null && !ann.getCreatedAt().isEmpty()) {
            TextView tvTime = new TextView(this);
            tvTime.setText(formatTime(ann.getCreatedAt()));
            tvTime.setTextColor(ContextCompat.getColor(this, R.color.slate_500));
            tvTime.setTextSize(11);
            LinearLayout.LayoutParams timeLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            timeLp.topMargin = dp(8);
            tvTime.setLayoutParams(timeLp);
            card.addView(tvTime);
        }

        // Click -> navigate to detail
        card.setOnClickListener(v -> {
            Intent intent = new Intent(this, AnnouncementDetailActivity.class);
            intent.putExtra("ann_id", ann.getId());
            intent.putExtra("ann_title", ann.getTitle());
            intent.putExtra("ann_content", ann.getContent());
            intent.putExtra("ann_type", ann.getType());
            intent.putExtra("ann_created_at", ann.getCreatedAt());
            startActivity(intent);
        });

        // Add ripple effect hint
        card.setClickable(true);
        card.setFocusable(true);

        listContainer.addView(card);
    }

    private String formatTime(String isoTime) {
        try {
            SimpleDateFormat sdfIn = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());
            Date date = sdfIn.parse(isoTime);
            if (date != null) {
                long diff = System.currentTimeMillis() - date.getTime();
                long minutes = diff / (1000 * 60);
                long hours = diff / (1000 * 60 * 60);
                long days = diff / (1000 * 60 * 60 * 24);

                if (minutes < 1) return getString(R.string.announcement_just_now);
                if (minutes < 60) return minutes + " " + getString(R.string.announcement_minutes_ago);
                if (hours < 24) return hours + " " + getString(R.string.announcement_hours_ago);
                if (days < 7) return days + " " + getString(R.string.announcement_days_ago);

                SimpleDateFormat sdfOut = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault());
                return sdfOut.format(date);
            }
        } catch (ParseException e) {
            // ignore
        }
        return isoTime;
    }
}
