package com.warrescue.app.activity;

import android.graphics.Typeface;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;

import com.warrescue.app.R;
import com.warrescue.app.data.DataRepository;
import com.warrescue.app.network.SupabaseClient;
import com.warrescue.app.util.SessionManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.UUID;

public class SubscriptionActivity extends BaseDetailActivity {

    private SessionManager sessionManager;

    // Defaults; will be overwritten by database values
    private double pricePersonal = 39.99;
    private double priceFamily = 99.99;

    @Override
    protected String getPageTitle() {
        return getString(R.string.subscription_manage);
    }

    @Override
    protected void buildContent(LinearLayout container) {
        sessionManager = new SessionManager(this);
        sessionManager.checkSubscriptionStatus();

        // Fetch real prices from database, then build UI
        DataRepository.getSubscriptionPlans(new DataRepository.DataCallback<JSONArray>() {
            @Override
            public void onData(JSONArray plans) {
                for (int i = 0; i < plans.length(); i++) {
                    JSONObject p = plans.optJSONObject(i);
                    if (p == null) continue;
                    String id = p.optString("id", "");
                    double price = p.optDouble("price", 0);
                    if (id.contains("personal") && price > 0) pricePersonal = price;
                    else if (id.contains("family") && price > 0) priceFamily = price;
                }
                buildCurrentPlanSection(container);
                buildSubscriptionManageSection(container);
                buildInviteDiscountSection(container);
                buildPlanCards(container);
                buildPaymentSection(container);
                buildAutoRenewDisclosure(container);
                buildRestorePurchaseSection(container);
                buildLegalLinksSection(container);
            }

            @Override
            public void onError(String error) {
                buildCurrentPlanSection(container);
                buildSubscriptionManageSection(container);
                buildInviteDiscountSection(container);
                buildPlanCards(container);
                buildPaymentSection(container);
                buildAutoRenewDisclosure(container);
                buildRestorePurchaseSection(container);
                buildLegalLinksSection(container);
            }
        });
    }

    // ============ Current Plan Status ============

    private void buildCurrentPlanSection(LinearLayout container) {
        addSectionTitle(container, getString(R.string.current_plan));

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER);
        int p = dp(20);
        card.setPadding(p, p, p, p);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(16);
        card.setLayoutParams(lp);

        String plan = sessionManager.getSubscriptionPlan();
        String status = sessionManager.getSubscriptionStatus();
        boolean isActive = sessionManager.isSubscriptionActive();
        boolean isTrial = sessionManager.isTrialActive();
        int remainDays = sessionManager.getSubscriptionRemainingDays();

        // Determine display info
        String planName;
        int bgRes;
        int planColor;

        if (SessionManager.PLAN_FAMILY.equals(plan) && isActive) {
            planName = getString(R.string.sub_plan_family_name);
            bgRes = R.drawable.bg_alert_red;
            planColor = R.color.amber_400;
        } else if (SessionManager.PLAN_PERSONAL.equals(plan) && isActive) {
            planName = isTrial ? getString(R.string.sub_trial_active) : getString(R.string.sub_plan_personal_name);
            bgRes = R.drawable.bg_safe_status;
            planColor = R.color.green_400;
        } else {
            planName = getString(R.string.sub_no_subscription);
            bgRes = R.drawable.bg_card;
            planColor = R.color.slate_400;
        }

        card.setBackgroundResource(bgRes);

        TextView tvPlan = new TextView(this);
        tvPlan.setText(planName);
        tvPlan.setTextColor(getColor(planColor));
        tvPlan.setTextSize(22);
        tvPlan.setTypeface(null, Typeface.BOLD);
        tvPlan.setGravity(Gravity.CENTER);
        card.addView(tvPlan);

        if (isActive) {
            // Expiry info
            long expiry = sessionManager.getSubscriptionExpiry();
            String expiryDate = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date(expiry));
            String expiryText = getString(R.string.plan_expire, expiryDate, remainDays);

            TextView tvExpiry = new TextView(this);
            tvExpiry.setText(expiryText);
            tvExpiry.setTextColor(getColor(R.color.slate_300));
            tvExpiry.setTextSize(13);
            tvExpiry.setGravity(Gravity.CENTER);
            LinearLayout.LayoutParams eLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            eLp.topMargin = dp(6);
            tvExpiry.setLayoutParams(eLp);
            card.addView(tvExpiry);

            // Expiring warning
            if (SessionManager.STATUS_EXPIRING.equals(status)) {
                TextView tvWarn = new TextView(this);
                tvWarn.setText(getString(R.string.sub_expiring_warn, remainDays));
                tvWarn.setTextColor(getColor(R.color.amber_400));
                tvWarn.setTextSize(12);
                tvWarn.setGravity(Gravity.CENTER);
                LinearLayout.LayoutParams wLp = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                wLp.topMargin = dp(4);
                tvWarn.setLayoutParams(wLp);
                card.addView(tvWarn);
            }
        } else {
            TextView tvHint = new TextView(this);
            tvHint.setText(getString(R.string.sub_choose_plan_hint));
            tvHint.setTextColor(getColor(R.color.slate_400));
            tvHint.setTextSize(13);
            tvHint.setGravity(Gravity.CENTER);
            LinearLayout.LayoutParams hLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            hLp.topMargin = dp(6);
            tvHint.setLayoutParams(hLp);
            card.addView(tvHint);
        }

        container.addView(card);
    }

    // ============ Invite Discount Banner ============

    private void buildInviteDiscountSection(LinearLayout container) {
        boolean hasDiscount = sessionManager.hasInviteDiscount();
        int inviteCount = sessionManager.getInviteCount();

        if (hasDiscount || inviteCount > 0) {
            LinearLayout discountCard = new LinearLayout(this);
            discountCard.setOrientation(LinearLayout.VERTICAL);
            discountCard.setBackgroundResource(R.drawable.bg_card);
            int pad = dp(16);
            discountCard.setPadding(pad, pad, pad, pad);
            LinearLayout.LayoutParams dlp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            dlp.bottomMargin = dp(12);
            discountCard.setLayoutParams(dlp);

            if (hasDiscount) {
                TextView tvDiscount = new TextView(this);
                tvDiscount.setText(getString(R.string.sub_invite_discount_active));
                tvDiscount.setTextColor(getColor(R.color.green_400));
                tvDiscount.setTextSize(15);
                tvDiscount.setTypeface(null, Typeface.BOLD);
                discountCard.addView(tvDiscount);

                TextView tvDiscountDesc = new TextView(this);
                tvDiscountDesc.setText(getString(R.string.sub_invite_discount_desc));
                tvDiscountDesc.setTextColor(getColor(R.color.slate_300));
                tvDiscountDesc.setTextSize(12);
                LinearLayout.LayoutParams ddLp = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                ddLp.topMargin = dp(4);
                tvDiscountDesc.setLayoutParams(ddLp);
                discountCard.addView(tvDiscountDesc);
            }

            if (inviteCount > 0) {
                TextView tvCount = new TextView(this);
                tvCount.setText(getString(R.string.sub_invite_count, inviteCount));
                tvCount.setTextColor(getColor(R.color.slate_300));
                tvCount.setTextSize(13);
                LinearLayout.LayoutParams cLp = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                cLp.topMargin = dp(hasDiscount ? 8 : 0);
                tvCount.setLayoutParams(cLp);
                discountCard.addView(tvCount);
            }

            container.addView(discountCard);
        }
    }

    // ============ Plan Cards ============

    private void buildPlanCards(LinearLayout container) {
        addSectionTitle(container, getString(R.string.subscription_plans));

        String currentPlan = sessionManager.getSubscriptionPlan();
        boolean isActive = sessionManager.isSubscriptionActive();
        boolean hasDiscount = sessionManager.hasInviteDiscount();

        // Personal Plan
        boolean isPersonalCurrent = SessionManager.PLAN_PERSONAL.equals(currentPlan) && isActive;
        double personalPrice = hasDiscount ? pricePersonal / 2 : pricePersonal;
        String pFmt = String.format(Locale.getDefault(), "%.2f", personalPrice);
        String pOrigFmt = String.format(Locale.getDefault(), "%.2f", pricePersonal);
        String personalPriceText = hasDiscount
                ? getString(R.string.sub_price_discount, pFmt, pOrigFmt)
                : getString(R.string.sub_price_normal, pFmt);
        addPlanCard(container,
                getString(R.string.sub_plan_personal_name),
                personalPriceText,
                getString(R.string.sub_personal_features),
                isPersonalCurrent,
                isPersonalCurrent ? null : getString(R.string.sub_subscribe),
                SessionManager.PLAN_PERSONAL,
                personalPrice);

        // Family Plan
        boolean isFamilyCurrent = SessionManager.PLAN_FAMILY.equals(currentPlan) && isActive;
        double familyPrice = hasDiscount ? priceFamily / 2 : priceFamily;
        String fFmt = String.format(Locale.getDefault(), "%.2f", familyPrice);
        String fOrigFmt = String.format(Locale.getDefault(), "%.2f", priceFamily);
        String familyPriceText = hasDiscount
                ? getString(R.string.sub_price_discount, fFmt, fOrigFmt)
                : getString(R.string.sub_price_normal, fFmt);
        addPlanCard(container,
                getString(R.string.sub_plan_family_name),
                familyPriceText,
                getString(R.string.sub_family_features),
                isFamilyCurrent,
                isFamilyCurrent ? null : getString(R.string.sub_subscribe),
                SessionManager.PLAN_FAMILY,
                familyPrice);
    }

    private void addPlanCard(LinearLayout container, String name, String price,
                             String features, boolean isCurrent, String actionText,
                             String planType, double actualPrice) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackgroundResource(isCurrent ? R.drawable.bg_alert_red : R.drawable.bg_card);
        int pad = dp(18);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(12);
        card.setLayoutParams(lp);

        // Header
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        TextView tvName = new TextView(this);
        tvName.setText(name);
        tvName.setTextColor(getColor(R.color.white));
        tvName.setTextSize(18);
        tvName.setTypeface(null, Typeface.BOLD);
        LinearLayout.LayoutParams nameLp = new LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        tvName.setLayoutParams(nameLp);
        header.addView(tvName);

        if (isCurrent) {
            TextView tvBadge = new TextView(this);
            tvBadge.setText(getString(R.string.current));
            tvBadge.setTextColor(getColor(R.color.white));
            tvBadge.setTextSize(12);
            tvBadge.setBackgroundResource(R.drawable.bg_chip_selected);
            int chipPad = dp(8);
            tvBadge.setPadding(chipPad, dp(4), chipPad, dp(4));
            header.addView(tvBadge);
        }
        card.addView(header);

        // Price
        TextView tvPrice = new TextView(this);
        tvPrice.setText(price);
        tvPrice.setTextColor(getColor(isCurrent ? R.color.amber_400 : R.color.slate_300));
        tvPrice.setTextSize(16);
        tvPrice.setTypeface(null, Typeface.BOLD);
        LinearLayout.LayoutParams priceLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        priceLp.topMargin = dp(6);
        tvPrice.setLayoutParams(priceLp);
        card.addView(tvPrice);

        // Features
        TextView tvFeatures = new TextView(this);
        tvFeatures.setText(features);
        tvFeatures.setTextColor(getColor(R.color.slate_300));
        tvFeatures.setTextSize(13);
        tvFeatures.setLineSpacing(dp(4), 1f);
        LinearLayout.LayoutParams featLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        featLp.topMargin = dp(10);
        tvFeatures.setLayoutParams(featLp);
        card.addView(tvFeatures);

        // Subscribe button
        if (!isCurrent && actionText != null) {
            Button btn = new Button(this);
            btn.setText(actionText);
            btn.setTextColor(getColor(R.color.white));
            btn.setBackgroundResource(R.drawable.bg_button_primary);
            btn.setAllCaps(false);
            btn.setTextSize(14);
            LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, dp(42));
            btnLp.topMargin = dp(12);
            btn.setLayoutParams(btnLp);
            btn.setOnClickListener(v -> handleSubscribe(planType, actualPrice));
            card.addView(btn);
        }

        container.addView(card);
    }

    // ============ Payment Methods ============

    private void buildPaymentSection(LinearLayout container) {
        addSectionTitle(container, getString(R.string.payment_method));

        View lianlianCard = addSettingCard(container,
                getString(R.string.sub_payment_lianlian),
                getString(R.string.sub_payment_lianlian_desc),
                R.drawable.bg_icon_blue);

        addSettingCard(container,
                getString(R.string.payment_card),
                getString(R.string.payment_card_desc),
                R.drawable.bg_icon_amber);

        addSettingCard(container,
                getString(R.string.payment_paypal),
                getString(R.string.payment_paypal_desc),
                R.drawable.bg_icon_green);
    }

    // ============ Subscribe Flow ============

    private void handleSubscribe(String planType, double price) {
        if (sessionManager.isGuestMode()) {
            Toast.makeText(this, getString(R.string.sub_guest_cannot), Toast.LENGTH_LONG).show();
            return;
        }

        String planName = SessionManager.PLAN_PERSONAL.equals(planType)
                ? getString(R.string.sub_plan_personal_name)
                : getString(R.string.sub_plan_family_name);

        String userId = sessionManager.getUserId();
        String planId = SessionManager.PLAN_PERSONAL.equals(planType) ? "personal" : "family";
        boolean hasDiscount = sessionManager.hasInviteDiscount();
        double originalPrice = SessionManager.PLAN_PERSONAL.equals(planType) ? pricePersonal : priceFamily;
        double discountAmount = hasDiscount ? originalPrice / 2 : 0;

        // Create order in backend
        try {
            JSONObject order = new JSONObject();
            order.put("user_id", userId);
            order.put("plan_id", planId);
            order.put("original_price", originalPrice);
            order.put("discount_amount", discountAmount);
            order.put("final_price", price);
            order.put("has_invite_discount", hasDiscount);
            order.put("payment_method", "lianlian");
            order.put("status", "completed");
            order.put("external_order_id", "ORD" + System.currentTimeMillis());
            long expiresMs = System.currentTimeMillis() + 30L * 24 * 60 * 60 * 1000;
            String expiresAt = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(new Date(expiresMs));
            order.put("expires_at", expiresAt);
            order.put("completed_at", new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(new Date()));

            DataRepository.createSubscriptionOrder(order, new DataRepository.DataCallback<JSONObject>() {
                @Override
                public void onData(JSONObject result) {
                    android.util.Log.d("Subscription", "Order created: " + result.optString("id"));
                    try {
                        JSONObject sub = new JSONObject();
                        sub.put("user_id", userId);
                        sub.put("plan_id", planId);
                        sub.put("status", "active");
                        sub.put("expires_at", expiresAt);
                        sub.put("auto_renew", false);
                        DataRepository.upsertSubscription(sub, new DataRepository.DataCallback<JSONObject>() {
                            @Override
                            public void onData(JSONObject r) {}
                            @Override
                            public void onError(String e) {}
                        });
                    } catch (Exception e) {
                        android.util.Log.e("Subscription", "Subscription record error", e);
                    }
                }
                @Override
                public void onError(String error) {
                    android.util.Log.w("Subscription", "Order backend failed (local ok): " + error);
                }
            });
        } catch (Exception e) {
            android.util.Log.e("Subscription", "Build order json error", e);
        }

        // Activate locally
        sessionManager.activateSubscription(planType);

        Toast.makeText(this,
                getString(R.string.sub_activated, planName),
                Toast.LENGTH_SHORT).show();

        // Refresh page
        contentContainer.removeAllViews();
        buildContent(contentContainer);
    }

    // ============ Subscription Management (Cancel) ============

    private void buildSubscriptionManageSection(LinearLayout container) {
        boolean isActive = sessionManager.isSubscriptionActive();
        boolean isCancelled = sessionManager.isSubscriptionCancelled();

        if (!isActive && !isCancelled) return;

        addSectionTitle(container, getString(R.string.sub_manage));

        if (isCancelled) {
            // Show cancelled status
            long expiry = sessionManager.getSubscriptionExpiry();
            String expiryDate = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date(expiry));

            TextView tvCancelled = new TextView(this);
            tvCancelled.setText(getString(R.string.sub_cancelled_status, expiryDate));
            tvCancelled.setTextColor(getColor(R.color.amber_400));
            tvCancelled.setTextSize(14);
            tvCancelled.setBackgroundResource(R.drawable.bg_card);
            int pad = dp(16);
            tvCancelled.setPadding(pad, pad, pad, pad);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            lp.bottomMargin = dp(8);
            tvCancelled.setLayoutParams(lp);
            container.addView(tvCancelled);
        } else if (isActive) {
            // Show cancel button
            Button btnCancel = new Button(this);
            btnCancel.setText(getString(R.string.sub_cancel));
            btnCancel.setTextColor(getColor(R.color.red_500));
            btnCancel.setBackgroundResource(R.drawable.bg_button_secondary);
            btnCancel.setAllCaps(false);
            btnCancel.setTextSize(14);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, dp(42));
            lp.bottomMargin = dp(8);
            btnCancel.setLayoutParams(lp);
            btnCancel.setOnClickListener(v -> showCancelConfirmDialog());
            container.addView(btnCancel);
        }
    }

    private void showCancelConfirmDialog() {
        long expiry = sessionManager.getSubscriptionExpiry();
        String expiryDate = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date(expiry));

        new AlertDialog.Builder(this)
                .setTitle(getString(R.string.sub_cancel_title))
                .setMessage(getString(R.string.sub_cancel_message, expiryDate))
                .setPositiveButton(getString(R.string.sub_cancel_confirm), (dialog, which) -> {
                    handleCancelSubscription();
                })
                .setNegativeButton(getString(R.string.cancel), null)
                .show();
    }

    private void handleCancelSubscription() {
        String userId = sessionManager.getUserId();

        // Update backend
        DataRepository.cancelSubscription(userId, new DataRepository.DataCallback<JSONObject>() {
            @Override
            public void onData(JSONObject result) {
                android.util.Log.d("Subscription", "Subscription cancelled on backend");
            }

            @Override
            public void onError(String error) {
                android.util.Log.w("Subscription", "Cancel backend failed (local ok): " + error);
            }
        });

        // Update local state
        sessionManager.cancelSubscription();

        Toast.makeText(this, getString(R.string.sub_cancel_success), Toast.LENGTH_SHORT).show();

        // Refresh page
        contentContainer.removeAllViews();
        buildContent(contentContainer);
    }

    // ============ Auto-Renewal Disclosure ============

    private void buildAutoRenewDisclosure(LinearLayout container) {
        TextView tvDisclosure = new TextView(this);
        tvDisclosure.setText(getString(R.string.sub_auto_renew_notice));
        tvDisclosure.setTextColor(getColor(R.color.slate_400));
        tvDisclosure.setTextSize(11);
        tvDisclosure.setLineSpacing(dp(3), 1f);
        int pad = dp(16);
        tvDisclosure.setPadding(pad, dp(12), pad, dp(12));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(16);
        tvDisclosure.setLayoutParams(lp);
        container.addView(tvDisclosure);
    }

    // ============ Restore Purchase ============

    private void buildRestorePurchaseSection(LinearLayout container) {
        Button btnRestore = new Button(this);
        btnRestore.setText(getString(R.string.sub_restore));
        btnRestore.setTextColor(getColor(R.color.slate_300));
        btnRestore.setBackgroundResource(R.drawable.bg_button_secondary);
        btnRestore.setAllCaps(false);
        btnRestore.setTextSize(14);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(42));
        lp.topMargin = dp(8);
        btnRestore.setLayoutParams(lp);
        btnRestore.setOnClickListener(v -> handleRestorePurchase());
        container.addView(btnRestore);
    }

    private void handleRestorePurchase() {
        String userId = sessionManager.getUserId();
        if (userId.isEmpty()) {
            Toast.makeText(this, getString(R.string.sub_restore_none), Toast.LENGTH_SHORT).show();
            return;
        }

        DataRepository.restoreSubscription(userId, new DataRepository.DataCallback<JSONObject>() {
            @Override
            public void onData(JSONObject result) {
                if (result == null) {
                    Toast.makeText(SubscriptionActivity.this,
                            getString(R.string.sub_restore_none), Toast.LENGTH_SHORT).show();
                    return;
                }

                String status = result.optString("status", "");
                String planId = result.optString("plan_id", "");
                String expiresAt = result.optString("expires_at", "");

                if (("active".equals(status) || "cancelled".equals(status)) && !expiresAt.isEmpty()) {
                    try {
                        long expiryMs = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss",
                                Locale.US).parse(expiresAt).getTime();
                        if (expiryMs > System.currentTimeMillis()) {
                            String plan = planId.contains("family")
                                    ? SessionManager.PLAN_FAMILY : SessionManager.PLAN_PERSONAL;
                            sessionManager.restoreSubscription(plan, expiryMs);

                            Toast.makeText(SubscriptionActivity.this,
                                    getString(R.string.sub_restore_success), Toast.LENGTH_SHORT).show();
                            contentContainer.removeAllViews();
                            buildContent(contentContainer);
                            return;
                        }
                    } catch (Exception e) {
                        android.util.Log.e("Subscription", "Parse expiry error", e);
                    }
                }

                Toast.makeText(SubscriptionActivity.this,
                        getString(R.string.sub_restore_none), Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onError(String error) {
                Toast.makeText(SubscriptionActivity.this,
                        getString(R.string.sub_restore_error), Toast.LENGTH_SHORT).show();
            }
        });
    }

    // ============ Legal Links ============

    private void buildLegalLinksSection(LinearLayout container) {
        addSectionTitle(container, getString(R.string.legal_info));

        View privacyCard = addSettingCard(container,
                getString(R.string.privacy_policy),
                getString(R.string.privacy_policy_url),
                R.drawable.bg_icon_blue);
        privacyCard.setOnClickListener(v -> {
            android.content.Intent intent = new android.content.Intent(this, LegalPageActivity.class);
            intent.putExtra("type", "privacy");
            startActivity(intent);
        });

        View termsCard = addSettingCard(container,
                getString(R.string.terms_of_service),
                getString(R.string.terms_of_service_url),
                R.drawable.bg_icon_green);
        termsCard.setOnClickListener(v -> {
            android.content.Intent intent = new android.content.Intent(this, LegalPageActivity.class);
            intent.putExtra("type", "terms");
            startActivity(intent);
        });
    }
}
