package com.warrescue.app.activity;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.text.Editable;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.TextWatcher;
import android.text.method.LinkMovementMethod;
import android.text.style.ClickableSpan;
import android.text.style.ForegroundColorSpan;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.warrescue.app.R;
import com.warrescue.app.util.LocaleHelper;
import com.warrescue.app.util.SessionManager;

import java.util.UUID;

public class AuthActivity extends AppCompatActivity {

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(LocaleHelper.onAttach(newBase));
    }

    private LinearLayout loginForm, registerForm;
    private LinearLayout phoneInputGroup, emailInputGroup;
    private Button btnLoginTab, btnRegisterTab;
    private Button btnPhoneMethod, btnEmailMethod;
    private Button btnLogin, btnGuestLogin, btnRegister;
    private Button btnGetCode, btnRegGetCode;
    private EditText etPhone, etVerificationCode, etInviteCode;
    private EditText etEmail, etPassword;
    private EditText etRegPhone, etRegCode, etRegInviteCode;
    private TextView tvError, tvRegError;
    private TextView tvCodeCountdown, tvRegCodeCountdown;
    private CheckBox cbRegAgree;
    private TextView tvRegAgreement, tvLoginAgreement;
    private Spinner spinnerCountryCode, spinnerRegCountryCode;

    private boolean isLoginTab = true;
    private boolean isPhoneMethod = true;
    private SessionManager sessionManager;
    private CountDownTimer loginCodeTimer;
    private CountDownTimer regCodeTimer;
    private boolean loginCodeSent = false;
    private boolean regCodeSent = false;

    private String simulatedLoginCode = "";
    private String simulatedRegCode = "";

    // Global country codes: code + country name
    private static final String[][] COUNTRY_CODES = {
        {"+86", "\u4e2d\u56fd"}, {"+852", "\u9999\u6e2f"}, {"+853", "\u6fb3\u95e8"}, {"+886", "\u53f0\u6e7e"},
        {"+81", "\u65e5\u672c"}, {"+82", "\u97e9\u56fd"}, {"+850", "\u671d\u9c9c"}, {"+976", "\u8499\u53e4"},
        {"+65", "\u65b0\u52a0\u5761"}, {"+60", "\u9a6c\u6765\u897f\u4e9a"}, {"+66", "\u6cf0\u56fd"}, {"+84", "\u8d8a\u5357"},
        {"+62", "\u5370\u5ea6\u5c3c\u897f\u4e9a"}, {"+63", "\u83f2\u5f8b\u5bbe"}, {"+95", "\u7f05\u7538"}, {"+855", "\u67ec\u57d4\u5be8"},
        {"+856", "\u8001\u631d"}, {"+673", "\u6587\u83b1"}, {"+670", "\u4e1c\u5e1d\u6c76"},
        {"+91", "\u5370\u5ea6"}, {"+92", "\u5df4\u57fa\u65af\u5766"}, {"+880", "\u5b5f\u52a0\u62c9\u56fd"}, {"+94", "\u65af\u91cc\u5170\u5361"},
        {"+977", "\u5c3c\u6cca\u5c14"}, {"+975", "\u4e0d\u4e39"}, {"+960", "\u9a6c\u5c14\u4ee3\u592b"}, {"+93", "\u963f\u5bcc\u6c57"},
        {"+7", "\u54c8\u8428\u514b\u65af\u5766"}, {"+998", "\u4e4c\u5179\u522b\u514b\u65af\u5766"}, {"+993", "\u571f\u5e93\u66fc\u65af\u5766"},
        {"+996", "\u5409\u5c14\u5409\u65af\u65af\u5766"}, {"+992", "\u5854\u5409\u514b\u65af\u5766"},
        {"+972", "\u4ee5\u8272\u5217"}, {"+970", "\u5df4\u52d2\u65af\u5766"}, {"+961", "\u9ece\u5df4\u5ae9"}, {"+962", "\u7ea6\u65e6"},
        {"+963", "\u53d9\u5229\u4e9a"}, {"+964", "\u4f0a\u62c9\u514b"}, {"+966", "\u6c99\u7279\u963f\u62c9\u4f2f"}, {"+971", "\u963f\u8054\u914b"},
        {"+974", "\u5361\u5854\u5c14"}, {"+965", "\u79d1\u5a01\u7279"}, {"+973", "\u5df4\u6797"}, {"+968", "\u963f\u66fc"},
        {"+967", "\u4e5f\u95e8"}, {"+98", "\u4f0a\u6717"}, {"+90", "\u571f\u8033\u5176"},
        {"+1", "\u7f8e\u56fd/\u52a0\u62ff\u5927"}, {"+52", "\u58a8\u897f\u54e5"},
        {"+502", "\u5371\u5730\u9a6c\u62c9"}, {"+503", "\u8428\u5c14\u74e6\u591a"}, {"+504", "\u6d2a\u90fd\u62c9\u65af"},
        {"+505", "\u5c3c\u52a0\u62c9\u74dc"}, {"+506", "\u54e5\u65af\u8fbe\u9ece\u52a0"}, {"+507", "\u5df4\u62ff\u9a6c"}, {"+501", "\u4f2f\u5229\u5179"},
        {"+53", "\u53e4\u5df4"}, {"+509", "\u6d77\u5730"}, {"+1809", "\u591a\u7c73\u5c3c\u52a0"}, {"+1876", "\u7259\u4e70\u52a0"},
        {"+55", "\u5df4\u897f"}, {"+54", "\u963f\u6839\u5ef7"}, {"+56", "\u667a\u5229"}, {"+57", "\u54e5\u4f26\u6bd4\u4e9a"},
        {"+58", "\u59d4\u5185\u745e\u62c9"}, {"+51", "\u79d8\u9c81"}, {"+593", "\u5384\u74dc\u591a\u5c14"}, {"+591", "\u73bb\u5229\u7ef4\u4e9a"},
        {"+595", "\u5df4\u62c9\u572d"}, {"+598", "\u4e4c\u62c9\u572d"}, {"+592", "\u572d\u4e9a\u90a3"}, {"+597", "\u82cf\u91cc\u5357"},
        {"+44", "\u82f1\u56fd"}, {"+33", "\u6cd5\u56fd"}, {"+49", "\u5fb7\u56fd"}, {"+39", "\u610f\u5927\u5229"},
        {"+34", "\u897f\u73ed\u7259"}, {"+351", "\u8461\u8404\u7259"}, {"+31", "\u8377\u5170"}, {"+32", "\u6bd4\u5229\u65f6"},
        {"+41", "\u745e\u58eb"}, {"+43", "\u5965\u5730\u5229"}, {"+353", "\u7231\u5c14\u5170"}, {"+352", "\u5362\u68ee\u5821"},
        {"+46", "\u745e\u5178"}, {"+47", "\u632a\u5a01"}, {"+45", "\u4e39\u9ea6"}, {"+358", "\u82ac\u5170"}, {"+354", "\u51b0\u5c9b"},
        {"+380", "\u4e4c\u514b\u5170"}, {"+48", "\u6ce2\u5170"}, {"+420", "\u6377\u514b"}, {"+421", "\u65af\u6d1b\u4f10\u514b"},
        {"+36", "\u5308\u7259\u5229"}, {"+40", "\u7f57\u9a6c\u5c3c\u4e9a"}, {"+359", "\u4fdd\u52a0\u5229\u4e9a"},
        {"+385", "\u514b\u7f57\u5730\u4e9a"}, {"+386", "\u65af\u6d1b\u6587\u5c3c\u4e9a"}, {"+381", "\u585e\u5c14\u7ef4\u4e9a"},
        {"+387", "\u6ce2\u9ed1"}, {"+382", "\u9ed1\u5c71"}, {"+389", "\u5317\u9a6c\u5176\u987f"},
        {"+355", "\u963f\u5c14\u5df4\u5c3c\u4e9a"}, {"+373", "\u6469\u5c14\u591a\u74e6"}, {"+375", "\u767d\u4fc4\u7f57\u65af"},
        {"+370", "\u7acb\u9676\u5b9b"}, {"+371", "\u62c9\u8131\u7ef4\u4e9a"}, {"+372", "\u7231\u6c99\u5c3c\u4e9a"},
        {"+30", "\u5e0c\u814a"}, {"+357", "\u585e\u6d66\u8def\u65af"}, {"+356", "\u9a6c\u8033\u4ed6"},
        {"+7", "\u4fc4\u7f57\u65af"}, {"+995", "\u683c\u9c81\u5409\u4e9a"}, {"+374", "\u4e9a\u7f8e\u5c3c\u4e9a"}, {"+994", "\u963f\u585e\u62dc\u7586"},
        {"+20", "\u57c3\u53ca"}, {"+212", "\u6469\u6d1b\u54e5"}, {"+213", "\u963f\u5c14\u53ca\u5229\u4e9a"}, {"+216", "\u7a81\u5c3c\u65af"},
        {"+218", "\u5229\u6bd4\u4e9a"}, {"+249", "\u82cf\u4e39"}, {"+211", "\u5357\u82cf\u4e39"},
        {"+234", "\u5c3c\u65e5\u5229\u4e9a"}, {"+233", "\u52a0\u7eb3"}, {"+225", "\u79d1\u7279\u8fea\u74e6"},
        {"+221", "\u585e\u5185\u52a0\u5c14"}, {"+254", "\u80af\u5c3c\u4e9a"}, {"+255", "\u5766\u6851\u5c3c\u4e9a"},
        {"+256", "\u4e4c\u5e72\u8fbe"}, {"+251", "\u57c3\u585e\u4fc4\u6bd4\u4e9a"}, {"+243", "\u521a\u679c(\u91d1)"},
        {"+27", "\u5357\u975e"}, {"+263", "\u6d25\u5df4\u5e03\u97e6"}, {"+260", "\u8d5e\u6bd4\u4e9a"},
        {"+261", "\u9a6c\u8fbe\u52a0\u65af\u52a0"}, {"+258", "\u83ab\u6851\u6bd4\u514b"}, {"+237", "\u5580\u9ea6\u9686"},
        {"+61", "\u6fb3\u5927\u5229\u4e9a"}, {"+64", "\u65b0\u897f\u5170"},
        {"+675", "\u5df4\u5e03\u4e9a\u65b0\u51e0\u5185\u4e9a"}, {"+679", "\u6590\u6d4e"},
        {"+685", "\u8428\u6469\u4e9a"}, {"+676", "\u6c64\u52a0"},
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_auth);

        sessionManager = new SessionManager(this);
        initViews();
        setupListeners();
        setupInputWatchers();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (loginCodeTimer != null) loginCodeTimer.cancel();
        if (regCodeTimer != null) regCodeTimer.cancel();
    }

    private void initViews() {
        loginForm = findViewById(R.id.loginForm);
        registerForm = findViewById(R.id.registerForm);
        phoneInputGroup = findViewById(R.id.phoneInputGroup);
        emailInputGroup = findViewById(R.id.emailInputGroup);

        btnLoginTab = findViewById(R.id.btnLoginTab);
        btnRegisterTab = findViewById(R.id.btnRegisterTab);
        btnPhoneMethod = findViewById(R.id.btnPhoneMethod);
        btnEmailMethod = findViewById(R.id.btnEmailMethod);

        btnLogin = findViewById(R.id.btnLogin);
        btnGuestLogin = findViewById(R.id.btnGuestLogin);
        btnRegister = findViewById(R.id.btnRegister);

        etPhone = findViewById(R.id.etPhone);
        etVerificationCode = findViewById(R.id.etVerificationCode);
        etInviteCode = findViewById(R.id.etInviteCode);
        etEmail = findViewById(R.id.etEmail);
        etPassword = findViewById(R.id.etPassword);
        btnGetCode = findViewById(R.id.btnGetCode);
        tvError = findViewById(R.id.tvError);
        tvCodeCountdown = findViewById(R.id.tvCodeCountdown);

        etRegPhone = findViewById(R.id.etRegPhone);
        etRegCode = findViewById(R.id.etRegCode);
        etRegInviteCode = findViewById(R.id.etRegInviteCode);
        btnRegGetCode = findViewById(R.id.btnRegGetCode);
        tvRegError = findViewById(R.id.tvRegError);
        tvRegCodeCountdown = findViewById(R.id.tvRegCodeCountdown);

        cbRegAgree = findViewById(R.id.cbRegAgree);
        tvRegAgreement = findViewById(R.id.tvRegAgreement);
        tvLoginAgreement = findViewById(R.id.tvLoginAgreement);

        spinnerCountryCode = findViewById(R.id.spinnerCountryCode);
        spinnerRegCountryCode = findViewById(R.id.spinnerRegCountryCode);
        setupCountryCodeSpinners();

        setupAgreementText();
    }

    private void setupCountryCodeSpinners() {
        String[] displayItems = new String[COUNTRY_CODES.length];
        for (int i = 0; i < COUNTRY_CODES.length; i++) {
            displayItems[i] = COUNTRY_CODES[i][0] + " " + COUNTRY_CODES[i][1];
        }

        ArrayAdapter<String> adapter = new ArrayAdapter<String>(this,
                android.R.layout.simple_spinner_item, displayItems) {
            @Override
            public View getView(int position, View convertView, ViewGroup parent) {
                TextView tv = (TextView) super.getView(position, convertView, parent);
                tv.setTextColor(0xFFFFFFFF);
                tv.setTextSize(14);
                tv.setText(COUNTRY_CODES[position][0]);
                return tv;
            }
            @Override
            public View getDropDownView(int position, View convertView, ViewGroup parent) {
                TextView tv = (TextView) super.getDropDownView(position, convertView, parent);
                tv.setTextColor(0xFFCBD5E1);
                tv.setTextSize(14);
                tv.setPadding(24, 20, 24, 20);
                tv.setText(COUNTRY_CODES[position][0] + " " + COUNTRY_CODES[position][1]);
                return tv;
            }
        };
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);

        spinnerCountryCode.setAdapter(adapter);
        spinnerRegCountryCode.setAdapter(adapter);
    }

    private String getSelectedCountryCode(boolean isLogin) {
        Spinner spinner = isLogin ? spinnerCountryCode : spinnerRegCountryCode;
        int pos = spinner.getSelectedItemPosition();
        if (pos >= 0 && pos < COUNTRY_CODES.length) {
            return COUNTRY_CODES[pos][0];
        }
        return "+86";
    }

    private void setupListeners() {
        btnLoginTab.setOnClickListener(v -> switchTab(true));
        btnRegisterTab.setOnClickListener(v -> switchTab(false));

        btnPhoneMethod.setOnClickListener(v -> switchLoginMethod(true));
        btnEmailMethod.setOnClickListener(v -> switchLoginMethod(false));

        btnGetCode.setOnClickListener(v -> handleSendCode(true));
        btnRegGetCode.setOnClickListener(v -> handleSendCode(false));

        btnLogin.setOnClickListener(v -> handleLogin());
        btnGuestLogin.setOnClickListener(v -> handleGuestLogin());
        btnRegister.setOnClickListener(v -> handleRegister());
    }

    private void setupInputWatchers() {
        TextWatcher loginWatcher = new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {}
            @Override
            public void afterTextChanged(Editable s) {
                tvError.setVisibility(View.GONE);
            }
        };
        etPhone.addTextChangedListener(loginWatcher);
        etVerificationCode.addTextChangedListener(loginWatcher);
        etEmail.addTextChangedListener(loginWatcher);
        etPassword.addTextChangedListener(loginWatcher);

        TextWatcher regWatcher = new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {}
            @Override
            public void afterTextChanged(Editable s) {
                tvRegError.setVisibility(View.GONE);
            }
        };
        etRegPhone.addTextChangedListener(regWatcher);
        etRegCode.addTextChangedListener(regWatcher);
    }

    private void switchTab(boolean login) {
        isLoginTab = login;
        loginForm.setVisibility(login ? View.VISIBLE : View.GONE);
        registerForm.setVisibility(login ? View.GONE : View.VISIBLE);

        btnLoginTab.setBackgroundResource(login ? R.drawable.bg_button_primary : android.R.color.transparent);
        btnLoginTab.setTextColor(getColor(login ? R.color.white : R.color.slate_400));
        btnRegisterTab.setBackgroundResource(login ? android.R.color.transparent : R.drawable.bg_button_primary);
        btnRegisterTab.setTextColor(getColor(login ? R.color.slate_400 : R.color.white));

        tvError.setVisibility(View.GONE);
        tvRegError.setVisibility(View.GONE);
    }

    private void switchLoginMethod(boolean phone) {
        isPhoneMethod = phone;
        phoneInputGroup.setVisibility(phone ? View.VISIBLE : View.GONE);
        emailInputGroup.setVisibility(phone ? View.GONE : View.VISIBLE);

        btnPhoneMethod.setBackgroundResource(phone ? R.drawable.bg_chip_selected : R.drawable.bg_chip);
        btnPhoneMethod.setTextColor(getColor(phone ? R.color.red_500 : R.color.slate_400));
        btnEmailMethod.setBackgroundResource(phone ? R.drawable.bg_chip : R.drawable.bg_chip_selected);
        btnEmailMethod.setTextColor(getColor(phone ? R.color.slate_400 : R.color.red_500));

        tvError.setVisibility(View.GONE);
    }

    // ============ Send Verification Code ============

    private void handleSendCode(boolean isLogin) {
        String phone;
        if (isLogin) {
            phone = etPhone.getText().toString().trim();
        } else {
            phone = etRegPhone.getText().toString().trim();
        }

        if (phone.length() < 6) {
            showError(isLogin, getString(R.string.auth_phone_invalid));
            return;
        }

        String code = String.format("%06d", (int) (Math.random() * 1000000));

        if (isLogin) {
            simulatedLoginCode = code;
            loginCodeSent = true;
            btnGetCode.setEnabled(false);
        } else {
            simulatedRegCode = code;
            regCodeSent = true;
            btnRegGetCode.setEnabled(false);
        }

        Toast.makeText(this,
                getString(R.string.auth_code_sent, code),
                Toast.LENGTH_LONG).show();

        startCodeCountdown(isLogin);
    }

    private void startCodeCountdown(boolean isLogin) {
        CountDownTimer timer = new CountDownTimer(60000, 1000) {
            @Override
            public void onTick(long millisUntilFinished) {
                int seconds = (int) (millisUntilFinished / 1000);
                String text = getString(R.string.auth_resend_countdown, seconds);
                if (isLogin) {
                    tvCodeCountdown.setText(text);
                    tvCodeCountdown.setVisibility(View.VISIBLE);
                    btnGetCode.setVisibility(View.GONE);
                } else {
                    tvRegCodeCountdown.setText(text);
                    tvRegCodeCountdown.setVisibility(View.VISIBLE);
                    btnRegGetCode.setVisibility(View.GONE);
                }
            }

            @Override
            public void onFinish() {
                if (isLogin) {
                    tvCodeCountdown.setVisibility(View.GONE);
                    btnGetCode.setVisibility(View.VISIBLE);
                    btnGetCode.setEnabled(true);
                } else {
                    tvRegCodeCountdown.setVisibility(View.GONE);
                    btnRegGetCode.setVisibility(View.VISIBLE);
                    btnRegGetCode.setEnabled(true);
                }
            }
        };

        if (isLogin) {
            if (loginCodeTimer != null) loginCodeTimer.cancel();
            loginCodeTimer = timer;
        } else {
            if (regCodeTimer != null) regCodeTimer.cancel();
            regCodeTimer = timer;
        }
        timer.start();
    }

    // ============ Login (Phone or Email) ============

    private void handleLogin() {
        if (isPhoneMethod) {
            handlePhoneLogin();
        } else {
            handleEmailLogin();
        }
    }

    private void handlePhoneLogin() {
        String phone = etPhone.getText().toString().trim();
        String code = etVerificationCode.getText().toString().trim();

        if (phone.length() < 6) {
            showError(true, getString(R.string.auth_phone_invalid));
            return;
        }
        if (code.length() != 6) {
            showError(true, getString(R.string.auth_code_invalid));
            return;
        }
        if (!loginCodeSent) {
            showError(true, getString(R.string.auth_code_not_sent));
            return;
        }
        if (!code.equals(simulatedLoginCode)) {
            showError(true, getString(R.string.auth_code_wrong));
            return;
        }

        String accessToken = "at_" + UUID.randomUUID().toString();
        String refreshToken = "rt_" + UUID.randomUUID().toString();
        String userId = "u_" + Math.abs(phone.hashCode());

        sessionManager.loginWithPhone(phone, getSelectedCountryCode(true), accessToken, refreshToken, userId);
        processInviteCode(etInviteCode.getText().toString().trim());
        sessionManager.getInviteCode();

        Toast.makeText(this, getString(R.string.auth_login_success), Toast.LENGTH_SHORT).show();
        navigateToMain();
    }

    private void handleEmailLogin() {
        String email = etEmail.getText().toString().trim();
        String password = etPassword.getText().toString().trim();

        if (email.isEmpty() || !email.contains("@")) {
            showError(true, getString(R.string.auth_email_invalid));
            return;
        }
        if (password.isEmpty() || password.length() < 6) {
            showError(true, getString(R.string.auth_password_invalid));
            return;
        }

        String accessToken = "at_" + UUID.randomUUID().toString();
        String refreshToken = "rt_" + UUID.randomUUID().toString();
        String userId = "u_" + Math.abs(email.hashCode());

        sessionManager.loginWithPhone("", "", accessToken, refreshToken, userId);
        sessionManager.setUserEmail(email);
        processInviteCode(etInviteCode.getText().toString().trim());
        sessionManager.getInviteCode();

        Toast.makeText(this, getString(R.string.auth_login_success), Toast.LENGTH_SHORT).show();
        navigateToMain();
    }

    // ============ Register ============

    private void handleRegister() {
        // Check agreement
        if (!cbRegAgree.isChecked()) {
            showError(false, getString(R.string.agreement_required));
            return;
        }

        String phone = etRegPhone.getText().toString().trim();
        String code = etRegCode.getText().toString().trim();

        if (phone.length() < 6) {
            showError(false, getString(R.string.auth_phone_invalid));
            return;
        }
        if (code.length() != 6) {
            showError(false, getString(R.string.auth_code_invalid));
            return;
        }
        if (!regCodeSent) {
            showError(false, getString(R.string.auth_code_not_sent));
            return;
        }
        if (!code.equals(simulatedRegCode)) {
            showError(false, getString(R.string.auth_code_wrong));
            return;
        }

        String accessToken = "at_" + UUID.randomUUID().toString();
        String refreshToken = "rt_" + UUID.randomUUID().toString();
        String userId = "u_" + Math.abs(phone.hashCode());

        sessionManager.loginWithPhone(phone, getSelectedCountryCode(false), accessToken, refreshToken, userId);
        sessionManager.setRegisterTime(System.currentTimeMillis());

        processInviteCode(etRegInviteCode.getText().toString().trim());
        sessionManager.getInviteCode();
        sessionManager.activateTrial();

        Toast.makeText(this, getString(R.string.auth_register_success), Toast.LENGTH_SHORT).show();
        navigateToMain();
    }

    // ============ Guest Login ============

    private void handleGuestLogin() {
        sessionManager.loginAsGuest();
        Toast.makeText(this, getString(R.string.auth_guest_welcome), Toast.LENGTH_LONG).show();
        navigateToMain();
    }

    // ============ Helpers ============

    private void processInviteCode(String inviteCode) {
        if (!inviteCode.isEmpty() && inviteCode.length() == 9
                && inviteCode.toUpperCase().startsWith("WAR")) {
            sessionManager.setInvitedBy(inviteCode.toUpperCase());
        }
    }

    private void showError(boolean isLogin, String message) {
        if (isLogin) {
            tvError.setText(message);
            tvError.setVisibility(View.VISIBLE);
        } else {
            tvRegError.setText(message);
            tvRegError.setVisibility(View.VISIBLE);
        }
    }

    private void navigateToMain() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
    }

    // ============ Agreement Text with Clickable Links ============

    private void setupAgreementText() {
        String prefix = getString(R.string.agreement_prefix);
        String privacy = getString(R.string.privacy_policy);
        String and = getString(R.string.agreement_and);
        String terms = getString(R.string.terms_of_service);
        String full = prefix + privacy + and + terms;

        int linkColor = getColor(R.color.red_500);

        // Register form agreement (with checkbox)
        SpannableString regSpan = new SpannableString(full);
        int privacyStart = prefix.length();
        int privacyEnd = privacyStart + privacy.length();
        int termsStart = privacyEnd + and.length();
        int termsEnd = termsStart + terms.length();

        regSpan.setSpan(new ClickableSpan() {
            @Override
            public void onClick(View widget) {
                Intent intent = new Intent(AuthActivity.this, LegalPageActivity.class);
                intent.putExtra("type", "privacy");
                startActivity(intent);
            }
        }, privacyStart, privacyEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        regSpan.setSpan(new ForegroundColorSpan(linkColor), privacyStart, privacyEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);

        regSpan.setSpan(new ClickableSpan() {
            @Override
            public void onClick(View widget) {
                Intent intent = new Intent(AuthActivity.this, LegalPageActivity.class);
                intent.putExtra("type", "terms");
                startActivity(intent);
            }
        }, termsStart, termsEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        regSpan.setSpan(new ForegroundColorSpan(linkColor), termsStart, termsEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);

        tvRegAgreement.setText(regSpan);
        tvRegAgreement.setMovementMethod(LinkMovementMethod.getInstance());

        // Login form agreement hint (text only, no checkbox)
        SpannableString loginSpan = new SpannableString(full);
        loginSpan.setSpan(new ClickableSpan() {
            @Override
            public void onClick(View widget) {
                Intent intent = new Intent(AuthActivity.this, LegalPageActivity.class);
                intent.putExtra("type", "privacy");
                startActivity(intent);
            }
        }, privacyStart, privacyEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        loginSpan.setSpan(new ForegroundColorSpan(linkColor), privacyStart, privacyEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);

        loginSpan.setSpan(new ClickableSpan() {
            @Override
            public void onClick(View widget) {
                Intent intent = new Intent(AuthActivity.this, LegalPageActivity.class);
                intent.putExtra("type", "terms");
                startActivity(intent);
            }
        }, termsStart, termsEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        loginSpan.setSpan(new ForegroundColorSpan(linkColor), termsStart, termsEnd, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);

        tvLoginAgreement.setText(loginSpan);
        tvLoginAgreement.setMovementMethod(LinkMovementMethod.getInstance());
    }
}
