package com.warrescue.app.fragment;

import android.animation.ValueAnimator;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;

import com.warrescue.app.R;
import com.warrescue.app.activity.AlertSettingsActivity;
import com.warrescue.app.activity.AIMonitorHistoryActivity;
import com.warrescue.app.activity.AnnouncementDetailActivity;
import com.warrescue.app.activity.AnnouncementListActivity;
import com.warrescue.app.activity.CityAlertActivity;
import com.warrescue.app.activity.SimulationActivity;
import com.warrescue.app.activity.RoutePlanActivity;
import com.warrescue.app.activity.ShelterDetailActivity;
import com.warrescue.app.activity.FamilySettingsActivity;
import com.warrescue.app.model.Announcement;
import com.warrescue.app.model.Shelter;
import com.warrescue.app.data.DataRepository;
import com.warrescue.app.util.SessionManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class DashboardFragment extends Fragment {

    private static final long TRIGGER_DURATION = 3000; // 3 seconds

    private TextView tvCurrentTime, tvShelterCount, tvCityAlertStatus, tvCityAlertHint;
    private TextView btnCityAlertTrigger;
    private ProgressBar pbTriggerProgress;
    private LinearLayout announcementList;
    private TextView tvNoAnnouncements;
    private Handler timeHandler;
    private Runnable timeRunnable;

    // City alert trigger state
    private Handler triggerHandler;
    private Runnable triggerCompleteRunnable;
    private ValueAnimator progressAnimator;
    private boolean isTriggering = false;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_dashboard, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        initViews(view);
        loadData();
        startClock();
    }

    private void initViews(View view) {
        tvCurrentTime = view.findViewById(R.id.tvCurrentTime);
        tvShelterCount = view.findViewById(R.id.tvShelterCount);
        tvCityAlertStatus = view.findViewById(R.id.tvCityAlertStatus);
        tvCityAlertHint = view.findViewById(R.id.tvCityAlertHint);
        btnCityAlertTrigger = view.findViewById(R.id.btnCityAlertTrigger);
        pbTriggerProgress = view.findViewById(R.id.pbTriggerProgress);
        announcementList = view.findViewById(R.id.announcementList);
        tvNoAnnouncements = view.findViewById(R.id.tvNoAnnouncements);

        triggerHandler = new Handler(Looper.getMainLooper());

        // "View All" announcements -> navigate to announcement list page
        view.findViewById(R.id.btnViewAnnouncements).setOnClickListener(v ->
                startActivity(new Intent(requireContext(), AnnouncementListActivity.class)));

        // Quick action buttons
        view.findViewById(R.id.btnSimulation).setOnClickListener(v ->
                startActivity(new Intent(requireContext(), SimulationActivity.class)));

        view.findViewById(R.id.btnRoute).setOnClickListener(v ->
                startActivity(new Intent(requireContext(), RoutePlanActivity.class)));

        view.findViewById(R.id.btnShelters).setOnClickListener(v ->
                startActivity(new Intent(requireContext(), ShelterDetailActivity.class)));

        view.findViewById(R.id.btnAIMonitor).setOnClickListener(v ->
                startActivity(new Intent(requireContext(), AIMonitorHistoryActivity.class)));

        view.findViewById(R.id.btnViewFamily).setOnClickListener(v ->
                startActivity(new Intent(requireContext(), FamilySettingsActivity.class)));

        view.findViewById(R.id.btnSettings).setOnClickListener(v -> {
            if (getActivity() != null) {
                com.google.android.material.bottomnavigation.BottomNavigationView nav =
                        getActivity().findViewById(R.id.bottomNav);
                if (nav != null) nav.setSelectedItemId(R.id.nav_settings);
            }
        });

        // City Alert card click -> navigate to detail page
        view.findViewById(R.id.cityAlertCard).setOnClickListener(v ->
                startActivity(new Intent(requireContext(), CityAlertActivity.class)));

        // City Alert trigger button - long press 3 seconds
        setupTriggerButton();
    }

    private void setupTriggerButton() {
        triggerCompleteRunnable = () -> {
            isTriggering = false;
            btnCityAlertTrigger.setText(R.string.city_alert_triggered_success);
            pbTriggerProgress.setVisibility(View.GONE);
            Toast.makeText(requireContext(), getString(R.string.city_alert_triggered_success), Toast.LENGTH_LONG).show();

            // Submit trigger to backend
            submitCityAlertTrigger();

            // Reset button after 2 seconds
            triggerHandler.postDelayed(() -> {
                if (isAdded()) {
                    btnCityAlertTrigger.setText(R.string.city_alert_long_press);
                    tvCityAlertHint.setText(R.string.city_alert_trigger_hint);
                }
            }, 2000);
        };

        btnCityAlertTrigger.setOnTouchListener((v, event) -> {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    startTrigger();
                    return true;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    cancelTrigger();
                    return true;
            }
            return false;
        });
    }

    private void startTrigger() {
        isTriggering = true;
        btnCityAlertTrigger.setText(R.string.city_alert_triggering);
        tvCityAlertHint.setText(R.string.city_alert_hold_to_trigger);
        pbTriggerProgress.setVisibility(View.VISIBLE);
        pbTriggerProgress.setProgress(0);

        // Animate progress bar over 3 seconds
        progressAnimator = ValueAnimator.ofInt(0, 100);
        progressAnimator.setDuration(TRIGGER_DURATION);
        progressAnimator.addUpdateListener(animation ->
                pbTriggerProgress.setProgress((int) animation.getAnimatedValue()));
        progressAnimator.start();

        // Complete trigger after 3 seconds
        triggerHandler.postDelayed(triggerCompleteRunnable, TRIGGER_DURATION);
    }

    private void cancelTrigger() {
        if (isTriggering) {
            isTriggering = false;
            triggerHandler.removeCallbacks(triggerCompleteRunnable);
            if (progressAnimator != null) {
                progressAnimator.cancel();
            }
            pbTriggerProgress.setVisibility(View.GONE);
            pbTriggerProgress.setProgress(0);
            btnCityAlertTrigger.setText(R.string.city_alert_long_press);
            tvCityAlertHint.setText(R.string.city_alert_trigger_hint);
        }
    }

    private void submitCityAlertTrigger() {
        if (!isAdded()) return;
        SessionManager sm = new SessionManager(requireContext());
        String userId = sm.getUserId();
        if (userId == null || userId.isEmpty()) return;

        try {
            JSONObject trigger = new JSONObject();
            trigger.put("user_id", userId);
            trigger.put("city", "Kyiv");
            trigger.put("country", "Ukraine");
            trigger.put("trigger_rank", 1);

            DataRepository.getCityAlerts(null, new DataRepository.DataCallback<JSONArray>() {
                @Override
                public void onData(JSONArray alerts) {
                    try {
                        if (alerts.length() > 0) {
                            trigger.put("alert_id", alerts.optJSONObject(0).optString("id"));
                        }
                    } catch (Exception ignored) {}
                    doSubmitTrigger(trigger);
                }
                @Override
                public void onError(String e) {
                    doSubmitTrigger(trigger);
                }
            });
        } catch (Exception ignored) {}
    }

    private void doSubmitTrigger(JSONObject trigger) {
        DataRepository.submitCityAlertTrigger(trigger, new DataRepository.DataCallback<JSONObject>() {
            @Override
            public void onData(JSONObject result) {
                if (isAdded()) {
                    loadCityAlertStatus();
                }
            }
            @Override
            public void onError(String error) {
                android.util.Log.w("DashboardFragment", "City alert trigger failed: " + error);
            }
        });
    }

    private void loadCityAlertStatus() {
        DataRepository.getCityAlerts(null, new DataRepository.DataCallback<JSONArray>() {
            @Override
            public void onData(JSONArray alerts) {
                if (!isAdded()) return;
                if (alerts.length() > 0) {
                    JSONObject latest = alerts.optJSONObject(0);
                    int userCount = latest.optInt("user_count", 0);
                    boolean confirmed = latest.optBoolean("is_confirmed", false);
                    if (confirmed) {
                        tvCityAlertStatus.setText(R.string.city_alert_triggered_success);
                    } else if (userCount > 0) {
                        tvCityAlertStatus.setText(String.format(getString(R.string.city_alert_nearby_count), userCount));
                    } else {
                        tvCityAlertStatus.setText(R.string.city_alert_no_active);
                    }
                }
            }
            @Override
            public void onError(String error) {}
        });
    }

    private void loadData() {
        // City alert status - load from backend
        tvCityAlertStatus.setText(getString(R.string.city_alert_no_active));
        loadCityAlertStatus();

        // Load shelters asynchronously
        DataRepository.getShelters(requireContext(), new DataRepository.DataCallback<List<Shelter>>() {
            @Override
            public void onData(List<Shelter> shelters) {
                if (!isAdded()) return;
                long openShelters = shelters.stream().filter(s -> "open".equals(s.getStatus())).count();
                tvShelterCount.setText(openShelters + " " + getString(R.string.available));
            }
            @Override
            public void onError(String error) {
                if (!isAdded()) return;
                tvShelterCount.setText("-- " + getString(R.string.available));
            }
        });

        // Load announcements asynchronously
        loadAnnouncements();
    }

    private void loadAnnouncements() {
        DataRepository.getAnnouncements(requireContext(), new DataRepository.DataCallback<List<Announcement>>() {
            @Override
            public void onData(List<Announcement> announcements) {
                if (!isAdded()) return;
                renderAnnouncements(announcements);
            }
            @Override
            public void onError(String error) {
                if (!isAdded()) return;
                renderAnnouncements(new ArrayList<>());
            }
        });
    }

    private void renderAnnouncements(List<Announcement> announcements) {
        announcementList.removeAllViews();

        if (announcements.isEmpty()) {
            tvNoAnnouncements.setVisibility(View.VISIBLE);
            announcementList.setVisibility(View.GONE);
            return;
        }

        tvNoAnnouncements.setVisibility(View.GONE);
        announcementList.setVisibility(View.VISIBLE);

        for (Announcement ann : announcements) {
            LinearLayout card = new LinearLayout(requireContext());
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(dp(12), dp(10), dp(12), dp(10));
            card.setBackgroundResource(R.drawable.bg_card);

            LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            cardParams.bottomMargin = dp(8);
            card.setLayoutParams(cardParams);

            // Type dot + Title row
            LinearLayout titleRow = new LinearLayout(requireContext());
            titleRow.setOrientation(LinearLayout.HORIZONTAL);
            titleRow.setGravity(android.view.Gravity.CENTER_VERTICAL);

            View dot = new View(requireContext());
            int dotSize = dp(8);
            LinearLayout.LayoutParams dotParams = new LinearLayout.LayoutParams(dotSize, dotSize);
            dotParams.setMarginEnd(dp(8));
            dot.setLayoutParams(dotParams);

            int dotColor;
            switch (ann.getType()) {
                case "reward":
                    dotColor = ContextCompat.getColor(requireContext(), R.color.amber_400);
                    break;
                case "subscription":
                    dotColor = ContextCompat.getColor(requireContext(), R.color.blue_400);
                    break;
                default:
                    dotColor = ContextCompat.getColor(requireContext(), R.color.slate_400);
                    break;
            }
            dot.setBackgroundColor(dotColor);
            titleRow.addView(dot);

            TextView tvTitle = new TextView(requireContext());
            tvTitle.setText(ann.getTitle());
            tvTitle.setTextColor(ContextCompat.getColor(requireContext(), R.color.white));
            tvTitle.setTextSize(13);
            tvTitle.setMaxLines(1);
            tvTitle.setEllipsize(android.text.TextUtils.TruncateAt.END);
            LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                    0, LinearLayout.LayoutParams.WRAP_CONTENT, 1);
            tvTitle.setLayoutParams(titleParams);
            titleRow.addView(tvTitle);

            card.addView(titleRow);

            if (ann.getContent() != null && !ann.getContent().isEmpty()) {
                TextView tvContent = new TextView(requireContext());
                tvContent.setText(ann.getContent());
                tvContent.setTextColor(ContextCompat.getColor(requireContext(), R.color.slate_400));
                tvContent.setTextSize(11);
                tvContent.setMaxLines(1);
                tvContent.setEllipsize(android.text.TextUtils.TruncateAt.END);
                LinearLayout.LayoutParams contentParams = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                contentParams.topMargin = dp(4);
                tvContent.setLayoutParams(contentParams);
                card.addView(tvContent);
            }

            // Click -> navigate to announcement detail page
            card.setClickable(true);
            card.setFocusable(true);
            card.setOnClickListener(v -> {
                Intent intent = new Intent(requireContext(), AnnouncementDetailActivity.class);
                intent.putExtra("ann_id", ann.getId());
                intent.putExtra("ann_title", ann.getTitle());
                intent.putExtra("ann_content", ann.getContent());
                intent.putExtra("ann_type", ann.getType());
                intent.putExtra("ann_created_at", ann.getCreatedAt());
                startActivity(intent);
            });

            announcementList.addView(card);
        }
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density);
    }

    private void startClock() {
        timeHandler = new Handler(Looper.getMainLooper());
        timeRunnable = new Runnable() {
            @Override
            public void run() {
                SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss", Locale.getDefault());
                tvCurrentTime.setText(sdf.format(new Date()));
                timeHandler.postDelayed(this, 1000);
            }
        };
        timeHandler.post(timeRunnable);
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        if (timeHandler != null && timeRunnable != null) {
            timeHandler.removeCallbacks(timeRunnable);
        }
        cancelTrigger();
    }
}
