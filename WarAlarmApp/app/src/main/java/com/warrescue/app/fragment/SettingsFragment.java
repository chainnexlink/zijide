package com.warrescue.app.fragment;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;

import com.warrescue.app.R;
import com.warrescue.app.activity.AuthActivity;
import com.warrescue.app.activity.EmergencyProfileActivity;
import com.warrescue.app.activity.FamilySettingsActivity;
import com.warrescue.app.activity.MainActivity;
import com.warrescue.app.activity.MutualAidActivity;
import com.warrescue.app.activity.NotificationSettingsActivity;
import com.warrescue.app.activity.AlertSettingsActivity;
import com.warrescue.app.activity.PointsActivity;
import com.warrescue.app.activity.ProfileEditActivity;
import com.warrescue.app.activity.SubscriptionActivity;
import com.warrescue.app.data.DataRepository;
import com.warrescue.app.util.LocaleHelper;
import com.warrescue.app.util.SessionManager;

import org.json.JSONObject;

public class SettingsFragment extends Fragment {

    private SessionManager sessionManager;
    private TextView tvLanguage;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_settings, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        sessionManager = new SessionManager(requireContext());

        tvLanguage = view.findViewById(R.id.tvLanguage);
        updateLanguageDisplay();

        // Language picker
        view.findViewById(R.id.btnLanguage).setOnClickListener(v -> showLanguagePicker());

        // Profile
        view.findViewById(R.id.btnProfile).setOnClickListener(v ->
                startActivity(new Intent(requireContext(), ProfileEditActivity.class)));

        // Security (placeholder)
        view.findViewById(R.id.btnSecurity).setOnClickListener(v ->
                startActivity(new Intent(requireContext(), NotificationSettingsActivity.class)));

        // Subscription
        view.findViewById(R.id.btnSubscription).setOnClickListener(v ->
                startActivity(new Intent(requireContext(), SubscriptionActivity.class)));

        // Points
        view.findViewById(R.id.btnPoints).setOnClickListener(v ->
                startActivity(new Intent(requireContext(), PointsActivity.class)));

        // Load points balance
        loadPointsBalance(view);

        // Emergency Profile
        view.findViewById(R.id.btnEmergencyProfile).setOnClickListener(v ->
                startActivity(new Intent(requireContext(), EmergencyProfileActivity.class)));

        // Family Group
        view.findViewById(R.id.btnFamilyGroup).setOnClickListener(v ->
                startActivity(new Intent(requireContext(), FamilySettingsActivity.class)));

        // Mutual Aid
        view.findViewById(R.id.btnMutualAid).setOnClickListener(v ->
                startActivity(new Intent(requireContext(), MutualAidActivity.class)));

        // Logout
        view.findViewById(R.id.btnLogout).setOnClickListener(v -> showLogoutDialog());
    }

    private void updateLanguageDisplay() {
        String currentLang = sessionManager.getLanguage();
        tvLanguage.setText(LocaleHelper.getLanguageDisplayName(currentLang));
    }

    private void showLanguagePicker() {
        String[] langCodes = LocaleHelper.getSupportedLanguages();
        String[] langNames = LocaleHelper.getSupportedLanguageNames();
        String currentLang = sessionManager.getLanguage();

        int selectedIndex = 0;
        for (int i = 0; i < langCodes.length; i++) {
            if (langCodes[i].equals(currentLang)) {
                selectedIndex = i;
                break;
            }
        }

        new AlertDialog.Builder(requireContext(), R.style.Theme_WarAlarm_Dialog)
                .setTitle(R.string.select_language)
                .setSingleChoiceItems(langNames, selectedIndex, (dialog, which) -> {
                    String newLang = langCodes[which];
                    if (!newLang.equals(currentLang)) {
                        sessionManager.setLanguage(newLang);
                        dialog.dismiss();
                        // Restart entire app to apply new locale to all components
                        if (getActivity() != null) {
                            Intent intent = new Intent(getActivity(), MainActivity.class);
                            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                            intent.putExtra(MainActivity.EXTRA_NAV_TAB, MainActivity.TAB_SETTINGS);
                            getActivity().startActivity(intent);
                            getActivity().finish();
                        }
                    } else {
                        dialog.dismiss();
                    }
                })
                .setNegativeButton(R.string.cancel, null)
                .show();
    }

    private void loadPointsBalance(View view) {
        TextView tvPoints = view.findViewById(R.id.tvPointsBalance);
        if (tvPoints == null) return;
        DataRepository.getPoints(requireContext(), new DataRepository.DataCallback<JSONObject>() {
            @Override
            public void onData(JSONObject data) {
                if (!isAdded()) return;
                tvPoints.setText(String.valueOf(data.optInt("balance", 0)));
            }
            @Override
            public void onError(String error) {
                if (!isAdded()) return;
                tvPoints.setText("0");
            }
        });
    }

    private void showLogoutDialog() {
        new AlertDialog.Builder(requireContext(), R.style.Theme_WarAlarm_Dialog)
                .setTitle(R.string.confirm_logout)
                .setMessage(R.string.logout_desc)
                .setPositiveButton(R.string.confirm, (dialog, which) -> {
                    sessionManager.logout();
                    Intent intent = new Intent(requireContext(), AuthActivity.class);
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                    startActivity(intent);
                    requireActivity().finish();
                })
                .setNegativeButton(R.string.cancel, null)
                .show();
    }
}
