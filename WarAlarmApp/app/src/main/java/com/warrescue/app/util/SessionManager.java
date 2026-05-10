package com.warrescue.app.util;

import android.content.Context;
import android.content.SharedPreferences;

import java.security.SecureRandom;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Manages user session state including auth tokens, guest mode,
 * subscription status, and invite system.
 */
public class SessionManager {
    private static final String PREF_NAME = "warrescue_prefs";

    // Auth keys
    private static final String KEY_LOGGED_IN = "logged_in";
    private static final String KEY_DEMO_MODE = "demo_mode";
    private static final String KEY_GUEST_MODE = "guest_mode";
    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_USER_EMAIL = "user_email";
    private static final String KEY_USER_PHONE = "user_phone";
    private static final String KEY_COUNTRY_CODE = "country_code";
    private static final String KEY_ACCESS_TOKEN = "access_token";
    private static final String KEY_REFRESH_TOKEN = "refresh_token";
    private static final String KEY_TOKEN_EXPIRY = "token_expiry";
    private static final String KEY_GUEST_TOKEN = "guest_token";
    private static final String KEY_GUEST_EXPIRY = "guest_expiry";
    private static final String KEY_LANGUAGE = "language";

    // Invite keys
    private static final String KEY_INVITE_CODE = "invite_code";
    private static final String KEY_INVITED_BY = "invited_by";
    private static final String KEY_INVITE_COUNT = "invite_count";
    private static final String KEY_INVITE_DISCOUNT_MONTH = "invite_discount_month";

    // Subscription keys
    private static final String KEY_SUB_PLAN = "subscription_plan";
    private static final String KEY_SUB_STATUS = "subscription_status";
    private static final String KEY_SUB_EXPIRY = "subscription_expiry";
    private static final String KEY_TRIAL_ACTIVE = "trial_active";
    private static final String KEY_TRIAL_EXPIRY = "trial_expiry";
    private static final String KEY_REGISTER_TIME = "register_time";

    // Plan constants
    public static final String PLAN_NONE = "none";
    public static final String PLAN_PERSONAL = "personal";
    public static final String PLAN_FAMILY = "family";

    // Status constants
    public static final String STATUS_ACTIVE = "active";
    public static final String STATUS_EXPIRING = "expiring";
    public static final String STATUS_INACTIVE = "inactive";
    public static final String STATUS_CANCELLED = "cancelled";

    // Token durations
    private static final long ACCESS_TOKEN_DURATION = 24 * 60 * 60 * 1000L;  // 24h
    private static final long REFRESH_TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000L; // 7d
    private static final long GUEST_TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000L;   // 7d
    private static final long TRIAL_DURATION = 7 * 24 * 60 * 60 * 1000L;          // 7d
    private static final long SUB_DURATION = 30 * 24 * 60 * 60 * 1000L;           // 30d

    private static final String INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int INVITE_CODE_LENGTH = 6;

    private final SharedPreferences prefs;

    public SessionManager(Context context) {
        prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    // ============ Auth State ============

    public void setLoggedIn(boolean loggedIn) {
        prefs.edit().putBoolean(KEY_LOGGED_IN, loggedIn).apply();
    }

    public boolean isLoggedIn() {
        return prefs.getBoolean(KEY_LOGGED_IN, false);
    }

    public void setDemoMode(boolean isDemo) {
        prefs.edit().putBoolean(KEY_DEMO_MODE, isDemo).apply();
        if (isDemo) {
            setLoggedIn(true);
        }
    }

    public boolean isDemoMode() {
        return prefs.getBoolean(KEY_DEMO_MODE, false);
    }

    public void setGuestMode(boolean isGuest) {
        prefs.edit().putBoolean(KEY_GUEST_MODE, isGuest).apply();
    }

    public boolean isGuestMode() {
        return prefs.getBoolean(KEY_GUEST_MODE, false);
    }

    // ============ User Info ============

    public void setUserId(String userId) {
        prefs.edit().putString(KEY_USER_ID, userId).apply();
    }

    public String getUserId() {
        return prefs.getString(KEY_USER_ID, "");
    }

    public void setUserEmail(String email) {
        prefs.edit().putString(KEY_USER_EMAIL, email).apply();
    }

    public String getUserEmail() {
        return prefs.getString(KEY_USER_EMAIL, "");
    }

    public void setUserPhone(String phone) {
        prefs.edit().putString(KEY_USER_PHONE, phone).apply();
    }

    public String getUserPhone() {
        return prefs.getString(KEY_USER_PHONE, "");
    }

    public void setCountryCode(String code) {
        prefs.edit().putString(KEY_COUNTRY_CODE, code).apply();
    }

    public String getCountryCode() {
        return prefs.getString(KEY_COUNTRY_CODE, "+86");
    }

    // ============ Tokens ============

    public void setAccessToken(String token) {
        prefs.edit()
                .putString(KEY_ACCESS_TOKEN, token)
                .putLong(KEY_TOKEN_EXPIRY, System.currentTimeMillis() + ACCESS_TOKEN_DURATION)
                .apply();
    }

    public String getAccessToken() {
        return prefs.getString(KEY_ACCESS_TOKEN, "");
    }

    public boolean isAccessTokenValid() {
        String token = getAccessToken();
        if (token.isEmpty()) return false;
        return System.currentTimeMillis() < prefs.getLong(KEY_TOKEN_EXPIRY, 0);
    }

    public void setRefreshToken(String token) {
        prefs.edit().putString(KEY_REFRESH_TOKEN, token).apply();
    }

    public String getRefreshToken() {
        return prefs.getString(KEY_REFRESH_TOKEN, "");
    }

    public void setGuestToken(String token) {
        prefs.edit()
                .putString(KEY_GUEST_TOKEN, token)
                .putLong(KEY_GUEST_EXPIRY, System.currentTimeMillis() + GUEST_TOKEN_DURATION)
                .apply();
    }

    public String getGuestToken() {
        return prefs.getString(KEY_GUEST_TOKEN, "");
    }

    public boolean isGuestSessionValid() {
        if (!isGuestMode()) return false;
        return System.currentTimeMillis() < prefs.getLong(KEY_GUEST_EXPIRY, 0);
    }

    public long getGuestExpiryTime() {
        return prefs.getLong(KEY_GUEST_EXPIRY, 0);
    }

    public int getGuestRemainingDays() {
        long remaining = prefs.getLong(KEY_GUEST_EXPIRY, 0) - System.currentTimeMillis();
        if (remaining <= 0) return 0;
        return (int) (remaining / (24 * 60 * 60 * 1000L)) + 1;
    }

    // ============ Language ============

    public void setLanguage(String lang) {
        prefs.edit().putString(KEY_LANGUAGE, lang).apply();
    }

    public String getLanguage() {
        return prefs.getString(KEY_LANGUAGE, "zh");
    }

    // ============ Invite System ============

    public String getInviteCode() {
        String code = prefs.getString(KEY_INVITE_CODE, "");
        if (code.isEmpty()) {
            code = generateInviteCode();
            prefs.edit().putString(KEY_INVITE_CODE, code).apply();
        }
        return code;
    }

    public void setInviteCode(String code) {
        prefs.edit().putString(KEY_INVITE_CODE, code).apply();
    }

    private String generateInviteCode() {
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder("WAR");
        for (int i = 0; i < INVITE_CODE_LENGTH; i++) {
            sb.append(INVITE_CODE_CHARS.charAt(random.nextInt(INVITE_CODE_CHARS.length())));
        }
        return sb.toString();
    }

    public void setInvitedBy(String code) {
        prefs.edit().putString(KEY_INVITED_BY, code).apply();
    }

    public String getInvitedBy() {
        return prefs.getString(KEY_INVITED_BY, "");
    }

    public void setInviteCount(int count) {
        prefs.edit().putInt(KEY_INVITE_COUNT, count).apply();
    }

    public int getInviteCount() {
        return prefs.getInt(KEY_INVITE_COUNT, 0);
    }

    public void incrementInviteCount() {
        setInviteCount(getInviteCount() + 1);
    }

    public boolean hasInviteDiscount() {
        String currentMonth = new SimpleDateFormat("yyyy-MM", Locale.US).format(new Date());
        String discountMonth = prefs.getString(KEY_INVITE_DISCOUNT_MONTH, "");
        return currentMonth.equals(discountMonth);
    }

    public void setInviteDiscountMonth(String month) {
        prefs.edit().putString(KEY_INVITE_DISCOUNT_MONTH, month).apply();
    }

    public void grantInviteDiscount() {
        String currentMonth = new SimpleDateFormat("yyyy-MM", Locale.US).format(new Date());
        setInviteDiscountMonth(currentMonth);
    }

    // ============ Subscription ============

    public void setSubscriptionPlan(String plan) {
        prefs.edit().putString(KEY_SUB_PLAN, plan).apply();
    }

    public String getSubscriptionPlan() {
        return prefs.getString(KEY_SUB_PLAN, PLAN_NONE);
    }

    public void setSubscriptionStatus(String status) {
        prefs.edit().putString(KEY_SUB_STATUS, status).apply();
    }

    public String getSubscriptionStatus() {
        return prefs.getString(KEY_SUB_STATUS, STATUS_INACTIVE);
    }

    public void setSubscriptionExpiry(long expiry) {
        prefs.edit().putLong(KEY_SUB_EXPIRY, expiry).apply();
    }

    public long getSubscriptionExpiry() {
        return prefs.getLong(KEY_SUB_EXPIRY, 0);
    }

    public int getSubscriptionRemainingDays() {
        long remaining = getSubscriptionExpiry() - System.currentTimeMillis();
        if (remaining <= 0) return 0;
        return (int) (remaining / (24 * 60 * 60 * 1000L));
    }

    public boolean isSubscriptionActive() {
        String status = getSubscriptionStatus();
        return STATUS_ACTIVE.equals(status) || STATUS_EXPIRING.equals(status);
    }

    public boolean isPersonalPlan() {
        return PLAN_PERSONAL.equals(getSubscriptionPlan()) && isSubscriptionActive();
    }

    public boolean isFamilyPlan() {
        return PLAN_FAMILY.equals(getSubscriptionPlan()) && isSubscriptionActive();
    }

    public void activateSubscription(String plan) {
        long now = System.currentTimeMillis();
        prefs.edit()
                .putString(KEY_SUB_PLAN, plan)
                .putString(KEY_SUB_STATUS, STATUS_ACTIVE)
                .putLong(KEY_SUB_EXPIRY, now + SUB_DURATION)
                .apply();
    }

    public void checkSubscriptionStatus() {
        if (!isSubscriptionActive() && !isTrialActive()) return;
        long expiry = getSubscriptionExpiry();
        long remaining = expiry - System.currentTimeMillis();
        if (remaining <= 0) {
            prefs.edit()
                    .putString(KEY_SUB_STATUS, STATUS_INACTIVE)
                    .putString(KEY_SUB_PLAN, PLAN_NONE)
                    .putBoolean(KEY_TRIAL_ACTIVE, false)
                    .apply();
        } else if (remaining <= 7 * 24 * 60 * 60 * 1000L) {
            prefs.edit().putString(KEY_SUB_STATUS, STATUS_EXPIRING).apply();
        }
    }

    // ============ Free Trial ============

    public void activateTrial() {
        long now = System.currentTimeMillis();
        prefs.edit()
                .putBoolean(KEY_TRIAL_ACTIVE, true)
                .putLong(KEY_TRIAL_EXPIRY, now + TRIAL_DURATION)
                .putString(KEY_SUB_PLAN, PLAN_PERSONAL)
                .putString(KEY_SUB_STATUS, STATUS_ACTIVE)
                .putLong(KEY_SUB_EXPIRY, now + TRIAL_DURATION)
                .apply();
    }

    public boolean isTrialActive() {
        if (!prefs.getBoolean(KEY_TRIAL_ACTIVE, false)) return false;
        return System.currentTimeMillis() < prefs.getLong(KEY_TRIAL_EXPIRY, 0);
    }

    public long getTrialExpiry() {
        return prefs.getLong(KEY_TRIAL_EXPIRY, 0);
    }

    public void setRegisterTime(long time) {
        prefs.edit().putLong(KEY_REGISTER_TIME, time).apply();
    }

    public long getRegisterTime() {
        return prefs.getLong(KEY_REGISTER_TIME, 0);
    }

    // ============ Login Flows ============

    public void loginWithPhone(String phone, String countryCode, String accessToken, String refreshToken, String userId) {
        prefs.edit()
                .putBoolean(KEY_LOGGED_IN, true)
                .putBoolean(KEY_DEMO_MODE, false)
                .putBoolean(KEY_GUEST_MODE, false)
                .putString(KEY_USER_PHONE, phone)
                .putString(KEY_COUNTRY_CODE, countryCode)
                .putString(KEY_ACCESS_TOKEN, accessToken)
                .putString(KEY_REFRESH_TOKEN, refreshToken)
                .putLong(KEY_TOKEN_EXPIRY, System.currentTimeMillis() + ACCESS_TOKEN_DURATION)
                .putString(KEY_USER_ID, userId)
                .apply();
    }

    public void loginAsGuest() {
        String guestId = "guest_" + System.currentTimeMillis();
        long expiry = System.currentTimeMillis() + GUEST_TOKEN_DURATION;
        prefs.edit()
                .putBoolean(KEY_LOGGED_IN, true)
                .putBoolean(KEY_DEMO_MODE, false)
                .putBoolean(KEY_GUEST_MODE, true)
                .putString(KEY_GUEST_TOKEN, guestId)
                .putLong(KEY_GUEST_EXPIRY, expiry)
                .putString(KEY_USER_ID, guestId)
                .apply();
    }

    public void upgradeFromGuest(String phone, String countryCode, String accessToken, String refreshToken, String userId) {
        loginWithPhone(phone, countryCode, accessToken, refreshToken, userId);
    }

    // ============ Emergency Contact ============

    private static final String KEY_EMERGENCY_CONTACT_PHONE = "emergency_contact_phone";
    private static final String KEY_EMERGENCY_CONTACT_NAME = "emergency_contact_name";

    public void setEmergencyContactPhone(String phone) {
        prefs.edit().putString(KEY_EMERGENCY_CONTACT_PHONE, phone).apply();
    }

    public String getEmergencyContactPhone() {
        return prefs.getString(KEY_EMERGENCY_CONTACT_PHONE, "");
    }

    public void setEmergencyContactName(String name) {
        prefs.edit().putString(KEY_EMERGENCY_CONTACT_NAME, name).apply();
    }

    public String getEmergencyContactName() {
        return prefs.getString(KEY_EMERGENCY_CONTACT_NAME, "");
    }

    // ============ Feature Access ============

    public boolean canAccessSOS() {
        return isSubscriptionActive() && !isGuestMode();
    }

    public boolean canAccessFamily() {
        return isFamilyPlan() && !isGuestMode();
    }

    public boolean canAccessSubscription() {
        return !isGuestMode();
    }

    public boolean canAccessOfflineMap() {
        return isSubscriptionActive();
    }

    public boolean canAccessEscapeRoute() {
        return isSubscriptionActive();
    }

    // ============ Subscription Cancel/Restore ============

    public void cancelSubscription() {
        prefs.edit()
                .putString(KEY_SUB_STATUS, STATUS_CANCELLED)
                .apply();
    }

    public boolean isSubscriptionCancelled() {
        return STATUS_CANCELLED.equals(getSubscriptionStatus());
    }

    public void restoreSubscription(String plan, long expiryMs) {
        prefs.edit()
                .putString(KEY_SUB_PLAN, plan)
                .putString(KEY_SUB_STATUS, STATUS_ACTIVE)
                .putLong(KEY_SUB_EXPIRY, expiryMs)
                .apply();
    }

    // ============ Account Deletion ============

    public void clearAllUserData() {
        prefs.edit().clear().apply();
    }

    // ============ Logout ============

    public void logout() {
        String language = getLanguage();
        prefs.edit().clear().apply();
        setLanguage(language);
    }
}
