package com.warrescue.app.activity;

import android.content.Intent;
import android.graphics.Typeface;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.warrescue.app.R;
import com.warrescue.app.data.DataRepository;
import com.warrescue.app.util.SessionManager;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * L3: 求助详情 - 查看求助事件详细信息，可响应/取消/进入聊天
 */
public class HelpRequestDetailActivity extends BaseDetailActivity {

    private String eventId;
    private JSONObject eventData;
    private String userId;
    private LinearLayout responsesContainer;
    private LinearLayout actionContainer;

    @Override
    protected String getPageTitle() { return getString(R.string.aid_request_detail); }

    @Override
    protected void buildContent(LinearLayout container) {
        SessionManager sm = new SessionManager(this);
        userId = sm.getUserId();

        eventId = getIntent().getStringExtra("event_id");
        String eventJson = getIntent().getStringExtra("event_json");

        try {
            eventData = new JSONObject(eventJson);
        } catch (Exception e) {
            eventData = new JSONObject();
        }

        // Event type & urgency badge row
        LinearLayout badgeRow = new LinearLayout(this);
        badgeRow.setOrientation(LinearLayout.HORIZONTAL);
        badgeRow.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams brLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        brLp.bottomMargin = dp(12);
        badgeRow.setLayoutParams(brLp);

        String eventType = eventData.optString("event_type", "general");
        TextView typeBadge = new TextView(this);
        typeBadge.setText(getEventTypeName(eventType));
        typeBadge.setTextSize(12);
        typeBadge.setTextColor(getColor(R.color.white));
        typeBadge.setBackgroundResource(R.drawable.bg_icon_blue);
        int bPad = dp(8);
        typeBadge.setPadding(bPad, dp(4), bPad, dp(4));
        badgeRow.addView(typeBadge);

        String urgency = eventData.optString("urgency", "normal");
        TextView urgBadge = new TextView(this);
        urgBadge.setText(getUrgencyName(urgency));
        urgBadge.setTextSize(12);
        urgBadge.setTextColor("urgent".equals(urgency) ? getColor(R.color.red_500) : getColor(R.color.amber_500));
        urgBadge.setBackgroundResource(R.drawable.bg_card);
        urgBadge.setPadding(bPad, dp(4), bPad, dp(4));
        LinearLayout.LayoutParams ubLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        ubLp.leftMargin = dp(8);
        urgBadge.setLayoutParams(ubLp);
        badgeRow.addView(urgBadge);

        View spacer = new View(this);
        spacer.setLayoutParams(new LinearLayout.LayoutParams(0, 0, 1f));
        badgeRow.addView(spacer);

        String status = eventData.optString("status", "waiting");
        TextView statusBadge = new TextView(this);
        statusBadge.setText(getStatusName(status));
        statusBadge.setTextSize(12);
        statusBadge.setTextColor(getStatusColor(status));
        statusBadge.setTypeface(null, Typeface.BOLD);
        badgeRow.addView(statusBadge);

        container.addView(badgeRow);

        // Title
        TextView title = new TextView(this);
        title.setText(eventData.optString("title", ""));
        title.setTextColor(getColor(R.color.white));
        title.setTextSize(20);
        title.setTypeface(null, Typeface.BOLD);
        container.addView(title);

        // Description card
        LinearLayout descCard = new LinearLayout(this);
        descCard.setOrientation(LinearLayout.VERTICAL);
        descCard.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(16);
        descCard.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams dcLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        dcLp.topMargin = dp(12);
        descCard.setLayoutParams(dcLp);

        addDetailRow(descCard, "描述", eventData.optString("description", "无描述"));
        addDetailRow(descCard, "地址", eventData.optString("address", "未提供"));
        addDetailRow(descCard, "响应人数", eventData.optInt("responder_count", 0) + "/" + eventData.optInt("max_responders", 1));
        addDetailRow(descCard, "奖励积分", String.valueOf(eventData.optInt("reward_points", 0)));

        container.addView(descCard);

        // Action buttons
        actionContainer = new LinearLayout(this);
        actionContainer.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams acLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        acLp.topMargin = dp(16);
        actionContainer.setLayoutParams(acLp);
        buildActionButtons(status);
        container.addView(actionContainer);

        // Responses section
        addSectionTitle(container, "响应记录");
        responsesContainer = new LinearLayout(this);
        responsesContainer.setOrientation(LinearLayout.VERTICAL);
        container.addView(responsesContainer);

        loadResponses();

        // Chat button
        LinearLayout.LayoutParams chatLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(44));
        chatLp.topMargin = dp(16);

        TextView chatBtn = new TextView(this);
        chatBtn.setText(getString(R.string.aid_chat));
        chatBtn.setTextColor(getColor(R.color.white));
        chatBtn.setTextSize(14);
        chatBtn.setGravity(Gravity.CENTER);
        chatBtn.setBackgroundResource(R.drawable.bg_card);
        chatBtn.setLayoutParams(chatLp);
        chatBtn.setOnClickListener(v -> {
            Intent intent = new Intent(this, AidChatActivity.class);
            intent.putExtra("event_id", eventId);
            startActivity(intent);
        });
        container.addView(chatBtn);
    }

    private void buildActionButtons(String status) {
        actionContainer.removeAllViews();
        String eventUserId = eventData.optString("user_id", "");
        boolean isMyRequest = userId != null && userId.equals(eventUserId);

        if (isMyRequest) {
            // My own request
            if ("waiting".equals(status) || "responding".equals(status)) {
                addActionButton(actionContainer, getString(R.string.aid_cancel_request), R.color.red_500, v -> cancelRequest());
            }
            if ("in_progress".equals(status)) {
                addActionButton(actionContainer, getString(R.string.aid_mark_completed), R.color.green_400, v -> completeRequest());
            }
        } else {
            // Someone else's request
            if ("waiting".equals(status) || "responding".equals(status)) {
                addActionButton(actionContainer, getString(R.string.aid_accept_help), R.color.blue_400, v -> {
                    Intent intent = new Intent(this, AidResponseActivity.class);
                    intent.putExtra("event_id", eventId);
                    intent.putExtra("event_json", eventData.toString());
                    startActivity(intent);
                });
            }
        }
    }

    private void addActionButton(LinearLayout container, String text, int colorRes, View.OnClickListener listener) {
        TextView btn = new TextView(this);
        btn.setText(text);
        btn.setTextColor(getColor(colorRes));
        btn.setTextSize(15);
        btn.setTypeface(null, Typeface.BOLD);
        btn.setGravity(Gravity.CENTER);
        btn.setBackgroundResource(R.drawable.bg_card);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        lp.bottomMargin = dp(8);
        btn.setLayoutParams(lp);
        btn.setOnClickListener(listener);
        container.addView(btn);
    }

    private void addDetailRow(LinearLayout container, String label, String value) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams rLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        rLp.bottomMargin = dp(8);
        row.setLayoutParams(rLp);

        TextView labelTv = new TextView(this);
        labelTv.setText(label);
        labelTv.setTextColor(getColor(R.color.slate_400));
        labelTv.setTextSize(13);
        labelTv.setLayoutParams(new LinearLayout.LayoutParams(dp(80), LinearLayout.LayoutParams.WRAP_CONTENT));
        row.addView(labelTv);

        TextView valueTv = new TextView(this);
        valueTv.setText(value);
        valueTv.setTextColor(getColor(R.color.white));
        valueTv.setTextSize(13);
        row.addView(valueTv);

        container.addView(row);
    }

    private void loadResponses() {
        if (eventId == null) return;
        DataRepository.getMutualAidResponses(eventId, new DataRepository.DataCallback<JSONArray>() {
            @Override
            public void onData(JSONArray data) {
                responsesContainer.removeAllViews();
                if (data.length() == 0) {
                    TextView empty = new TextView(HelpRequestDetailActivity.this);
                    empty.setText("暂无人响应");
                    empty.setTextColor(getColor(R.color.slate_400));
                    empty.setTextSize(13);
                    empty.setPadding(0, dp(12), 0, dp(12));
                    responsesContainer.addView(empty);
                    return;
                }
                for (int i = 0; i < data.length(); i++) {
                    JSONObject resp = data.optJSONObject(i);
                    if (resp != null) addResponseItem(resp);
                }
            }
            @Override
            public void onError(String error) {
                Log.w("HelpDetail", "Load responses error: " + error);
            }
        });
    }

    private void addResponseItem(JSONObject resp) {
        LinearLayout item = new LinearLayout(this);
        item.setOrientation(LinearLayout.HORIZONTAL);
        item.setBackgroundResource(R.drawable.bg_card);
        item.setGravity(Gravity.CENTER_VERTICAL);
        int pad = dp(12);
        item.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(6);
        item.setLayoutParams(lp);

        LinearLayout info = new LinearLayout(this);
        info.setOrientation(LinearLayout.VERTICAL);
        info.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        String responderId = resp.optString("responder_id", "");
        TextView name = new TextView(this);
        name.setText("互助者 " + responderId.substring(0, Math.min(12, responderId.length())));
        name.setTextColor(getColor(R.color.white));
        name.setTextSize(13);
        info.addView(name);

        String respStatus = resp.optString("status", "accepted");
        TextView statusTv = new TextView(this);
        statusTv.setText(respStatus);
        statusTv.setTextColor(getColor(R.color.blue_400));
        statusTv.setTextSize(12);
        info.addView(statusTv);

        item.addView(info);

        int eta = resp.optInt("eta_minutes", 0);
        if (eta > 0) {
            TextView etaTv = new TextView(this);
            etaTv.setText(String.format(getString(R.string.aid_eta_minutes), eta));
            etaTv.setTextColor(getColor(R.color.amber_500));
            etaTv.setTextSize(12);
            item.addView(etaTv);
        }

        responsesContainer.addView(item);
    }

    private void cancelRequest() {
        try {
            JSONObject updates = new JSONObject();
            updates.put("status", "cancelled");
            DataRepository.updateMutualAidEvent(eventId, updates, new DataRepository.DataCallback<JSONObject>() {
                @Override
                public void onData(JSONObject data) {
                    Toast.makeText(HelpRequestDetailActivity.this, "求助已取消", Toast.LENGTH_SHORT).show();
                    finish();
                }
                @Override
                public void onError(String error) {
                    Toast.makeText(HelpRequestDetailActivity.this, "取消失败: " + error, Toast.LENGTH_SHORT).show();
                }
            });
        } catch (Exception e) {
            Log.e("HelpDetail", "Cancel error", e);
        }
    }

    private void completeRequest() {
        try {
            JSONObject updates = new JSONObject();
            updates.put("status", "completed");
            DataRepository.updateMutualAidEvent(eventId, updates, new DataRepository.DataCallback<JSONObject>() {
                @Override
                public void onData(JSONObject data) {
                    Toast.makeText(HelpRequestDetailActivity.this, "援助已完成", Toast.LENGTH_SHORT).show();
                    // Go to review
                    Intent intent = new Intent(HelpRequestDetailActivity.this, AidCompletionActivity.class);
                    intent.putExtra("event_id", eventId);
                    startActivity(intent);
                    finish();
                }
                @Override
                public void onError(String error) {
                    Toast.makeText(HelpRequestDetailActivity.this, "操作失败: " + error, Toast.LENGTH_SHORT).show();
                }
            });
        } catch (Exception e) {
            Log.e("HelpDetail", "Complete error", e);
        }
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

    private String getUrgencyName(String urgency) {
        switch (urgency) {
            case "urgent": return getString(R.string.aid_urgency_urgent);
            case "low": return getString(R.string.aid_urgency_low);
            default: return getString(R.string.aid_urgency_normal);
        }
    }

    private String getStatusName(String status) {
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
}
