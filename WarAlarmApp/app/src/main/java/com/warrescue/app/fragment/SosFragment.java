package com.warrescue.app.fragment;

import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.warrescue.app.R;
import com.warrescue.app.data.DataRepository;
import com.warrescue.app.network.TwilioService;
import com.warrescue.app.util.SessionManager;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class SosFragment extends Fragment {

    private FrameLayout sosButton;
    private View pulseRing;
    private TextView sosText;
    private TextView sosHint;
    private LinearLayout statusCard;
    private TextView statusTitle;
    private TextView statusDesc;
    private TextView statusTime;
    private TextView btnCancelSos;

    private boolean isSosActive = false;
    private boolean isLongPressing = false;
    private CountDownTimer longPressTimer;
    private AnimatorSet pulseAnimator;
    private Handler handler = new Handler(Looper.getMainLooper());
    private TwilioService twilioService;
    private String currentSosRecordId;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_sos, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        sosButton = view.findViewById(R.id.sosButton);
        pulseRing = view.findViewById(R.id.pulseRing);
        sosText = view.findViewById(R.id.sosText);
        sosHint = view.findViewById(R.id.sosHint);
        statusCard = view.findViewById(R.id.statusCard);
        statusTitle = view.findViewById(R.id.statusTitle);
        statusDesc = view.findViewById(R.id.statusDesc);
        statusTime = view.findViewById(R.id.statusTime);
        btnCancelSos = view.findViewById(R.id.btnCancelSos);

        setupSosButton();
        setupCancelButton();
        startPulseAnimation();

        // Initialize Twilio service
        twilioService = new TwilioService();
    }

    private void setupSosButton() {
        sosButton.setOnTouchListener((v, event) -> {
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    startLongPress();
                    return true;
                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_CANCEL:
                    cancelLongPress();
                    return true;
            }
            return false;
        });
    }

    private void startLongPress() {
        if (isSosActive) return;
        isLongPressing = true;

        // Scale down animation on press
        sosButton.animate().scaleX(0.92f).scaleY(0.92f).setDuration(150).start();

        // Start countdown - 3 seconds
        sosText.setText("3");
        sosHint.setText(getString(R.string.sos_sending));

        longPressTimer = new CountDownTimer(3000, 1000) {
            int count = 3;

            @Override
            public void onTick(long millisUntilFinished) {
                count--;
                if (count > 0 && isLongPressing) {
                    sosText.setText(String.valueOf(count));
                }
            }

            @Override
            public void onFinish() {
                if (isLongPressing) {
                    triggerSos();
                }
            }
        }.start();
    }

    private void cancelLongPress() {
        isLongPressing = false;
        if (longPressTimer != null) {
            longPressTimer.cancel();
        }

        // Scale back
        sosButton.animate().scaleX(1f).scaleY(1f).setDuration(150).start();

        if (!isSosActive) {
            sosText.setText("SOS");
            sosHint.setText(getString(R.string.sos_hold_trigger));
        }
    }

    private void triggerSos() {
        isSosActive = true;
        isLongPressing = false;

        // Button feedback
        sosButton.animate().scaleX(1f).scaleY(1f).setDuration(200).start();
        sosText.setText("!");
        sosText.setTextSize(52);
        sosHint.setText(getString(R.string.sos_activated));

        // Vibrate effect (visual pulse)
        startActivePulse();

        // Show status card
        statusCard.setVisibility(View.VISIBLE);
        statusCard.setAlpha(0f);
        statusCard.animate().alpha(1f).setDuration(300).start();

        SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss", Locale.getDefault());
        statusTime.setText(sdf.format(new Date()));

        // Create SOS record in backend
        if (com.warrescue.app.network.SupabaseClient.getInstance().isConfigured()) {
            try {
                SessionManager sm = new SessionManager(requireContext());
                String userId = sm.getUserId();
                if (userId != null && !userId.isEmpty()) {
                    JSONObject record = new JSONObject();
                    record.put("user_id", userId);
                    record.put("status", "pending");
                    record.put("trigger_method", "long_press");
                    record.put("stage", 1);
                    record.put("latitude", 50.4501);
                    record.put("longitude", 30.5234);
                    DataRepository.createSosRecord(record, new DataRepository.DataCallback<JSONObject>() {
                        @Override
                        public void onData(JSONObject data) {
                            try {
                                currentSosRecordId = data.getString("id");
                                android.util.Log.d("SOS", "Record created: " + currentSosRecordId);
                            } catch (Exception ignored) {}
                        }
                        @Override
                        public void onError(String error) {
                            android.util.Log.w("SOS", "Create record failed: " + error);
                        }
                    });
                }
            } catch (Exception ignored) {}
        }

        // Send SMS via Twilio if configured
        statusDesc.setText(getString(R.string.sos_action_family_desc));
        if (twilioService.isConfigured()) {
            String alertMsg = getString(R.string.sos_emergency) + " - GPS: 50.4501, 30.5234";
            twilioService.sendEmergencySMS(
                    new String[]{"+380501234567"}, // Demo family numbers
                    alertMsg,
                    new TwilioService.TwilioCallback() {
                        @Override
                        public void onSuccess(String messageSid) {
                            if (isSosActive && isAdded()) {
                                statusDesc.setText(getString(R.string.sos_action_family) + " ✓ (SMS: " + messageSid + ")");
                            }
                        }
                        @Override
                        public void onError(String error) {
                            if (isSosActive && isAdded()) {
                                statusDesc.setText(getString(R.string.sos_action_family) + " (Push)");
                            }
                        }
                    }
            );
        } else {
            // Fallback: simulate notification without Twilio
            handler.postDelayed(() -> {
                if (isSosActive && isAdded()) {
                    statusDesc.setText(getString(R.string.sos_action_family) + " ✓");
                }
            }, 2000);
        }

        handler.postDelayed(() -> {
            if (isSosActive && isAdded()) {
                statusDesc.setText(getString(R.string.sos_action_rescue_desc));
            }
        }, 4000);

        Toast.makeText(requireContext(), getString(R.string.sos_activated), Toast.LENGTH_LONG).show();
    }

    private void setupCancelButton() {
        btnCancelSos.setOnClickListener(v -> {
            new androidx.appcompat.app.AlertDialog.Builder(requireContext(), R.style.Theme_WarAlarm_Dialog)
                    .setTitle(R.string.sos_cancel)
                    .setMessage(R.string.sos_cancel_confirm)
                    .setPositiveButton(R.string.confirm, (dialog, which) -> cancelSos())
                    .setNegativeButton(R.string.cancel, null)
                    .show();
        });
    }

    private void cancelSos() {
        isSosActive = false;

        // Update backend SOS record to cancelled
        if (currentSosRecordId != null && com.warrescue.app.network.SupabaseClient.getInstance().isConfigured()) {
            try {
                JSONObject updates = new JSONObject();
                updates.put("status", "cancelled");
                DataRepository.updateSosRecord(currentSosRecordId, updates, new DataRepository.DataCallback<JSONObject>() {
                    @Override
                    public void onData(JSONObject data) { }
                    @Override
                    public void onError(String error) { }
                });
            } catch (Exception ignored) {}
            currentSosRecordId = null;
        }

        sosText.setText("SOS");
        sosText.setTextSize(42);
        sosHint.setText(getString(R.string.sos_hold_trigger));

        statusCard.animate().alpha(0f).setDuration(200).withEndAction(() -> {
            statusCard.setVisibility(View.GONE);
        }).start();

        // Reset pulse animation
        stopActivePulse();
        startPulseAnimation();

        Toast.makeText(requireContext(), getString(R.string.sos_resolved), Toast.LENGTH_SHORT).show();
    }

    private void startPulseAnimation() {
        if (pulseAnimator != null) {
            pulseAnimator.cancel();
        }

        ObjectAnimator scaleX = ObjectAnimator.ofFloat(pulseRing, "scaleX", 0.85f, 1.1f);
        ObjectAnimator scaleY = ObjectAnimator.ofFloat(pulseRing, "scaleY", 0.85f, 1.1f);
        ObjectAnimator alpha = ObjectAnimator.ofFloat(pulseRing, "alpha", 0.4f, 0.1f);

        pulseAnimator = new AnimatorSet();
        pulseAnimator.playTogether(scaleX, scaleY, alpha);
        pulseAnimator.setDuration(2000);
        pulseAnimator.setInterpolator(new AccelerateDecelerateInterpolator());

        pulseAnimator.addListener(new android.animation.AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(android.animation.Animator animation) {
                if (isAdded() && !isSosActive) {
                    pulseRing.setScaleX(0.85f);
                    pulseRing.setScaleY(0.85f);
                    pulseRing.setAlpha(0.4f);
                    pulseAnimator.start();
                }
            }
        });
        pulseAnimator.start();
    }

    private void startActivePulse() {
        if (pulseAnimator != null) {
            pulseAnimator.cancel();
        }

        ObjectAnimator scaleX = ObjectAnimator.ofFloat(pulseRing, "scaleX", 0.9f, 1.3f);
        ObjectAnimator scaleY = ObjectAnimator.ofFloat(pulseRing, "scaleY", 0.9f, 1.3f);
        ObjectAnimator alpha = ObjectAnimator.ofFloat(pulseRing, "alpha", 0.5f, 0f);

        pulseAnimator = new AnimatorSet();
        pulseAnimator.playTogether(scaleX, scaleY, alpha);
        pulseAnimator.setDuration(1000);
        pulseAnimator.setInterpolator(new AccelerateDecelerateInterpolator());

        pulseAnimator.addListener(new android.animation.AnimatorListenerAdapter() {
            @Override
            public void onAnimationEnd(android.animation.Animator animation) {
                if (isAdded() && isSosActive) {
                    pulseRing.setScaleX(0.9f);
                    pulseRing.setScaleY(0.9f);
                    pulseRing.setAlpha(0.5f);
                    pulseAnimator.start();
                }
            }
        });
        pulseAnimator.start();
    }

    private void stopActivePulse() {
        if (pulseAnimator != null) {
            pulseAnimator.cancel();
        }
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        handler.removeCallbacksAndMessages(null);
        if (pulseAnimator != null) {
            pulseAnimator.cancel();
        }
        if (longPressTimer != null) {
            longPressTimer.cancel();
        }
    }
}
