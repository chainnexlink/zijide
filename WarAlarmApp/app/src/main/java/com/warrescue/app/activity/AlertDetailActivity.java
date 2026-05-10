package com.warrescue.app.activity;

import android.content.Context;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.warrescue.app.R;
import com.warrescue.app.util.LocaleHelper;

import java.util.HashMap;
import java.util.Map;

public class AlertDetailActivity extends AppCompatActivity {

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(LocaleHelper.onAttach(newBase));
    }

    private Map<String, Integer> getTypeLabels() {
        Map<String, Integer> map = new HashMap<>();
        map.put("air_strike", R.string.air_strike);
        map.put("artillery", R.string.artillery);
        map.put("conflict", R.string.conflict);
        map.put("curfew", R.string.curfew);
        map.put("chemical", R.string.chemical);
        map.put("other", R.string.other);
        return map;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_alert_detail);

        String title = getIntent().getStringExtra("alert_title");
        String description = getIntent().getStringExtra("alert_description");
        String severity = getIntent().getStringExtra("alert_severity");
        String type = getIntent().getStringExtra("alert_type");
        String city = getIntent().getStringExtra("alert_city");
        String country = getIntent().getStringExtra("alert_country");
        String time = getIntent().getStringExtra("alert_time");
        int reliability = getIntent().getIntExtra("alert_reliability", 85);
        double distance = getIntent().getDoubleExtra("alert_distance", 0);

        TextView tvTitle = findViewById(R.id.tvDetailTitle);
        TextView tvDesc = findViewById(R.id.tvDetailDesc);
        TextView tvSeverity = findViewById(R.id.tvDetailSeverity);
        TextView tvType = findViewById(R.id.tvDetailType);
        TextView tvLocation = findViewById(R.id.tvDetailLocation);
        TextView tvTime = findViewById(R.id.tvDetailTime);
        TextView tvReliability = findViewById(R.id.tvDetailReliability);
        TextView tvDistance = findViewById(R.id.tvDetailDistance);

        tvTitle.setText(title);
        tvDesc.setText(description);
        tvSeverity.setText(severity != null ? severity.toUpperCase() : "");
        Map<String, Integer> typeLabels = getTypeLabels();
        Integer typeRes = typeLabels.get(type);
        tvType.setText(typeRes != null ? getString(typeRes) : getString(R.string.other));
        tvLocation.setText(city + ", " + country);
        tvTime.setText(time);
        tvReliability.setText(getString(R.string.reliability) + ": " + reliability + "%");
        tvDistance.setText(distance > 0 ? getString(R.string.distance) + ": " + distance + "km" : "");

        // Severity color
        int colorRes;
        if ("red".equals(severity)) colorRes = R.color.red_500;
        else if ("orange".equals(severity)) colorRes = R.color.orange_500;
        else if ("yellow".equals(severity)) colorRes = R.color.yellow_500;
        else colorRes = R.color.slate_500;
        tvSeverity.setTextColor(getColor(colorRes));

        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
        findViewById(R.id.btnNavigate).setOnClickListener(v -> {
            startActivity(new android.content.Intent(this, RoutePlanActivity.class));
        });
    }
}
