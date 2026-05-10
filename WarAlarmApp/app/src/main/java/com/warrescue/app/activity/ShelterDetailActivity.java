package com.warrescue.app.activity;

import android.content.Context;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.warrescue.app.R;
import com.warrescue.app.model.Shelter;
import com.warrescue.app.data.DataRepository;
import com.warrescue.app.util.LocaleHelper;

import java.util.List;

public class ShelterDetailActivity extends AppCompatActivity {

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(LocaleHelper.onAttach(newBase));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_generic);

        TextView tvTitle = findViewById(R.id.tvPageTitle);
        tvTitle.setText(R.string.shelters);
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());

        LinearLayout container = findViewById(R.id.contentContainer);

        // Load shelters asynchronously from Supabase API
        DataRepository.getShelters(this, new DataRepository.DataCallback<List<Shelter>>() {
            @Override
            public void onData(List<Shelter> shelters) {
                renderShelters(container, shelters);
            }
            @Override
            public void onError(String error) {
                // Show empty state
            }
        });
    }

    private void renderShelters(LinearLayout container, List<Shelter> shelters) {
        for (Shelter shelter : shelters) {
            View card = LayoutInflater.from(this).inflate(R.layout.item_shelter, container, false);

            TextView tvName = card.findViewById(R.id.tvShelterName);
            TextView tvAddress = card.findViewById(R.id.tvShelterAddress);
            TextView tvCapacity = card.findViewById(R.id.tvShelterCapacity);
            TextView tvDist = card.findViewById(R.id.tvShelterDistance);
            TextView tvStatus = card.findViewById(R.id.tvShelterStatus);

            tvName.setText(shelter.getName());
            tvAddress.setText(shelter.getAddress());
            tvCapacity.setText(shelter.getCurrentOccupancy() + "/" + shelter.getCapacity());
            tvDist.setText(shelter.getDistance() + "km");

            if ("open".equals(shelter.getStatus())) {
                tvStatus.setText(R.string.status_open);
                tvStatus.setTextColor(getColor(R.color.green_400));
                tvStatus.setBackgroundResource(R.drawable.bg_icon_green);
            } else {
                tvStatus.setText(R.string.status_full);
                tvStatus.setTextColor(getColor(R.color.red_500));
                tvStatus.setBackgroundResource(R.drawable.bg_icon_red);
            }

            container.addView(card);
        }
    }
}
