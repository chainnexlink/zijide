package com.warrescue.app.activity;

import android.content.Intent;
import android.graphics.Typeface;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.warrescue.app.R;
import com.warrescue.app.data.DataRepository;
import com.warrescue.app.network.SupabaseClient;
import com.warrescue.app.util.SessionManager;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * L2: 我的互助记录 - 显示我发起的求助和我响应的求助
 */
public class MyAidRecordsActivity extends BaseDetailActivity {

    private LinearLayout listContainer;
    private String userId;
    private boolean showMyRequests = true;

    @Override
    protected String getPageTitle() { return getString(R.string.aid_my_records); }

    @Override
    protected void buildContent(LinearLayout container) {
        SessionManager sm = new SessionManager(this);
        userId = sm.getUserId();

        // Toggle tabs: My Requests / My Responses
        LinearLayout tabs = new LinearLayout(this);
        tabs.setOrientation(LinearLayout.HORIZONTAL);
        tabs.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams tabsLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        tabsLp.bottomMargin = dp(16);
        tabs.setLayoutParams(tabsLp);

        TextView tabRequests = new TextView(this);
        tabRequests.setText(getString(R.string.aid_records_my_requests));
        tabRequests.setTextSize(14);
        tabRequests.setTypeface(null, Typeface.BOLD);
        tabRequests.setTextColor(getColor(R.color.blue_400));
        tabRequests.setBackgroundResource(R.drawable.bg_card);
        int tPad = dp(16);
        tabRequests.setPadding(tPad, dp(10), tPad, dp(10));
        LinearLayout.LayoutParams trLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        trLp.rightMargin = dp(4);
        tabRequests.setLayoutParams(trLp);
        tabRequests.setGravity(Gravity.CENTER);

        TextView tabResponses = new TextView(this);
        tabResponses.setText(getString(R.string.aid_records_my_responses));
        tabResponses.setTextSize(14);
        tabResponses.setTextColor(getColor(R.color.slate_400));
        tabResponses.setBackgroundResource(R.drawable.bg_card);
        tabResponses.setPadding(tPad, dp(10), tPad, dp(10));
        LinearLayout.LayoutParams teLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        teLp.leftMargin = dp(4);
        tabResponses.setLayoutParams(teLp);
        tabResponses.setGravity(Gravity.CENTER);

        tabRequests.setOnClickListener(v -> {
            showMyRequests = true;
            tabRequests.setTextColor(getColor(R.color.blue_400));
            tabRequests.setTypeface(null, Typeface.BOLD);
            tabResponses.setTextColor(getColor(R.color.slate_400));
            tabResponses.setTypeface(null, Typeface.NORMAL);
            loadRecords();
        });

        tabResponses.setOnClickListener(v -> {
            showMyRequests = false;
            tabResponses.setTextColor(getColor(R.color.blue_400));
            tabResponses.setTypeface(null, Typeface.BOLD);
            tabRequests.setTextColor(getColor(R.color.slate_400));
            tabRequests.setTypeface(null, Typeface.NORMAL);
            loadRecords();
        });

        tabs.addView(tabRequests);
        tabs.addView(tabResponses);
        container.addView(tabs);

        // List
        listContainer = new LinearLayout(this);
        listContainer.setOrientation(LinearLayout.VERTICAL);
        container.addView(listContainer);

        loadRecords();
    }

    private void loadRecords() {
        listContainer.removeAllViews();

        TextView loading = new TextView(this);
        loading.setText(getString(R.string.loading));
        loading.setTextColor(getColor(R.color.slate_400));
        loading.setGravity(Gravity.CENTER);
        loading.setPadding(0, dp(40), 0, dp(40));
        listContainer.addView(loading);

        if (showMyRequests) {
            loadMyRequests();
        } else {
            loadMyResponses();
        }
    }

    private void loadMyRequests() {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured() || userId == null || userId.isEmpty()) {
            listContainer.removeAllViews();
            showEmpty();
            return;
        }

        client.select("mutual_aid_events", "user_id=eq." + userId + "&order=created_at.desc&limit=50",
                new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                listContainer.removeAllViews();
                if (result.length() == 0) {
                    showEmpty();
                    return;
                }
                for (int i = 0; i < result.length(); i++) {
                    JSONObject event = result.optJSONObject(i);
                    if (event != null) addRecordCard(event, true);
                }
            }
            @Override
            public void onError(String error) {
                listContainer.removeAllViews();
                showEmpty();
            }
        });
    }

    private void loadMyResponses() {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured() || userId == null || userId.isEmpty()) {
            listContainer.removeAllViews();
            showEmpty();
            return;
        }

        client.select("mutual_aid_event_responses", "responder_id=eq." + userId + "&order=created_at.desc&limit=50",
                new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                listContainer.removeAllViews();
                if (result.length() == 0) {
                    showEmpty();
                    return;
                }
                for (int i = 0; i < result.length(); i++) {
                    JSONObject resp = result.optJSONObject(i);
                    if (resp != null) addResponseCard(resp);
                }
            }
            @Override
            public void onError(String error) {
                listContainer.removeAllViews();
                showEmpty();
            }
        });
    }

    private void addRecordCard(JSONObject event, boolean isRequest) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(14);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(8);
        card.setLayoutParams(lp);

        // Header
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        TextView title = new TextView(this);
        title.setText(event.optString("title", "求助事件"));
        title.setTextColor(getColor(R.color.white));
        title.setTextSize(15);
        title.setTypeface(null, Typeface.BOLD);
        title.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
        header.addView(title);

        String status = event.optString("status", "waiting");
        TextView statusTv = new TextView(this);
        statusTv.setText(getStatusText(status));
        statusTv.setTextSize(12);
        statusTv.setTextColor(getStatusColor(status));
        header.addView(statusTv);

        card.addView(header);

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

        String eventId = event.optString("id", "");
        card.setOnClickListener(v -> {
            Intent intent = new Intent(this, HelpRequestDetailActivity.class);
            intent.putExtra("event_id", eventId);
            intent.putExtra("event_json", event.toString());
            startActivity(intent);
        });

        listContainer.addView(card);
    }

    private void addResponseCard(JSONObject resp) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(14);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(8);
        card.setLayoutParams(lp);

        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        TextView title = new TextView(this);
        title.setText("响应求助");
        title.setTextColor(getColor(R.color.white));
        title.setTextSize(15);
        title.setTypeface(null, Typeface.BOLD);
        title.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
        header.addView(title);

        String status = resp.optString("status", "accepted");
        TextView statusTv = new TextView(this);
        statusTv.setText(status);
        statusTv.setTextSize(12);
        statusTv.setTextColor(getColor(R.color.blue_400));
        header.addView(statusTv);

        card.addView(header);

        String msg = resp.optString("message", "");
        if (!msg.isEmpty()) {
            TextView msgTv = new TextView(this);
            msgTv.setText(msg);
            msgTv.setTextColor(getColor(R.color.slate_300));
            msgTv.setTextSize(13);
            LinearLayout.LayoutParams mLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            mLp.topMargin = dp(4);
            msgTv.setLayoutParams(mLp);
            card.addView(msgTv);
        }

        listContainer.addView(card);
    }

    private String getStatusText(String status) {
        switch (status) {
            case "waiting": return getString(R.string.aid_status_waiting);
            case "responding": return getString(R.string.aid_status_responding);
            case "in_progress": return getString(R.string.aid_status_in_progress);
            case "completed": return getString(R.string.aid_status_completed);
            case "cancelled": return getString(R.string.aid_status_cancelled);
            default: return status;
        }
    }

    private int getStatusColor(String status) {
        switch (status) {
            case "waiting": return getColor(R.color.amber_500);
            case "responding": case "in_progress": return getColor(R.color.blue_400);
            case "completed": return getColor(R.color.green_400);
            default: return getColor(R.color.slate_400);
        }
    }

    private void showEmpty() {
        TextView empty = new TextView(this);
        empty.setText(getString(R.string.aid_no_records));
        empty.setTextColor(getColor(R.color.slate_400));
        empty.setGravity(Gravity.CENTER);
        empty.setPadding(0, dp(60), 0, dp(60));
        listContainer.addView(empty);
    }
}
