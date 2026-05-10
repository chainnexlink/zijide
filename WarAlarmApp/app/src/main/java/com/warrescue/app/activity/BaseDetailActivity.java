package com.warrescue.app.activity;

import android.content.Context;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.warrescue.app.R;
import com.warrescue.app.util.LocaleHelper;

/**
 * Base activity for secondary pages with a back button and title.
 * Subclasses override getPageTitle() and buildContent().
 */
public abstract class BaseDetailActivity extends AppCompatActivity {

    protected LinearLayout contentContainer;

    @Override
    protected void attachBaseContext(Context newBase) {
        super.attachBaseContext(LocaleHelper.onAttach(newBase));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_generic);

        TextView tvTitle = findViewById(R.id.tvPageTitle);
        tvTitle.setText(getPageTitle());
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());

        contentContainer = findViewById(R.id.contentContainer);
        buildContent(contentContainer);
    }

    protected abstract String getPageTitle();
    protected abstract void buildContent(LinearLayout container);

    /** Helper to add a settings-style card */
    protected View addSettingCard(LinearLayout container, String title, String desc, int bgIconRes) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setBackgroundResource(R.drawable.bg_card);
        card.setGravity(Gravity.CENTER_VERTICAL);
        int pad = dp(16);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(8);
        card.setLayoutParams(lp);

        // Icon
        View icon = new View(this);
        LinearLayout.LayoutParams iconLp = new LinearLayout.LayoutParams(dp(40), dp(40));
        icon.setLayoutParams(iconLp);
        icon.setBackgroundResource(bgIconRes);
        card.addView(icon);

        // Text
        LinearLayout textContainer = new LinearLayout(this);
        textContainer.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams textLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        textLp.leftMargin = dp(12);
        textContainer.setLayoutParams(textLp);

        TextView tvTitle2 = new TextView(this);
        tvTitle2.setText(title);
        tvTitle2.setTextColor(getColor(R.color.white));
        tvTitle2.setTextSize(15);
        textContainer.addView(tvTitle2);

        if (desc != null && !desc.isEmpty()) {
            TextView tvDesc = new TextView(this);
            tvDesc.setText(desc);
            tvDesc.setTextColor(getColor(R.color.slate_400));
            tvDesc.setTextSize(12);
            textContainer.addView(tvDesc);
        }

        card.addView(textContainer);
        container.addView(card);
        return card;
    }

    /** Helper to add a section title */
    protected void addSectionTitle(LinearLayout container, String title) {
        TextView tv = new TextView(this);
        tv.setText(title);
        tv.setTextColor(getColor(R.color.slate_400));
        tv.setTextSize(13);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(20);
        lp.bottomMargin = dp(8);
        lp.leftMargin = dp(4);
        tv.setLayoutParams(lp);
        container.addView(tv);
    }

    /** Helper to add input field */
    protected android.widget.EditText addInputField(LinearLayout container, String label, String hint, int inputType) {
        TextView tvLabel = new TextView(this);
        tvLabel.setText(label);
        tvLabel.setTextColor(getColor(R.color.slate_300));
        tvLabel.setTextSize(14);
        LinearLayout.LayoutParams labelLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        labelLp.topMargin = dp(12);
        labelLp.bottomMargin = dp(6);
        tvLabel.setLayoutParams(labelLp);
        container.addView(tvLabel);

        android.widget.EditText et = new android.widget.EditText(this);
        et.setHint(hint);
        et.setInputType(inputType);
        et.setBackgroundResource(R.drawable.bg_input);
        et.setTextColor(getColor(R.color.white));
        et.setHintTextColor(getColor(R.color.slate_400));
        et.setTextSize(15);
        int pad2 = dp(14);
        et.setPadding(pad2, pad2, pad2, pad2);
        LinearLayout.LayoutParams etLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        et.setLayoutParams(etLp);
        container.addView(et);

        return et;
    }

    protected int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density);
    }
}
