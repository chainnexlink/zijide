package com.warrescue.app.activity;

import android.graphics.Typeface;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.warrescue.app.R;
import com.warrescue.app.data.DataRepository;
import com.warrescue.app.network.SupabaseClient;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * L2: 附近互助者 - 显示附近已订阅互助服务的用户列表
 */
public class NearbyHelpersActivity extends BaseDetailActivity {

    private LinearLayout listContainer;

    @Override
    protected String getPageTitle() { return getString(R.string.aid_nearby_helpers); }

    @Override
    protected void buildContent(LinearLayout container) {
        // Info card
        LinearLayout infoCard = new LinearLayout(this);
        infoCard.setOrientation(LinearLayout.VERTICAL);
        infoCard.setBackgroundResource(R.drawable.bg_safe_status);
        int pad = dp(16);
        infoCard.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams infoLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        infoLp.bottomMargin = dp(16);
        infoCard.setLayoutParams(infoLp);

        TextView infoTitle = new TextView(this);
        infoTitle.setText("附近互助者网络");
        infoTitle.setTextColor(getColor(R.color.green_400));
        infoTitle.setTextSize(16);
        infoTitle.setTypeface(null, Typeface.BOLD);
        infoCard.addView(infoTitle);

        TextView infoDesc = new TextView(this);
        infoDesc.setText("以下用户已开启1公里互助服务，在您需要帮助时可以提供援助");
        infoDesc.setTextColor(getColor(R.color.slate_300));
        infoDesc.setTextSize(13);
        LinearLayout.LayoutParams descLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        descLp.topMargin = dp(4);
        infoDesc.setLayoutParams(descLp);
        infoCard.addView(infoDesc);

        container.addView(infoCard);

        // List
        listContainer = new LinearLayout(this);
        listContainer.setOrientation(LinearLayout.VERTICAL);
        container.addView(listContainer);

        loadHelpers();
    }

    private void loadHelpers() {
        listContainer.removeAllViews();
        TextView loading = new TextView(this);
        loading.setText(getString(R.string.loading));
        loading.setTextColor(getColor(R.color.slate_400));
        loading.setGravity(Gravity.CENTER);
        loading.setPadding(0, dp(40), 0, dp(40));
        listContainer.addView(loading);

        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            listContainer.removeAllViews();
            showEmpty();
            return;
        }

        client.select("mutual_aid_subscriptions", "is_active=eq.true&order=created_at.desc&limit=50",
                new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                listContainer.removeAllViews();
                if (result.length() == 0) {
                    showEmpty();
                    return;
                }

                // Stats card
                LinearLayout statsRow = new LinearLayout(NearbyHelpersActivity.this);
                statsRow.setOrientation(LinearLayout.HORIZONTAL);
                statsRow.setBackgroundResource(R.drawable.bg_card);
                int sPad = dp(14);
                statsRow.setPadding(sPad, sPad, sPad, sPad);
                LinearLayout.LayoutParams statsLp = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                statsLp.bottomMargin = dp(16);
                statsRow.setLayoutParams(statsLp);

                addStatCol(statsRow, String.valueOf(result.length()), "在线互助者", R.color.green_400);
                addStatCol(statsRow, "1km", "覆盖范围", R.color.blue_400);
                addStatCol(statsRow, "24h", "全天候", R.color.amber_500);

                listContainer.addView(statsRow);

                addSectionTitle(listContainer, "互助者列表");

                for (int i = 0; i < result.length(); i++) {
                    JSONObject sub = result.optJSONObject(i);
                    if (sub != null) addHelperItem(sub);
                }
            }
            @Override
            public void onError(String error) {
                listContainer.removeAllViews();
                showEmpty();
            }
        });
    }

    private void addHelperItem(JSONObject sub) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setBackgroundResource(R.drawable.bg_card);
        card.setGravity(Gravity.CENTER_VERTICAL);
        int pad = dp(14);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(6);
        card.setLayoutParams(lp);

        // Avatar placeholder
        TextView avatar = new TextView(this);
        avatar.setText("\uD83D\uDC64");
        avatar.setTextSize(24);
        avatar.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams avLp = new LinearLayout.LayoutParams(dp(40), dp(40));
        avatar.setLayoutParams(avLp);
        card.addView(avatar);

        // Info
        LinearLayout info = new LinearLayout(this);
        info.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams infoLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        infoLp.leftMargin = dp(12);
        info.setLayoutParams(infoLp);

        String userId = sub.optString("user_id", "").substring(0, Math.min(12, sub.optString("user_id", "").length()));
        TextView name = new TextView(this);
        name.setText("互助者 " + userId);
        name.setTextColor(getColor(R.color.white));
        name.setTextSize(14);
        info.addView(name);

        int rewards = sub.optInt("total_rewards", 0);
        TextView meta = new TextView(this);
        meta.setText("累计奖励: " + rewards + "积分");
        meta.setTextColor(getColor(R.color.slate_400));
        meta.setTextSize(12);
        info.addView(meta);

        card.addView(info);

        // Online badge
        TextView online = new TextView(this);
        online.setText(getString(R.string.online));
        online.setTextSize(11);
        online.setTextColor(getColor(R.color.green_400));
        card.addView(online);

        listContainer.addView(card);
    }

    private void addStatCol(LinearLayout parent, String value, String label, int colorRes) {
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
    }

    private void showEmpty() {
        TextView empty = new TextView(this);
        empty.setText(getString(R.string.aid_no_helpers));
        empty.setTextColor(getColor(R.color.slate_400));
        empty.setGravity(Gravity.CENTER);
        empty.setPadding(0, dp(60), 0, dp(60));
        listContainer.addView(empty);
    }
}
