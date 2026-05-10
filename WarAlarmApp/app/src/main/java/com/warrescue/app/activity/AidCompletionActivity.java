package com.warrescue.app.activity;

import android.graphics.Typeface;
import android.text.InputType;
import android.view.Gravity;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.warrescue.app.R;
import com.warrescue.app.data.DataRepository;
import com.warrescue.app.util.SessionManager;

import org.json.JSONObject;

/**
 * L5: 完成评价 - 援助完成后提交评价和评分
 */
public class AidCompletionActivity extends BaseDetailActivity {

    private String eventId;
    private int selectedRating = 5;
    private TextView[] stars;
    private EditText commentInput;

    @Override
    protected String getPageTitle() { return getString(R.string.aid_complete_review); }

    @Override
    protected void buildContent(LinearLayout container) {
        eventId = getIntent().getStringExtra("event_id");

        // Completion banner
        LinearLayout banner = new LinearLayout(this);
        banner.setOrientation(LinearLayout.VERTICAL);
        banner.setBackgroundResource(R.drawable.bg_safe_status);
        banner.setGravity(Gravity.CENTER);
        int pad = dp(24);
        banner.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams bnLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        bnLp.bottomMargin = dp(20);
        banner.setLayoutParams(bnLp);

        TextView checkmark = new TextView(this);
        checkmark.setText("✓");
        checkmark.setTextSize(40);
        checkmark.setTextColor(getColor(R.color.green_400));
        checkmark.setGravity(Gravity.CENTER);
        banner.addView(checkmark);

        TextView completedText = new TextView(this);
        completedText.setText("援助已完成");
        completedText.setTextSize(20);
        completedText.setTextColor(getColor(R.color.white));
        completedText.setTypeface(null, Typeface.BOLD);
        completedText.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams ctLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        ctLp.topMargin = dp(8);
        completedText.setLayoutParams(ctLp);
        banner.addView(completedText);

        TextView thankText = new TextView(this);
        thankText.setText("感谢您参与互助，您的善举让社区更加安全");
        thankText.setTextSize(13);
        thankText.setTextColor(getColor(R.color.slate_300));
        thankText.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams ttLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        ttLp.topMargin = dp(4);
        thankText.setLayoutParams(ttLp);
        banner.addView(thankText);

        container.addView(banner);

        // Rating section
        addSectionTitle(container, getString(R.string.aid_rate_helper));

        LinearLayout starsRow = new LinearLayout(this);
        starsRow.setOrientation(LinearLayout.HORIZONTAL);
        starsRow.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams srLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        srLp.bottomMargin = dp(16);
        starsRow.setLayoutParams(srLp);

        stars = new TextView[5];
        for (int i = 0; i < 5; i++) {
            final int rating = i + 1;
            stars[i] = new TextView(this);
            stars[i].setText("★");
            stars[i].setTextSize(36);
            stars[i].setTextColor(getColor(rating <= selectedRating ? R.color.amber_500 : R.color.slate_400));
            stars[i].setGravity(Gravity.CENTER);
            LinearLayout.LayoutParams sLp = new LinearLayout.LayoutParams(dp(48), dp(48));
            sLp.leftMargin = dp(4);
            sLp.rightMargin = dp(4);
            stars[i].setLayoutParams(sLp);
            stars[i].setOnClickListener(v -> {
                selectedRating = rating;
                updateStars();
            });
            starsRow.addView(stars[i]);
        }

        container.addView(starsRow);

        // Rating label
        TextView ratingLabel = new TextView(this);
        ratingLabel.setText(getRatingLabel(selectedRating));
        ratingLabel.setTextSize(14);
        ratingLabel.setTextColor(getColor(R.color.amber_500));
        ratingLabel.setGravity(Gravity.CENTER);
        ratingLabel.setTag("ratingLabel");
        LinearLayout.LayoutParams rlLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        rlLp.bottomMargin = dp(20);
        ratingLabel.setLayoutParams(rlLp);
        container.addView(ratingLabel);

        // Comment input
        addSectionTitle(container, "评价内容");

        commentInput = new EditText(this);
        commentInput.setHint(getString(R.string.aid_review_comment_hint));
        commentInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        commentInput.setMinLines(3);
        commentInput.setGravity(Gravity.TOP);
        commentInput.setBackgroundResource(R.drawable.bg_input);
        commentInput.setTextColor(getColor(R.color.white));
        commentInput.setHintTextColor(getColor(R.color.slate_400));
        commentInput.setTextSize(15);
        int iPad = dp(14);
        commentInput.setPadding(iPad, iPad, iPad, iPad);
        container.addView(commentInput);

        // Submit button
        LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(50));
        subLp.topMargin = dp(24);

        TextView submitBtn = new TextView(this);
        submitBtn.setText(getString(R.string.aid_submit_review));
        submitBtn.setTextColor(getColor(R.color.white));
        submitBtn.setTextSize(16);
        submitBtn.setTypeface(null, Typeface.BOLD);
        submitBtn.setGravity(Gravity.CENTER);
        submitBtn.setBackgroundResource(R.drawable.bg_icon_blue);
        submitBtn.setLayoutParams(subLp);
        submitBtn.setOnClickListener(v -> submitReview());
        container.addView(submitBtn);

        // Skip button
        LinearLayout.LayoutParams skipLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(44));
        skipLp.topMargin = dp(8);

        TextView skipBtn = new TextView(this);
        skipBtn.setText("跳过评价");
        skipBtn.setTextColor(getColor(R.color.slate_400));
        skipBtn.setTextSize(14);
        skipBtn.setGravity(Gravity.CENTER);
        skipBtn.setLayoutParams(skipLp);
        skipBtn.setOnClickListener(v -> finish());
        container.addView(skipBtn);
    }

    private void updateStars() {
        for (int i = 0; i < 5; i++) {
            stars[i].setTextColor(getColor((i < selectedRating) ? R.color.amber_500 : R.color.slate_400));
        }
        // Find and update rating label
        TextView ratingLabel = contentContainer.findViewWithTag("ratingLabel");
        if (ratingLabel != null) {
            ratingLabel.setText(getRatingLabel(selectedRating));
        }
    }

    private String getRatingLabel(int rating) {
        switch (rating) {
            case 1: return "不满意";
            case 2: return "一般";
            case 3: return "还不错";
            case 4: return "非常好";
            case 5: return "太棒了！";
            default: return "";
        }
    }

    private void submitReview() {
        SessionManager sm = new SessionManager(this);
        String reviewerId = sm.getUserId();
        if (reviewerId == null || reviewerId.isEmpty()) {
            Toast.makeText(this, "请先登录", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            JSONObject review = new JSONObject();
            review.put("event_id", eventId);
            review.put("reviewer_id", reviewerId);
            review.put("reviewed_id", "responder"); // Will be the other party
            review.put("rating", selectedRating);
            review.put("comment", commentInput.getText().toString().trim());

            DataRepository.submitMutualAidReview(review, new DataRepository.DataCallback<JSONObject>() {
                @Override
                public void onData(JSONObject data) {
                    Toast.makeText(AidCompletionActivity.this,
                            getString(R.string.aid_review_submitted), Toast.LENGTH_LONG).show();
                    finish();
                }
                @Override
                public void onError(String error) {
                    Toast.makeText(AidCompletionActivity.this,
                            "提交失败: " + error, Toast.LENGTH_SHORT).show();
                }
            });
        } catch (Exception e) {
            Toast.makeText(this, "提交失败", Toast.LENGTH_SHORT).show();
        }
    }
}
