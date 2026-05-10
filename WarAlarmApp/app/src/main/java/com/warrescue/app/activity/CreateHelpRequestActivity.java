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
 * L3: 发布求助 - 创建新的互助求助事件
 */
public class CreateHelpRequestActivity extends BaseDetailActivity {

    private EditText titleInput;
    private EditText descInput;
    private String selectedType = "general";
    private String selectedUrgency = "normal";

    @Override
    protected String getPageTitle() { return getString(R.string.aid_create_request); }

    @Override
    protected void buildContent(LinearLayout container) {
        // Type selection
        addSectionTitle(container, "求助类型");

        LinearLayout typeGrid = new LinearLayout(this);
        typeGrid.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams tgLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        tgLp.bottomMargin = dp(8);
        typeGrid.setLayoutParams(tgLp);

        String[][] types = {
            {"medical", getString(R.string.aid_type_medical)},
            {"supply", getString(R.string.aid_type_supply)},
            {"translate", getString(R.string.aid_type_translate)},
        };

        LinearLayout typeGrid2 = new LinearLayout(this);
        typeGrid2.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams tg2Lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        tg2Lp.bottomMargin = dp(16);
        typeGrid2.setLayoutParams(tg2Lp);

        String[][] types2 = {
            {"transport", getString(R.string.aid_type_transport)},
            {"shelter", getString(R.string.aid_type_shelter)},
            {"general", getString(R.string.aid_type_general)},
        };

        for (String[] t : types) addTypeChip(typeGrid, t[0], t[1]);
        for (String[] t : types2) addTypeChip(typeGrid2, t[0], t[1]);

        container.addView(typeGrid);
        container.addView(typeGrid2);

        // Urgency selection
        addSectionTitle(container, "紧急程度");
        LinearLayout urgRow = new LinearLayout(this);
        urgRow.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams urLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        urLp.bottomMargin = dp(16);
        urgRow.setLayoutParams(urLp);

        addUrgencyChip(urgRow, "urgent", getString(R.string.aid_urgency_urgent), R.color.red_500);
        addUrgencyChip(urgRow, "normal", getString(R.string.aid_urgency_normal), R.color.amber_500);
        addUrgencyChip(urgRow, "low", getString(R.string.aid_urgency_low), R.color.slate_400);

        container.addView(urgRow);

        // Title input
        titleInput = addInputField(container, "求助标题", getString(R.string.aid_request_title_hint), InputType.TYPE_CLASS_TEXT);

        // Description input
        addSectionTitle(container, "详细描述");
        descInput = new EditText(this);
        descInput.setHint(getString(R.string.aid_request_desc_hint));
        descInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
        descInput.setMinLines(4);
        descInput.setGravity(Gravity.TOP);
        descInput.setBackgroundResource(R.drawable.bg_input);
        descInput.setTextColor(getColor(R.color.white));
        descInput.setHintTextColor(getColor(R.color.slate_400));
        descInput.setTextSize(15);
        int pad = dp(14);
        descInput.setPadding(pad, pad, pad, pad);
        container.addView(descInput);

        // Submit button
        LinearLayout.LayoutParams submitLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(50));
        submitLp.topMargin = dp(24);

        TextView submitBtn = new TextView(this);
        submitBtn.setText(getString(R.string.aid_i_need_help));
        submitBtn.setTextColor(getColor(R.color.white));
        submitBtn.setTextSize(16);
        submitBtn.setTypeface(null, Typeface.BOLD);
        submitBtn.setGravity(Gravity.CENTER);
        submitBtn.setBackgroundResource(R.drawable.bg_icon_blue);
        submitBtn.setLayoutParams(submitLp);
        submitBtn.setOnClickListener(v -> submitRequest());
        container.addView(submitBtn);
    }

    private void addTypeChip(LinearLayout parent, String type, String label) {
        TextView chip = new TextView(this);
        chip.setText(label);
        chip.setTextSize(13);
        chip.setTextColor(type.equals(selectedType) ? getColor(R.color.blue_400) : getColor(R.color.slate_300));
        chip.setBackgroundResource(R.drawable.bg_card);
        int p = dp(10);
        chip.setPadding(p, dp(8), p, dp(8));
        chip.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        lp.rightMargin = dp(6);
        chip.setLayoutParams(lp);
        chip.setOnClickListener(v -> {
            selectedType = type;
            // Refresh visual state
            LinearLayout row = (LinearLayout) chip.getParent();
            for (int i = 0; i < row.getChildCount(); i++) {
                ((TextView) row.getChildAt(i)).setTextColor(getColor(R.color.slate_300));
            }
            chip.setTextColor(getColor(R.color.blue_400));
        });
        parent.addView(chip);
    }

    private void addUrgencyChip(LinearLayout parent, String urgency, String label, int colorRes) {
        TextView chip = new TextView(this);
        chip.setText(label);
        chip.setTextSize(13);
        chip.setTextColor(urgency.equals(selectedUrgency) ? getColor(colorRes) : getColor(R.color.slate_300));
        chip.setBackgroundResource(R.drawable.bg_card);
        int p = dp(12);
        chip.setPadding(p, dp(8), p, dp(8));
        chip.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        lp.rightMargin = dp(6);
        chip.setLayoutParams(lp);
        chip.setOnClickListener(v -> {
            selectedUrgency = urgency;
            LinearLayout row = (LinearLayout) chip.getParent();
            for (int i = 0; i < row.getChildCount(); i++) {
                ((TextView) row.getChildAt(i)).setTextColor(getColor(R.color.slate_300));
            }
            chip.setTextColor(getColor(colorRes));
        });
        parent.addView(chip);
    }

    private void submitRequest() {
        String title = titleInput.getText().toString().trim();
        String desc = descInput.getText().toString().trim();

        if (title.isEmpty()) {
            Toast.makeText(this, "请输入求助标题", Toast.LENGTH_SHORT).show();
            return;
        }

        SessionManager sm = new SessionManager(this);
        String userId = sm.getUserId();
        if (userId == null || userId.isEmpty()) {
            Toast.makeText(this, "请先登录", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            JSONObject event = new JSONObject();
            event.put("user_id", userId);
            event.put("event_type", selectedType);
            event.put("title", title);
            event.put("description", desc);
            event.put("urgency", selectedUrgency);
            event.put("status", "waiting");
            event.put("latitude", 50.4501);
            event.put("longitude", 30.5234);

            DataRepository.createMutualAidEvent(event, new DataRepository.DataCallback<JSONObject>() {
                @Override
                public void onData(JSONObject data) {
                    Toast.makeText(CreateHelpRequestActivity.this,
                            getString(R.string.aid_request_submitted), Toast.LENGTH_LONG).show();
                    finish();
                }
                @Override
                public void onError(String error) {
                    Toast.makeText(CreateHelpRequestActivity.this,
                            "发布失败: " + error, Toast.LENGTH_SHORT).show();
                }
            });
        } catch (Exception e) {
            Toast.makeText(this, "发布失败", Toast.LENGTH_SHORT).show();
        }
    }
}
