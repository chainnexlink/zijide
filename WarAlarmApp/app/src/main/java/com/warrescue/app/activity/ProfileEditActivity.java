package com.warrescue.app.activity;

import android.content.Intent;
import android.content.SharedPreferences;
import android.text.InputType;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;

import com.warrescue.app.R;
import com.warrescue.app.data.DataRepository;
import com.warrescue.app.util.SessionManager;

public class ProfileEditActivity extends BaseDetailActivity {

    private EditText etNickname, etPhone, etEmail, etCity, etContactName, etContactPhone;
    private SessionManager sessionManager;

    @Override
    protected String getPageTitle() { return getString(R.string.profile); }

    @Override
    protected void buildContent(LinearLayout container) {
        sessionManager = new SessionManager(this);
        SharedPreferences sp = getSharedPreferences("profile", MODE_PRIVATE);

        etNickname = addInputField(container, getString(R.string.nickname), getString(R.string.hint_nickname), InputType.TYPE_CLASS_TEXT);
        etNickname.setText(sp.getString("nickname", getString(R.string.demo_user)));

        etPhone = addInputField(container, getString(R.string.phone_number), getString(R.string.hint_phone), InputType.TYPE_CLASS_PHONE);
        etPhone.setText(sp.getString("phone", "+380 50 123 4567"));

        etEmail = addInputField(container, getString(R.string.email), getString(R.string.hint_email), InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        etEmail.setText(sp.getString("email", "demo@warrescue.com"));

        etCity = addInputField(container, getString(R.string.city), getString(R.string.hint_city), InputType.TYPE_CLASS_TEXT);
        etCity.setText(sp.getString("city", getString(R.string.default_city)));

        addSectionTitle(container, getString(R.string.emergency_contact));

        etContactName = addInputField(container, getString(R.string.contact_name), getString(R.string.hint_name), InputType.TYPE_CLASS_TEXT);
        etContactName.setText(sp.getString("contact_name", getString(R.string.default_contact_name)));

        etContactPhone = addInputField(container, getString(R.string.contact_phone), getString(R.string.hint_phone_number), InputType.TYPE_CLASS_PHONE);
        etContactPhone.setText(sp.getString("contact_phone", "+380 67 987 6543"));

        Button btnSave = new Button(this);
        btnSave.setText(R.string.save);
        btnSave.setTextColor(getColor(R.color.white));
        btnSave.setBackgroundResource(R.drawable.bg_button_primary);
        btnSave.setAllCaps(false);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        lp.topMargin = dp(24);
        btnSave.setLayoutParams(lp);
        btnSave.setOnClickListener(v -> {
            sp.edit()
                .putString("nickname", etNickname.getText().toString())
                .putString("phone", etPhone.getText().toString())
                .putString("email", etEmail.getText().toString())
                .putString("city", etCity.getText().toString())
                .putString("contact_name", etContactName.getText().toString())
                .putString("contact_phone", etContactPhone.getText().toString())
                .apply();
            Toast.makeText(this, getString(R.string.profile_saved), Toast.LENGTH_SHORT).show();
            finish();
        });
        container.addView(btnSave);

        // Legal Links
        addSectionTitle(container, getString(R.string.legal_info));

        View privacyCard = addSettingCard(container,
                getString(R.string.privacy_policy), null, R.drawable.bg_icon_blue);
        privacyCard.setOnClickListener(v -> {
            Intent intent = new Intent(this, LegalPageActivity.class);
            intent.putExtra("type", "privacy");
            startActivity(intent);
        });

        View termsCard = addSettingCard(container,
                getString(R.string.terms_of_service), null, R.drawable.bg_icon_green);
        termsCard.setOnClickListener(v -> {
            Intent intent = new Intent(this, LegalPageActivity.class);
            intent.putExtra("type", "terms");
            startActivity(intent);
        });

        // Account Deletion Section
        if (!sessionManager.isGuestMode()) {
            addSectionTitle(container, getString(R.string.account_delete));

            Button btnDelete = new Button(this);
            btnDelete.setText(getString(R.string.account_delete));
            btnDelete.setTextColor(getColor(R.color.red_500));
            btnDelete.setBackgroundResource(R.drawable.bg_button_secondary);
            btnDelete.setAllCaps(false);
            btnDelete.setTextSize(14);
            LinearLayout.LayoutParams delLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
            delLp.topMargin = dp(8);
            delLp.bottomMargin = dp(32);
            btnDelete.setLayoutParams(delLp);
            btnDelete.setOnClickListener(v -> showDeleteAccountDialog());
            container.addView(btnDelete);
        }
    }

    private void showDeleteAccountDialog() {
        EditText input = new EditText(this);
        input.setHint(getString(R.string.account_delete_input_hint));
        input.setInputType(InputType.TYPE_CLASS_TEXT);
        int pad = dp(16);
        input.setPadding(pad, pad, pad, pad);

        new AlertDialog.Builder(this)
                .setTitle(getString(R.string.account_delete_title))
                .setMessage(getString(R.string.account_delete_message))
                .setView(input)
                .setPositiveButton(getString(R.string.account_delete_confirm), (dialog, which) -> {
                    String text = input.getText().toString().trim();
                    if ("DELETE".equals(text)) {
                        handleDeleteAccount();
                    } else {
                        Toast.makeText(this, getString(R.string.account_delete_input_wrong),
                                Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton(getString(R.string.cancel), null)
                .show();
    }

    private void handleDeleteAccount() {
        String userId = sessionManager.getUserId();

        // Delete from backend
        DataRepository.deleteUserAccount(userId, new DataRepository.DataCallback<Boolean>() {
            @Override
            public void onData(Boolean result) {
                android.util.Log.d("ProfileEdit", "Backend user data deleted");
            }

            @Override
            public void onError(String error) {
                android.util.Log.w("ProfileEdit", "Backend deletion partially failed: " + error);
            }
        });

        // Clear local data
        sessionManager.clearAllUserData();
        getSharedPreferences("profile", MODE_PRIVATE).edit().clear().apply();

        Toast.makeText(this, getString(R.string.account_delete_success), Toast.LENGTH_LONG).show();

        // Navigate to auth screen
        Intent intent = new Intent(this, AuthActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }
}
