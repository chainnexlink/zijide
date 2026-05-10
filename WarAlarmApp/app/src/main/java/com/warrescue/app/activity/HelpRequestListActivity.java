package com.warrescue.app.activity;

import android.content.Intent;
import android.graphics.Typeface;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.warrescue.app.R;
import com.warrescue.app.data.DataRepository;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * L2: 求助事件列表 - 显示附近所有活跃求助事件
 */
public class HelpRequestListActivity extends BaseDetailActivity {

    private LinearLayout listContainer;

    @Override
    protected String getPageTitle() { return getString(R.string.aid_help_request_list); }

    @Override
    protected void buildContent(LinearLayout container) {
        // Filter tabs
        LinearLayout tabs = new LinearLayout(this);
        tabs.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams tabsLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        tabsLp.bottomMargin = dp(16);
        tabs.setLayoutParams(tabsLp);

        String[] filters = {"全部", getString(R.string.aid_status_waiting), getString(R.string.aid_status_in_progress), getString(R.string.aid_status_completed)};
        String[] statuses = {null, "waiting", "in_progress", "completed"};
        for (int i = 0; i < filters.length; i++) {
            final String statusFilter = statuses[i];
            TextView tab = new TextView(this);
            tab.setText(filters[i]);
            tab.setTextSize(13);
            tab.setTextColor(getColor(i == 0 ? R.color.blue_400 : R.color.slate_400));
            tab.setBackgroundResource(i == 0 ? R.drawable.bg_card : 0);
            int tPad = dp(10);
            tab.setPadding(tPad, dp(6), tPad, dp(6));
            LinearLayout.LayoutParams tLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            tLp.rightMargin = dp(8);
            tab.setLayoutParams(tLp);
            tab.setOnClickListener(v -> {
                for (int j = 0; j < tabs.getChildCount(); j++) {
                    TextView tv = (TextView) tabs.getChildAt(j);
                    tv.setTextColor(getColor(R.color.slate_400));
                    tv.setBackgroundResource(0);
                }
                tab.setTextColor(getColor(R.color.blue_400));
                tab.setBackgroundResource(R.drawable.bg_card);
                loadEvents(statusFilter);
            });
            tabs.addView(tab);
        }
        container.addView(tabs);

        // List container
        listContainer = new LinearLayout(this);
        listContainer.setOrientation(LinearLayout.VERTICAL);
        container.addView(listContainer);

        // Load all events
        loadEvents(null);
    }

    private void loadEvents(String statusFilter) {
        listContainer.removeAllViews();

        // Loading indicator
        TextView loading = new TextView(this);
        loading.setText(getString(R.string.loading));
        loading.setTextColor(getColor(R.color.slate_400));
        loading.setGravity(Gravity.CENTER);
        loading.setPadding(0, dp(40), 0, dp(40));
        listContainer.addView(loading);

        DataRepository.getMutualAidEvents(statusFilter, new DataRepository.DataCallback<JSONArray>() {
            @Override
            public void onData(JSONArray data) {
                listContainer.removeAllViews();
                if (data.length() == 0) {
                    TextView empty = new TextView(HelpRequestListActivity.this);
                    empty.setText(getString(R.string.aid_no_events));
                    empty.setTextColor(getColor(R.color.slate_400));
                    empty.setGravity(Gravity.CENTER);
                    empty.setPadding(0, dp(60), 0, dp(60));
                    listContainer.addView(empty);
                    return;
                }
                for (int i = 0; i < data.length(); i++) {
                    JSONObject event = data.optJSONObject(i);
                    if (event != null) addEventItem(listContainer, event);
                }
            }
            @Override
            public void onError(String error) {
                listContainer.removeAllViews();
                TextView err = new TextView(HelpRequestListActivity.this);
                err.setText("加载失败: " + error);
                err.setTextColor(getColor(R.color.red_500));
                err.setGravity(Gravity.CENTER);
                err.setPadding(0, dp(40), 0, dp(40));
                listContainer.addView(err);
            }
        });
    }

    private void addEventItem(LinearLayout container, JSONObject event) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(14);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(8);
        card.setLayoutParams(lp);

        // Header: type badge + urgency
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        String eventType = event.optString("event_type", "general");
        TextView typeBadge = new TextView(this);
        typeBadge.setText(getEventTypeName(eventType));
        typeBadge.setTextSize(11);
        typeBadge.setTextColor(getColor(R.color.white));
        typeBadge.setBackgroundResource(R.drawable.bg_icon_blue);
        int bPad = dp(6);
        typeBadge.setPadding(bPad, dp(2), bPad, dp(2));
        header.addView(typeBadge);

        String urgency = event.optString("urgency", "normal");
        if ("urgent".equals(urgency)) {
            TextView urgBadge = new TextView(this);
            urgBadge.setText(getString(R.string.aid_urgency_urgent));
            urgBadge.setTextSize(11);
            urgBadge.setTextColor(getColor(R.color.red_500));
            urgBadge.setTypeface(null, Typeface.BOLD);
            LinearLayout.LayoutParams uLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            uLp.leftMargin = dp(8);
            urgBadge.setLayoutParams(uLp);
            header.addView(urgBadge);
        }

        // Status on right
        View spacer = new View(this);
        spacer.setLayoutParams(new LinearLayout.LayoutParams(0, 0, 1f));
        header.addView(spacer);

        String status = event.optString("status", "waiting");
        TextView statusTv = new TextView(this);
        statusTv.setText(getStatusName(status));
        statusTv.setTextSize(12);
        statusTv.setTextColor(getStatusColor(status));
        header.addView(statusTv);

        card.addView(header);

        // Title
        TextView title = new TextView(this);
        title.setText(event.optString("title", ""));
        title.setTextColor(getColor(R.color.white));
        title.setTextSize(15);
        title.setTypeface(null, Typeface.BOLD);
        LinearLayout.LayoutParams tLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        tLp.topMargin = dp(8);
        title.setLayoutParams(tLp);
        card.addView(title);

        // Description
        String desc = event.optString("description", "");
        if (!desc.isEmpty()) {
            TextView descTv = new TextView(this);
            descTv.setText(desc);
            descTv.setTextColor(getColor(R.color.slate_300));
            descTv.setTextSize(13);
            descTv.setMaxLines(2);
            LinearLayout.LayoutParams dLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            dLp.topMargin = dp(4);
            descTv.setLayoutParams(dLp);
            card.addView(descTv);
        }

        // Bottom: responder count + time
        LinearLayout bottom = new LinearLayout(this);
        bottom.setOrientation(LinearLayout.HORIZONTAL);
        bottom.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams btmLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        btmLp.topMargin = dp(8);
        bottom.setLayoutParams(btmLp);

        int responders = event.optInt("responder_count", 0);
        TextView respTv = new TextView(this);
        respTv.setText(String.format(getString(R.string.aid_responder_count), responders));
        respTv.setTextSize(12);
        respTv.setTextColor(getColor(R.color.slate_400));
        bottom.addView(respTv);

        card.addView(bottom);

        // Click to open detail
        String eventId = event.optString("id", "");
        card.setOnClickListener(v -> {
            Intent intent = new Intent(this, HelpRequestDetailActivity.class);
            intent.putExtra("event_id", eventId);
            intent.putExtra("event_json", event.toString());
            startActivity(intent);
        });

        container.addView(card);
    }

    private String getEventTypeName(String type) {
        switch (type) {
            case "medical": return getString(R.string.aid_type_medical);
            case "supply": return getString(R.string.aid_type_supply);
            case "translate": return getString(R.string.aid_type_translate);
            case "transport": return getString(R.string.aid_type_transport);
            case "shelter": return getString(R.string.aid_type_shelter);
            default: return getString(R.string.aid_type_general);
        }
    }

    private String getStatusName(String status) {
        switch (status) {
            case "waiting": return getString(R.string.aid_status_waiting);
            case "responding": return getString(R.string.aid_status_responding);
            case "in_progress": return getString(R.string.aid_status_in_progress);
            case "completed": return getString(R.string.aid_status_completed);
            case "cancelled": return getString(R.string.aid_status_cancelled);
            case "expired": return getString(R.string.aid_status_expired);
            default: return status;
        }
    }

    private int getStatusColor(String status) {
        switch (status) {
            case "waiting": return getColor(R.color.amber_500);
            case "responding": case "in_progress": return getColor(R.color.blue_400);
            case "completed": return getColor(R.color.green_400);
            case "cancelled": case "expired": return getColor(R.color.slate_400);
            default: return getColor(R.color.slate_300);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadEvents(null);
    }
}
