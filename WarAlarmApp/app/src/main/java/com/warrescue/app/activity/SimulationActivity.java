package com.warrescue.app.activity;

import android.content.Intent;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.warrescue.app.R;

public class SimulationActivity extends BaseDetailActivity {
    @Override
    protected String getPageTitle() { return getString(R.string.simulation_drill); }

    @Override
    protected void buildContent(LinearLayout container) {
        addSectionTitle(container, getString(R.string.select_scenario));

        int[][] scenarioStrings = {
                {R.string.air_strike_sim, R.string.air_strike_sim_desc},
                {R.string.artillery_sim, R.string.artillery_sim_desc},
                {R.string.chemical_sim, R.string.chemical_sim_desc},
                {R.string.curfew_sim, R.string.curfew_sim_desc}
        };
        String[] severities = {"red", "orange", "yellow", "yellow"};
        String[] types = {"air_strike", "artillery", "chemical", "curfew"};

        for (int i = 0; i < scenarioStrings.length; i++) {
            final String scenarioTitle = getString(scenarioStrings[i][0]);
            final String scenarioDesc = getString(scenarioStrings[i][1]);
            final String type = types[i];

            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            int bgRes;
            if ("red".equals(severities[i])) bgRes = R.drawable.bg_alert_red;
            else if ("orange".equals(severities[i])) bgRes = R.drawable.bg_alert_orange;
            else bgRes = R.drawable.bg_alert_yellow;
            card.setBackgroundResource(bgRes);
            int pad = dp(16);
            card.setPadding(pad, pad, pad, pad);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.bottomMargin = dp(12);
            card.setLayoutParams(lp);

            TextView tvName = new TextView(this);
            tvName.setText(scenarioTitle);
            tvName.setTextColor(getColor(R.color.white));
            tvName.setTextSize(16);
            tvName.setTypeface(null, android.graphics.Typeface.BOLD);
            card.addView(tvName);

            TextView tvDesc = new TextView(this);
            tvDesc.setText(scenarioDesc);
            tvDesc.setTextColor(getColor(R.color.slate_300));
            tvDesc.setTextSize(13);
            LinearLayout.LayoutParams descLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            descLp.topMargin = dp(4);
            tvDesc.setLayoutParams(descLp);
            card.addView(tvDesc);

            Button btnStart = new Button(this);
            btnStart.setText(getString(R.string.start_simulation));
            btnStart.setTextColor(getColor(R.color.white));
            btnStart.setBackgroundResource(R.drawable.bg_button_primary);
            btnStart.setAllCaps(false);
            btnStart.setTextSize(14);
            LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, dp(40));
            btnLp.topMargin = dp(12);
            btnStart.setLayoutParams(btnLp);
            btnStart.setOnClickListener(v -> {
                Intent intent = new Intent(this, SimulationRunActivity.class);
                intent.putExtra("type", type);
                intent.putExtra("title", scenarioTitle);
                startActivity(intent);
            });
            card.addView(btnStart);

            container.addView(card);
        }
    }
}
