package com.warrescue.app.activity;

import android.content.Intent;
import android.graphics.Typeface;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import com.warrescue.app.R;
import com.warrescue.app.data.DataRepository;
import com.warrescue.app.network.SupabaseClient;
import com.warrescue.app.util.SessionManager;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * L1: 一公里互助主页面 (连接后端)
 * → L2: 求助事件列表 / 附近互助者 / 我的记录 / 设置
 * → L3: 求助详情 / 发布求助 / 技能管理
 * → L4: 响应流程 / 聊天
 * → L5: 完成评价
 */
public class MutualAidActivity extends BaseDetailActivity {

    private TextView tvStatus;
    private TextView tvRange;
    private Switch toggle;
    private TextView statUsers;
    private TextView statAid;
    private TextView statResponse;
    private LinearLayout eventsContainer;
    private String userId;

    @Override
    protected String getPageTitle() { return getString(R.string.mutual_aid_title); }

    @Override
    protected void buildContent(LinearLayout container) {
        SessionManager sm = new SessionManager(this);
        userId = sm.getUserId();

        // ===== Status card =====
        LinearLayout statusCard = new LinearLayout(this);
        statusCard.setOrientation(LinearLayout.HORIZONTAL);
        statusCard.setBackgroundResource(R.drawable.bg_safe_status);
        statusCard.setGravity(Gravity.CENTER_VERTICAL);
        int pad = dp(20);
        statusCard.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(16);
        statusCard.setLayoutParams(lp);

        LinearLayout statusText = new LinearLayout(this);
        statusText.setOrientation(LinearLayout.VERTICAL);
        statusText.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        tvStatus = new TextView(this);
        tvStatus.setText(getString(R.string.mutual_aid_disabled));
        tvStatus.setTextColor(getColor(R.color.slate_400));
        tvStatus.setTextSize(16);
        tvStatus.setTypeface(null, Typeface.BOLD);
        statusText.addView(tvStatus);

        tvRange = new TextView(this);
        tvRange.setText(String.format(getString(R.string.mutual_aid_coverage), getString(R.string.mutual_aid_1km), 0));
        tvRange.setTextColor(getColor(R.color.slate_300));
        tvRange.setTextSize(12);
        LinearLayout.LayoutParams rLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        rLp.topMargin = dp(4);
        tvRange.setLayoutParams(rLp);
        statusText.addView(tvRange);

        statusCard.addView(statusText);

        toggle = new Switch(this);
        toggle.setChecked(false);
        toggle.setOnCheckedChangeListener((buttonView, isChecked) -> toggleSubscription(isChecked));
        statusCard.addView(toggle);

        container.addView(statusCard);

        // ===== Stats row =====
        LinearLayout statsRow = new LinearLayout(this);
        statsRow.setOrientation(LinearLayout.HORIZONTAL);
        statsRow.setBackgroundResource(R.drawable.bg_card);
        int sPad = dp(14);
        statsRow.setPadding(sPad, sPad, sPad, sPad);
        LinearLayout.LayoutParams statsLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        statsLp.bottomMargin = dp(16);
        statsRow.setLayoutParams(statsLp);

        statUsers = addStat(statsRow, "0", getString(R.string.nearby_users), R.color.blue_400);
        statAid = addStat(statsRow, "0", getString(R.string.aid_count), R.color.amber_500);
        statResponse = addStat(statsRow, "-", getString(R.string.avg_response), R.color.green_400);

        container.addView(statsRow);

        // ===== Quick action: I need help =====
        LinearLayout.LayoutParams helpBtnLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(50));
        helpBtnLp.bottomMargin = dp(16);

        TextView helpBtn = new TextView(this);
        helpBtn.setText(getString(R.string.aid_i_need_help));
        helpBtn.setTextColor(getColor(R.color.white));
        helpBtn.setTextSize(16);
        helpBtn.setTypeface(null, Typeface.BOLD);
        helpBtn.setGravity(Gravity.CENTER);
        helpBtn.setBackgroundResource(R.drawable.bg_icon_blue);
        helpBtn.setLayoutParams(helpBtnLp);
        helpBtn.setOnClickListener(v -> startActivity(new Intent(this, CreateHelpRequestActivity.class)));
        container.addView(helpBtn);

        // ===== Nearby events (live from backend) =====
        LinearLayout eventsHeader = new LinearLayout(this);
        eventsHeader.setOrientation(LinearLayout.HORIZONTAL);
        eventsHeader.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout.LayoutParams ehLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        ehLp.topMargin = dp(4);
        ehLp.bottomMargin = dp(8);
        eventsHeader.setLayoutParams(ehLp);

        TextView eventsTitle = new TextView(this);
        eventsTitle.setText(getString(R.string.nearby_events));
        eventsTitle.setTextColor(getColor(R.color.slate_400));
        eventsTitle.setTextSize(13);
        eventsTitle.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
        eventsHeader.addView(eventsTitle);

        TextView viewAll = new TextView(this);
        viewAll.setText(getString(R.string.aid_view_all_events) + " →");
        viewAll.setTextColor(getColor(R.color.blue_400));
        viewAll.setTextSize(12);
        viewAll.setOnClickListener(v -> startActivity(new Intent(this, HelpRequestListActivity.class)));
        eventsHeader.addView(viewAll);

        container.addView(eventsHeader);

        eventsContainer = new LinearLayout(this);
        eventsContainer.setOrientation(LinearLayout.VERTICAL);
        container.addView(eventsContainer);

        // ===== Quick navigation cards =====
        addSectionTitle(container, "快捷入口");

        View navHelpers = addSettingCard(container, getString(R.string.aid_nearby_helpers),
                "查看附近在线的互助者", R.drawable.bg_icon_blue);
        navHelpers.setOnClickListener(v -> startActivity(new Intent(this, NearbyHelpersActivity.class)));

        View navRecords = addSettingCard(container, getString(R.string.aid_my_records),
                "查看我发起和响应的互助记录", R.drawable.bg_icon_amber);
        navRecords.setOnClickListener(v -> startActivity(new Intent(this, MyAidRecordsActivity.class)));

        View navSkills = addSettingCard(container, getString(R.string.aid_my_skills),
                "管理我的互助技能", R.drawable.bg_icon_green);
        navSkills.setOnClickListener(v -> startActivity(new Intent(this, MySkillsActivity.class)));

        // ===== Settings =====
        addSectionTitle(container, getString(R.string.aid_settings));

        View settingsCard = addSettingCard(container, getString(R.string.receive_range),
                getString(R.string.aid_receive_range_desc), R.drawable.bg_icon_blue);
        settingsCard.setOnClickListener(v -> startActivity(new Intent(this, AidSettingsActivity.class)));

        View responseCard = addSettingCard(container, getString(R.string.response_method),
                getString(R.string.aid_response_method_desc), R.drawable.bg_icon_amber);
        responseCard.setOnClickListener(v -> startActivity(new Intent(this, AidSettingsActivity.class)));

        View autoCard = addSettingCard(container, getString(R.string.aid_auto_response),
                getString(R.string.aid_auto_response_desc), R.drawable.bg_icon_blue);
        autoCard.setOnClickListener(v -> startActivity(new Intent(this, AidSettingsActivity.class)));

        // Load data from backend
        loadSubscriptionStatus();
        loadStats();
        loadNearbyEvents();
    }

    private TextView addStat(LinearLayout parent, String value, String label, int colorRes) {
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER);
        col.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        TextView tvVal = new TextView(this);
        tvVal.setText(value);
        tvVal.setTextColor(getColor(colorRes));
        tvVal.setTextSize(20);
        tvVal.setTypeface(null, Typeface.BOLD);
        tvVal.setGravity(Gravity.CENTER);
        col.addView(tvVal);

        TextView tvLabel = new TextView(this);
        tvLabel.setText(label);
        tvLabel.setTextColor(getColor(R.color.slate_400));
        tvLabel.setTextSize(12);
        tvLabel.setGravity(Gravity.CENTER);
        col.addView(tvLabel);

        parent.addView(col);
        return tvVal;
    }

    private void loadSubscriptionStatus() {
        if (userId == null || userId.isEmpty()) return;
        DataRepository.getMutualAidSubscription(userId, new DataRepository.DataCallback<JSONObject>() {
            @Override
            public void onData(JSONObject data) {
                boolean isActive = data.length() > 0 && data.optBoolean("is_active", false);
                toggle.setOnCheckedChangeListener(null);
                toggle.setChecked(isActive);
                toggle.setOnCheckedChangeListener((buttonView, isChecked) -> toggleSubscription(isChecked));
                tvStatus.setText(isActive ? getString(R.string.mutual_aid_enabled) : getString(R.string.mutual_aid_disabled));
                tvStatus.setTextColor(getColor(isActive ? R.color.green_400 : R.color.slate_400));
            }
            @Override
            public void onError(String error) {}
        });
    }

    private void loadStats() {
        // Count active subscriptions (nearby helpers)
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) return;

        client.select("mutual_aid_subscriptions", "is_active=eq.true&select=id",
                new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                statUsers.setText(String.valueOf(result.length()));
                tvRange.setText(String.format(getString(R.string.mutual_aid_coverage), getString(R.string.mutual_aid_1km), result.length()));
            }
            @Override
            public void onError(String error) {}
        });

        // Count completed events
        client.select("mutual_aid_events", "status=eq.completed&select=id",
                new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                statAid.setText(String.valueOf(result.length()));
            }
            @Override
            public void onError(String error) {}
        });
    }

    private void loadNearbyEvents() {
        DataRepository.getMutualAidEvents("waiting", new DataRepository.DataCallback<JSONArray>() {
            @Override
            public void onData(JSONArray data) {
                eventsContainer.removeAllViews();
                if (data.length() == 0) {
                    TextView empty = new TextView(MutualAidActivity.this);
                    empty.setText(getString(R.string.aid_no_events));
                    empty.setTextColor(getColor(R.color.slate_400));
                    empty.setTextSize(13);
                    empty.setGravity(Gravity.CENTER);
                    empty.setPadding(0, dp(20), 0, dp(20));
                    eventsContainer.addView(empty);
                    return;
                }
                int limit = Math.min(data.length(), 5);
                for (int i = 0; i < limit; i++) {
                    JSONObject event = data.optJSONObject(i);
                    if (event != null) addEventCard(event);
                }
            }
            @Override
            public void onError(String error) {
                eventsContainer.removeAllViews();
                TextView err = new TextView(MutualAidActivity.this);
                err.setText(getString(R.string.aid_no_events));
                err.setTextColor(getColor(R.color.slate_400));
                err.setTextSize(13);
                err.setGravity(Gravity.CENTER);
                err.setPadding(0, dp(20), 0, dp(20));
                eventsContainer.addView(err);
            }
        });
    }

    private void addEventCard(JSONObject event) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(14);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        cardLp.bottomMargin = dp(8);
        card.setLayoutParams(cardLp);

        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        // Type badge
        String eventType = event.optString("event_type", "general");
        TextView typeBadge = new TextView(this);
        typeBadge.setText(getEventTypeName(eventType));
        typeBadge.setTextSize(11);
        typeBadge.setTextColor(getColor(R.color.white));
        typeBadge.setBackgroundResource(R.drawable.bg_icon_blue);
        int bPad = dp(6);
        typeBadge.setPadding(bPad, dp(2), bPad, dp(2));
        header.addView(typeBadge);

        // Title
        TextView tvTitle = new TextView(this);
        tvTitle.setText(event.optString("title", ""));
        tvTitle.setTextColor(getColor(R.color.white));
        tvTitle.setTextSize(14);
        tvTitle.setTypeface(null, Typeface.BOLD);
        LinearLayout.LayoutParams tLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        tLp.leftMargin = dp(8);
        tvTitle.setLayoutParams(tLp);
        header.addView(tvTitle);

        // Status
        String status = event.optString("status", "waiting");
        TextView tvSt = new TextView(this);
        tvSt.setText(getStatusName(status));
        tvSt.setTextSize(11);
        tvSt.setTextColor(getStatusColor(status));
        header.addView(tvSt);

        card.addView(header);

        // Description
        String desc = event.optString("description", "");
        if (!desc.isEmpty()) {
            TextView tvDesc = new TextView(this);
            tvDesc.setText(desc);
            tvDesc.setTextColor(getColor(R.color.slate_300));
            tvDesc.setTextSize(13);
            tvDesc.setMaxLines(2);
            LinearLayout.LayoutParams dLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            dLp.topMargin = dp(6);
            tvDesc.setLayoutParams(dLp);
            card.addView(tvDesc);
        }

        // Urgency badge for urgent items
        String urgency = event.optString("urgency", "normal");
        if ("urgent".equals(urgency)) {
            TextView urgBadge = new TextView(this);
            urgBadge.setText(getString(R.string.aid_urgency_urgent));
            urgBadge.setTextSize(11);
            urgBadge.setTextColor(getColor(R.color.red_500));
            urgBadge.setTypeface(null, Typeface.BOLD);
            LinearLayout.LayoutParams uLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            uLp.topMargin = dp(4);
            urgBadge.setLayoutParams(uLp);
            card.addView(urgBadge);
        }

        // Click to detail
        String eventId = event.optString("id", "");
        card.setOnClickListener(v -> {
            Intent intent = new Intent(this, HelpRequestDetailActivity.class);
            intent.putExtra("event_id", eventId);
            intent.putExtra("event_json", event.toString());
            startActivity(intent);
        });

        eventsContainer.addView(card);
    }

    private void toggleSubscription(boolean isActive) {
        if (userId == null || userId.isEmpty()) {
            Toast.makeText(this, "请先登录", Toast.LENGTH_SHORT).show();
            toggle.setChecked(!isActive);
            return;
        }

        try {
            JSONObject sub = new JSONObject();
            sub.put("user_id", userId);
            sub.put("is_active", isActive);

            DataRepository.toggleMutualAidSubscription(sub, new DataRepository.DataCallback<JSONObject>() {
                @Override
                public void onData(JSONObject data) {
                    tvStatus.setText(isActive ? getString(R.string.mutual_aid_enabled) : getString(R.string.mutual_aid_disabled));
                    tvStatus.setTextColor(getColor(isActive ? R.color.green_400 : R.color.slate_400));
                    Toast.makeText(MutualAidActivity.this,
                            isActive ? "互助服务已启用" : "互助服务已关闭", Toast.LENGTH_SHORT).show();
                }
                @Override
                public void onError(String error) {
                    toggle.setOnCheckedChangeListener(null);
                    toggle.setChecked(!isActive);
                    toggle.setOnCheckedChangeListener((buttonView, isChecked) -> toggleSubscription(isChecked));
                    Toast.makeText(MutualAidActivity.this, "操作失败: " + error, Toast.LENGTH_SHORT).show();
                }
            });
        } catch (Exception e) {
            toggle.setChecked(!isActive);
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

    private String getStatusName(String status) {
        switch (status) {
            case "waiting": return getString(R.string.aid_status_waiting);
            case "responding": return getString(R.string.aid_status_responding);
            case "in_progress": return getString(R.string.aid_status_in_progress);
            case "completed": return getString(R.string.aid_status_completed);
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

    @Override
    protected void onResume() {
        super.onResume();
        // Refresh data on return from sub-pages
        loadSubscriptionStatus();
        loadStats();
        loadNearbyEvents();
    }
}
