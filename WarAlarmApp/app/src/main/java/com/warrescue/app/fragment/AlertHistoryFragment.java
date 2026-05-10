package com.warrescue.app.fragment;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.warrescue.app.R;
import com.warrescue.app.activity.AlertDetailActivity;
import com.warrescue.app.adapter.AlertAdapter;
import com.warrescue.app.model.Alert;
import com.warrescue.app.data.DataRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class AlertHistoryFragment extends Fragment implements AlertAdapter.OnAlertClickListener {

    private RecyclerView rvAlerts;
    private AlertAdapter adapter;
    private EditText etSearch;
    private List<Alert> allAlerts = new ArrayList<>();
    private String selectedSeverity = "all";

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_alert_history, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        rvAlerts = view.findViewById(R.id.rvAlerts);
        etSearch = view.findViewById(R.id.etSearch);

        adapter = new AlertAdapter(this);
        rvAlerts.setLayoutManager(new LinearLayoutManager(requireContext()));
        rvAlerts.setAdapter(adapter);

        // Load data from Supabase API
        DataRepository.getAlerts(requireContext(), new DataRepository.DataCallback<List<Alert>>() {
            @Override
            public void onData(List<Alert> data) {
                allAlerts = data;
                adapter.setAlerts(allAlerts);
            }
            @Override
            public void onError(String error) {}
        });

        // Search filter
        etSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) { filterAlerts(); }
            @Override public void afterTextChanged(Editable s) {}
        });

        // Severity chips
        setupChips(view);
    }

    private void setupChips(View view) {
        TextView chipAll = view.findViewById(R.id.chipAll);
        TextView chipRed = view.findViewById(R.id.chipRed);
        TextView chipOrange = view.findViewById(R.id.chipOrange);
        TextView chipYellow = view.findViewById(R.id.chipYellow);

        View.OnClickListener chipListener = v -> {
            // Reset all chips
            chipAll.setBackgroundResource(R.drawable.bg_chip);
            chipAll.setTextColor(requireContext().getColor(R.color.slate_400));
            chipRed.setBackgroundResource(R.drawable.bg_chip);
            chipRed.setTextColor(requireContext().getColor(R.color.slate_400));
            chipOrange.setBackgroundResource(R.drawable.bg_chip);
            chipOrange.setTextColor(requireContext().getColor(R.color.slate_400));
            chipYellow.setBackgroundResource(R.drawable.bg_chip);
            chipYellow.setTextColor(requireContext().getColor(R.color.slate_400));

            // Activate selected
            ((TextView) v).setBackgroundResource(R.drawable.bg_chip_selected);
            ((TextView) v).setTextColor(requireContext().getColor(R.color.white));

            int id = v.getId();
            if (id == R.id.chipAll) selectedSeverity = "all";
            else if (id == R.id.chipRed) selectedSeverity = "red";
            else if (id == R.id.chipOrange) selectedSeverity = "orange";
            else if (id == R.id.chipYellow) selectedSeverity = "yellow";

            filterAlerts();
        };

        chipAll.setOnClickListener(chipListener);
        chipRed.setOnClickListener(chipListener);
        chipOrange.setOnClickListener(chipListener);
        chipYellow.setOnClickListener(chipListener);
    }

    private void filterAlerts() {
        String query = etSearch.getText().toString().toLowerCase().trim();

        List<Alert> filtered = allAlerts.stream()
                .filter(a -> "all".equals(selectedSeverity) || selectedSeverity.equals(a.getSeverity()))
                .filter(a -> query.isEmpty()
                        || a.getTitle().toLowerCase().contains(query)
                        || a.getCity().toLowerCase().contains(query)
                        || a.getDescription().toLowerCase().contains(query))
                .collect(Collectors.toList());

        adapter.setAlerts(filtered);
    }

    @Override
    public void onAlertClick(Alert alert) {
        Intent intent = new Intent(requireContext(), AlertDetailActivity.class);
        intent.putExtra("alert_id", alert.getId());
        intent.putExtra("alert_title", alert.getTitle());
        intent.putExtra("alert_description", alert.getDescription());
        intent.putExtra("alert_severity", alert.getSeverity());
        intent.putExtra("alert_type", alert.getAlertType());
        intent.putExtra("alert_city", alert.getCity());
        intent.putExtra("alert_country", alert.getCountry());
        intent.putExtra("alert_time", alert.getCreatedAt());
        intent.putExtra("alert_reliability", alert.getReliabilityScore());
        intent.putExtra("alert_distance", alert.getDistance());
        startActivity(intent);
    }
}
