package com.warrescue.app.activity;

import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import com.warrescue.app.R;
import com.warrescue.app.model.Shelter;
import com.warrescue.app.data.DataRepository;

import java.util.List;

public class RoutePlanActivity extends BaseDetailActivity {
    @Override
    protected String getPageTitle() { return getString(R.string.route_plan); }

    @Override
    protected void buildContent(LinearLayout container) {
        // Current location
        LinearLayout locCard = new LinearLayout(this);
        locCard.setOrientation(LinearLayout.HORIZONTAL);
        locCard.setBackgroundResource(R.drawable.bg_card);
        locCard.setGravity(Gravity.CENTER_VERTICAL);
        int pad = dp(14);
        locCard.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams locLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        locLp.bottomMargin = dp(16);
        locCard.setLayoutParams(locLp);

        View locDot = new View(this);
        locDot.setBackgroundResource(R.drawable.bg_icon_blue);
        LinearLayout.LayoutParams dotLp = new LinearLayout.LayoutParams(dp(10), dp(10));
        dotLp.rightMargin = dp(10);
        locDot.setLayoutParams(dotLp);
        locCard.addView(locDot);

        LinearLayout locText = new LinearLayout(this);
        locText.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams locTextLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        locText.setLayoutParams(locTextLp);

        TextView tvLocTitle = new TextView(this);
        tvLocTitle.setText(getString(R.string.current_location));
        tvLocTitle.setTextColor(getColor(R.color.slate_400));
        tvLocTitle.setTextSize(12);
        locText.addView(tvLocTitle);

        TextView tvLocAddr = new TextView(this);
        tvLocAddr.setText(getString(R.string.current_location_addr));
        tvLocAddr.setTextColor(getColor(R.color.white));
        tvLocAddr.setTextSize(15);
        locText.addView(tvLocAddr);
        locCard.addView(locText);

        container.addView(locCard);

        // Routes section title
        addSectionTitle(container, getString(R.string.recommended_routes));

        // Placeholder for route cards (filled asynchronously)
        LinearLayout routesContainer = new LinearLayout(this);
        routesContainer.setOrientation(LinearLayout.VERTICAL);
        container.addView(routesContainer);

        // Load shelters asynchronously from Supabase API
        DataRepository.getShelters(this, new DataRepository.DataCallback<List<Shelter>>() {
            @Override
            public void onData(List<Shelter> shelters) {
                renderRoutes(routesContainer, shelters);
            }
            @Override
            public void onError(String error) {
                // No routes to show
            }
        });

        // Danger zones (static content, render immediately)
        addSectionTitle(container, getString(R.string.danger_zones));

        addDangerCard(container, getString(R.string.danger_east_industry), getString(R.string.danger_east_desc), getString(R.string.danger_extreme));
        addDangerCard(container, getString(R.string.danger_north_bridge), getString(R.string.danger_north_desc), getString(R.string.danger_no_pass));
        addDangerCard(container, getString(R.string.danger_airport), getString(R.string.danger_airport_desc), getString(R.string.danger_high));
    }

    private void renderRoutes(LinearLayout routesContainer, List<Shelter> shelters) {
        String[] routeLabels = {"A", "B", "C", "D", "E"};
        int[] safetyColors = {R.color.green_400, R.color.green_400, R.color.amber_500, R.color.green_400, R.color.green_400};
        int[] safetyStrings = {R.string.safety_high, R.string.safety_high, R.string.safety_medium, R.string.safety_high, R.string.safety_high};
        int[] walkTimes = {10, 15, 40, 25, 6};

        for (int i = 0; i < Math.min(shelters.size(), 3); i++) {
            Shelter shelter = shelters.get(i);
            String label = routeLabels[i];
            int safetyColor = safetyColors[i];
            int time = walkTimes[i];

            LinearLayout routeCard = new LinearLayout(this);
            routeCard.setOrientation(LinearLayout.VERTICAL);
            routeCard.setBackgroundResource(R.drawable.bg_card);
            int cardPad = dp(16);
            routeCard.setPadding(cardPad, cardPad, cardPad, cardPad);
            LinearLayout.LayoutParams rLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            rLp.bottomMargin = dp(10);
            routeCard.setLayoutParams(rLp);

            LinearLayout row1 = new LinearLayout(this);
            row1.setOrientation(LinearLayout.HORIZONTAL);
            row1.setGravity(Gravity.CENTER_VERTICAL);

            TextView tvBadge = new TextView(this);
            tvBadge.setText(label);
            tvBadge.setTextColor(getColor(R.color.white));
            tvBadge.setTextSize(14);
            tvBadge.setTypeface(null, android.graphics.Typeface.BOLD);
            tvBadge.setGravity(Gravity.CENTER);
            tvBadge.setBackgroundResource(R.drawable.bg_icon_blue);
            LinearLayout.LayoutParams badgeLp = new LinearLayout.LayoutParams(dp(28), dp(28));
            badgeLp.rightMargin = dp(10);
            tvBadge.setLayoutParams(badgeLp);
            row1.addView(tvBadge);

            TextView tvRouteName = new TextView(this);
            tvRouteName.setText(shelter.getName());
            tvRouteName.setTextColor(getColor(R.color.white));
            tvRouteName.setTextSize(16);
            tvRouteName.setTypeface(null, android.graphics.Typeface.BOLD);
            LinearLayout.LayoutParams nameLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
            tvRouteName.setLayoutParams(nameLp);
            row1.addView(tvRouteName);

            TextView tvSafety = new TextView(this);
            tvSafety.setText(getString(safetyStrings[i]));
            tvSafety.setTextColor(getColor(safetyColor));
            tvSafety.setTextSize(13);
            row1.addView(tvSafety);
            routeCard.addView(row1);

            TextView tvDetails = new TextView(this);
            tvDetails.setText(String.format(getString(R.string.route_detail_fmt),
                    shelter.getDistance(), time, shelter.getAddress(),
                    shelter.getCurrentOccupancy(), shelter.getCapacity()));
            tvDetails.setTextColor(getColor(R.color.slate_400));
            tvDetails.setTextSize(12);
            LinearLayout.LayoutParams detLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            detLp.topMargin = dp(6);
            tvDetails.setLayoutParams(detLp);
            routeCard.addView(tvDetails);

            ProgressBar pb = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
            pb.setMax(shelter.getCapacity());
            pb.setProgress(shelter.getCurrentOccupancy());
            int capPercent = (int) ((float) shelter.getCurrentOccupancy() / shelter.getCapacity() * 100);
            int barColor = capPercent > 90 ? getColor(R.color.red_500) :
                           capPercent > 70 ? getColor(R.color.amber_500) : getColor(R.color.green_400);
            pb.setProgressTintList(android.content.res.ColorStateList.valueOf(barColor));
            pb.setProgressBackgroundTintList(android.content.res.ColorStateList.valueOf(getColor(R.color.slate_700)));
            LinearLayout.LayoutParams pbLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, dp(4));
            pbLp.topMargin = dp(8);
            pb.setLayoutParams(pbLp);
            routeCard.addView(pb);

            Button btnNav = new Button(this);
            btnNav.setText(getString(R.string.start_navigate));
            btnNav.setTextColor(getColor(R.color.white));
            btnNav.setBackgroundResource(R.drawable.bg_button_primary);
            btnNav.setAllCaps(false);
            btnNav.setTextSize(14);
            LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, dp(38));
            btnLp.topMargin = dp(10);
            btnNav.setLayoutParams(btnLp);
            final String shelterName = shelter.getName();
            btnNav.setOnClickListener(v ->
                    android.widget.Toast.makeText(this, String.format(getString(R.string.navigating_to), shelterName), android.widget.Toast.LENGTH_LONG).show());
            routeCard.addView(btnNav);

            routesContainer.addView(routeCard);
        }
    }

    private void addDangerCard(LinearLayout container, String title, String desc, String level) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setBackgroundResource(R.drawable.bg_alert_red);
        card.setGravity(Gravity.CENTER_VERTICAL);
        int p = dp(14);
        card.setPadding(p, p, p, p);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(8);
        card.setLayoutParams(lp);

        LinearLayout textBlock = new LinearLayout(this);
        textBlock.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams tbLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        textBlock.setLayoutParams(tbLp);

        TextView tvTitle = new TextView(this);
        tvTitle.setText(title);
        tvTitle.setTextColor(getColor(R.color.white));
        tvTitle.setTextSize(15);
        tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
        textBlock.addView(tvTitle);

        TextView tvDesc = new TextView(this);
        tvDesc.setText(desc);
        tvDesc.setTextColor(getColor(R.color.slate_300));
        tvDesc.setTextSize(12);
        LinearLayout.LayoutParams dLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        dLp.topMargin = dp(2);
        tvDesc.setLayoutParams(dLp);
        textBlock.addView(tvDesc);

        card.addView(textBlock);

        TextView tvLevel = new TextView(this);
        tvLevel.setText(level);
        tvLevel.setTextColor(getColor(R.color.red_500));
        tvLevel.setTextSize(13);
        tvLevel.setTypeface(null, android.graphics.Typeface.BOLD);
        card.addView(tvLevel);

        container.addView(card);
    }
}
