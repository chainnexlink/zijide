package com.warrescue.app.activity;

import android.content.Intent;
import android.graphics.Typeface;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.warrescue.app.R;
import com.warrescue.app.data.DataRepository;
import com.warrescue.app.util.SessionManager;

import org.json.JSONObject;

/**
 * L4: 响应求助 - 接受并响应一个互助求助事件
 * 包含: 接受 → 出发 → 到达 → 完成 流程
 */
public class AidResponseActivity extends BaseDetailActivity {

    private String eventId;
    private JSONObject eventData;
    private String responseId;
    private String userId;
    private String currentStatus = "accepted";
    private LinearLayout statusContainer;

    @Override
    protected String getPageTitle() { return getString(R.string.aid_respond); }

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

        // Event summary card
        LinearLayout summaryCard = new LinearLayout(this);
        summaryCard.setOrientation(LinearLayout.VERTICAL);
        summaryCard.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(16);
        summaryCard.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams scLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        scLp.bottomMargin = dp(16);
        summaryCard.setLayoutParams(scLp);

        TextView eventTitle = new TextView(this);
        eventTitle.setText(eventData.optString("title", "求助事件"));
        eventTitle.setTextColor(getColor(R.color.white));
        eventTitle.setTextSize(16);
        eventTitle.setTypeface(null, Typeface.BOLD);
        summaryCard.addView(eventTitle);

        String desc = eventData.optString("description", "");
        if (!desc.isEmpty()) {
            TextView descTv = new TextView(this);
            descTv.setText(desc);
            descTv.setTextColor(getColor(R.color.slate_300));
            descTv.setTextSize(13);
            LinearLayout.LayoutParams dLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            dLp.topMargin = dp(4);
            descTv.setLayoutParams(dLp);
            summaryCard.addView(descTv);
        }

        container.addView(summaryCard);

        // Response status flow
        addSectionTitle(container, "响应流程");

        statusContainer = new LinearLayout(this);
        statusContainer.setOrientation(LinearLayout.VERTICAL);
        container.addView(statusContainer);

        buildStatusFlow();

        // Action buttons area
        addSectionTitle(container, "操作");

        // Accept button
        TextView acceptBtn = createActionButton(getString(R.string.aid_accept_help), R.color.blue_400);
        acceptBtn.setOnClickListener(v -> acceptHelp());
        container.addView(acceptBtn);

        // En route button
        TextView enRouteBtn = createActionButton(getString(R.string.aid_en_route), R.color.amber_500);
        enRouteBtn.setOnClickListener(v -> markEnRoute());
        container.addView(enRouteBtn);

        // Arrived button
        TextView arrivedBtn = createActionButton(getString(R.string.aid_mark_arrived), R.color.green_400);
        arrivedBtn.setOnClickListener(v -> markArrived());
        container.addView(arrivedBtn);

        // Complete button
        TextView completeBtn = createActionButton(getString(R.string.aid_mark_completed), R.color.green_400);
        completeBtn.setOnClickListener(v -> markCompleted());
        container.addView(completeBtn);

        // Chat button
        LinearLayout.LayoutParams chatLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(44));
        chatLp.topMargin = dp(12);
        TextView chatBtn = new TextView(this);
        chatBtn.setText(getString(R.string.aid_chat) + " →");
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

        // Cancel button
        LinearLayout.LayoutParams cancelLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(44));
        cancelLp.topMargin = dp(8);
        TextView cancelBtn = new TextView(this);
        cancelBtn.setText(getString(R.string.cancel));
        cancelBtn.setTextColor(getColor(R.color.red_500));
        cancelBtn.setTextSize(14);
        cancelBtn.setGravity(Gravity.CENTER);
        cancelBtn.setBackgroundResource(R.drawable.bg_card);
        cancelBtn.setLayoutParams(cancelLp);
        cancelBtn.setOnClickListener(v -> cancelResponse());
        container.addView(cancelBtn);
    }

    private void buildStatusFlow() {
        statusContainer.removeAllViews();

        String[] steps = {"accepted", "en_route", "arrived", "completed"};
        String[] labels = {"已接受", "赶往中", "已到达", "已完成"};

        for (int i = 0; i < steps.length; i++) {
            LinearLayout stepRow = new LinearLayout(this);
            stepRow.setOrientation(LinearLayout.HORIZONTAL);
            stepRow.setGravity(Gravity.CENTER_VERTICAL);
            int sPad = dp(10);
            stepRow.setPadding(sPad, sPad, sPad, sPad);
            LinearLayout.LayoutParams srLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            stepRow.setLayoutParams(srLp);

            // Step indicator
            TextView indicator = new TextView(this);
            boolean isReached = getStepIndex(currentStatus) >= i;
            indicator.setText(isReached ? "●" : "○");
            indicator.setTextSize(16);
            indicator.setTextColor(isReached ? getColor(R.color.green_400) : getColor(R.color.slate_400));
            LinearLayout.LayoutParams iLp = new LinearLayout.LayoutParams(dp(24), LinearLayout.LayoutParams.WRAP_CONTENT);
            indicator.setLayoutParams(iLp);
            indicator.setGravity(Gravity.CENTER);
            stepRow.addView(indicator);

            TextView label = new TextView(this);
            label.setText(labels[i]);
            label.setTextSize(14);
            label.setTextColor(isReached ? getColor(R.color.white) : getColor(R.color.slate_400));
            if (steps[i].equals(currentStatus)) {
                label.setTypeface(null, Typeface.BOLD);
            }
            LinearLayout.LayoutParams lLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lLp.leftMargin = dp(8);
            label.setLayoutParams(lLp);
            stepRow.addView(label);

            statusContainer.addView(stepRow);
        }
    }

    private int getStepIndex(String status) {
        switch (status) {
            case "accepted": return 0;
            case "en_route": return 1;
            case "arrived": return 2;
            case "completed": return 3;
            default: return -1;
        }
    }

    private TextView createActionButton(String text, int colorRes) {
        TextView btn = new TextView(this);
        btn.setText(text);
        btn.setTextColor(getColor(colorRes));
        btn.setTextSize(14);
        btn.setTypeface(null, Typeface.BOLD);
        btn.setGravity(Gravity.CENTER);
        btn.setBackgroundResource(R.drawable.bg_card);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(44));
        lp.bottomMargin = dp(6);
        btn.setLayoutParams(lp);
        return btn;
    }

    private void acceptHelp() {
        if (userId == null || userId.isEmpty()) {
            Toast.makeText(this, "请先登录", Toast.LENGTH_SHORT).show();
            return;
        }
        try {
            JSONObject response = new JSONObject();
            response.put("event_id", eventId);
            response.put("responder_id", userId);
            response.put("status", "accepted");
            response.put("eta_minutes", 5);

            DataRepository.createMutualAidResponse(response, new DataRepository.DataCallback<JSONObject>() {
                @Override
                public void onData(JSONObject data) {
                    responseId = data.optString("id", null);
                    currentStatus = "accepted";
                    buildStatusFlow();
                    Toast.makeText(AidResponseActivity.this, getString(R.string.aid_response_accepted), Toast.LENGTH_SHORT).show();
                }
                @Override
                public void onError(String error) {
                    Toast.makeText(AidResponseActivity.this, "接受失败: " + error, Toast.LENGTH_SHORT).show();
                }
            });
        } catch (Exception e) {
            Toast.makeText(this, "操作失败", Toast.LENGTH_SHORT).show();
        }
    }

    private void markEnRoute() {
        updateResponseStatus("en_route", "正在赶往现场");
    }

    private void markArrived() {
        updateResponseStatus("arrived", getString(R.string.aid_response_arrived));
    }

    private void markCompleted() {
        updateResponseStatus("completed", getString(R.string.aid_response_completed));
    }

    private void updateResponseStatus(String status, String message) {
        if (responseId == null) {
            Toast.makeText(this, "请先接受求助", Toast.LENGTH_SHORT).show();
            return;
        }
        try {
            JSONObject updates = new JSONObject();
            updates.put("status", status);
            if ("arrived".equals(status)) {
                updates.put("arrived_at", "now()");
            }
            if ("completed".equals(status)) {
                updates.put("completed_at", "now()");
            }

            DataRepository.updateMutualAidResponse(responseId, updates, new DataRepository.DataCallback<JSONObject>() {
                @Override
                public void onData(JSONObject data) {
                    currentStatus = status;
                    buildStatusFlow();
                    Toast.makeText(AidResponseActivity.this, message, Toast.LENGTH_SHORT).show();
                    if ("completed".equals(status)) {
                        // Navigate to completion/review
                        Intent intent = new Intent(AidResponseActivity.this, AidCompletionActivity.class);
                        intent.putExtra("event_id", eventId);
                        startActivity(intent);
                    }
                }
                @Override
                public void onError(String error) {
                    Toast.makeText(AidResponseActivity.this, "操作失败: " + error, Toast.LENGTH_SHORT).show();
                }
            });
        } catch (Exception e) {
            Toast.makeText(this, "操作失败", Toast.LENGTH_SHORT).show();
        }
    }

    private void cancelResponse() {
        if (responseId == null) {
            finish();
            return;
        }
        try {
            JSONObject updates = new JSONObject();
            updates.put("status", "cancelled");
            DataRepository.updateMutualAidResponse(responseId, updates, new DataRepository.DataCallback<JSONObject>() {
                @Override
                public void onData(JSONObject data) {
                    Toast.makeText(AidResponseActivity.this, "已取消响应", Toast.LENGTH_SHORT).show();
                    finish();
                }
                @Override
                public void onError(String error) {
                    Toast.makeText(AidResponseActivity.this, "取消失败", Toast.LENGTH_SHORT).show();
                }
            });
        } catch (Exception e) {
            finish();
        }
    }
}
