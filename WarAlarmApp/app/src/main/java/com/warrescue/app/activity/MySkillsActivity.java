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

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * L3: 技能管理 - 用户管理自己的互助技能
 */
public class MySkillsActivity extends BaseDetailActivity {

    private LinearLayout skillsContainer;
    private String userId;

    @Override
    protected String getPageTitle() { return getString(R.string.aid_my_skills_manage); }

    @Override
    protected void buildContent(LinearLayout container) {
        SessionManager sm = new SessionManager(this);
        userId = sm.getUserId();

        // Add skill form
        addSectionTitle(container, getString(R.string.aid_add_skill));

        // Skill type chips
        LinearLayout typeRow = new LinearLayout(this);
        typeRow.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams trLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        trLp.bottomMargin = dp(8);
        typeRow.setLayoutParams(trLp);

        final String[] skillType = {"medical"};
        String[][] skillTypes = {
            {"medical", "医疗急救"},
            {"driving", "驾驶"},
            {"translation", "翻译"},
        };

        LinearLayout typeRow2 = new LinearLayout(this);
        typeRow2.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams tr2Lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        tr2Lp.bottomMargin = dp(12);
        typeRow2.setLayoutParams(tr2Lp);

        String[][] skillTypes2 = {
            {"technical", "技术"},
            {"cooking", "烹饪"},
            {"other", "其他"},
        };

        for (String[] st : skillTypes) {
            addSkillTypeChip(typeRow, st[0], st[1], skillType);
        }
        for (String[] st : skillTypes2) {
            addSkillTypeChip(typeRow2, st[0], st[1], skillType);
        }

        container.addView(typeRow);
        container.addView(typeRow2);

        EditText nameInput = addInputField(container, "技能名称", getString(R.string.aid_skill_name_hint), InputType.TYPE_CLASS_TEXT);
        EditText descInput = addInputField(container, "技能描述", getString(R.string.aid_skill_desc_hint), InputType.TYPE_CLASS_TEXT);

        // Add button
        LinearLayout.LayoutParams addLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(44));
        addLp.topMargin = dp(12);
        addLp.bottomMargin = dp(8);

        TextView addBtn = new TextView(this);
        addBtn.setText(getString(R.string.aid_add_skill));
        addBtn.setTextColor(getColor(R.color.white));
        addBtn.setTextSize(14);
        addBtn.setTypeface(null, Typeface.BOLD);
        addBtn.setGravity(Gravity.CENTER);
        addBtn.setBackgroundResource(R.drawable.bg_icon_blue);
        addBtn.setLayoutParams(addLp);
        addBtn.setOnClickListener(v -> {
            String name = nameInput.getText().toString().trim();
            if (name.isEmpty()) {
                Toast.makeText(this, "请输入技能名称", Toast.LENGTH_SHORT).show();
                return;
            }
            addSkill(skillType[0], name, descInput.getText().toString().trim());
            nameInput.setText("");
            descInput.setText("");
        });
        container.addView(addBtn);

        // My skills list
        addSectionTitle(container, "我的技能列表");
        skillsContainer = new LinearLayout(this);
        skillsContainer.setOrientation(LinearLayout.VERTICAL);
        container.addView(skillsContainer);

        loadSkills();
    }

    private void addSkillTypeChip(LinearLayout parent, String type, String label, String[] selectedType) {
        TextView chip = new TextView(this);
        chip.setText(label);
        chip.setTextSize(13);
        chip.setTextColor(type.equals(selectedType[0]) ? getColor(R.color.blue_400) : getColor(R.color.slate_300));
        chip.setBackgroundResource(R.drawable.bg_card);
        int p = dp(10);
        chip.setPadding(p, dp(6), p, dp(6));
        chip.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        lp.rightMargin = dp(6);
        chip.setLayoutParams(lp);
        chip.setOnClickListener(v -> {
            selectedType[0] = type;
            LinearLayout row = (LinearLayout) chip.getParent();
            for (int i = 0; i < row.getChildCount(); i++) {
                ((TextView) row.getChildAt(i)).setTextColor(getColor(R.color.slate_300));
            }
            chip.setTextColor(getColor(R.color.blue_400));
        });
        parent.addView(chip);
    }

    private void loadSkills() {
        skillsContainer.removeAllViews();
        if (userId == null || userId.isEmpty()) {
            showEmpty();
            return;
        }

        TextView loading = new TextView(this);
        loading.setText(getString(R.string.loading));
        loading.setTextColor(getColor(R.color.slate_400));
        loading.setGravity(Gravity.CENTER);
        loading.setPadding(0, dp(20), 0, dp(20));
        skillsContainer.addView(loading);

        DataRepository.getMutualAidSkills(userId, new DataRepository.DataCallback<JSONArray>() {
            @Override
            public void onData(JSONArray data) {
                skillsContainer.removeAllViews();
                if (data.length() == 0) {
                    showEmpty();
                    return;
                }
                for (int i = 0; i < data.length(); i++) {
                    JSONObject skill = data.optJSONObject(i);
                    if (skill != null) addSkillItem(skill);
                }
            }
            @Override
            public void onError(String error) {
                skillsContainer.removeAllViews();
                showEmpty();
            }
        });
    }

    private void addSkillItem(JSONObject skill) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.HORIZONTAL);
        card.setBackgroundResource(R.drawable.bg_card);
        card.setGravity(Gravity.CENTER_VERTICAL);
        int pad = dp(14);
        card.setPadding(pad, pad, pad, pad);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(6);
        card.setLayoutParams(lp);

        LinearLayout info = new LinearLayout(this);
        info.setOrientation(LinearLayout.VERTICAL);
        info.setLayoutParams(new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        TextView name = new TextView(this);
        name.setText(skill.optString("skill_name", ""));
        name.setTextColor(getColor(R.color.white));
        name.setTextSize(14);
        name.setTypeface(null, Typeface.BOLD);
        info.addView(name);

        String type = skill.optString("skill_type", "");
        String desc = skill.optString("description", "");
        TextView meta = new TextView(this);
        meta.setText(getSkillTypeName(type) + (desc.isEmpty() ? "" : " · " + desc));
        meta.setTextColor(getColor(R.color.slate_400));
        meta.setTextSize(12);
        info.addView(meta);

        card.addView(info);

        boolean verified = skill.optBoolean("is_verified", false);
        if (verified) {
            TextView badge = new TextView(this);
            badge.setText("已认证");
            badge.setTextSize(11);
            badge.setTextColor(getColor(R.color.green_400));
            card.addView(badge);
        }

        skillsContainer.addView(card);
    }

    private void addSkill(String type, String name, String desc) {
        if (userId == null || userId.isEmpty()) {
            Toast.makeText(this, "请先登录", Toast.LENGTH_SHORT).show();
            return;
        }
        try {
            JSONObject skill = new JSONObject();
            skill.put("user_id", userId);
            skill.put("skill_type", type);
            skill.put("skill_name", name);
            skill.put("description", desc);

            DataRepository.addMutualAidSkill(skill, new DataRepository.DataCallback<JSONObject>() {
                @Override
                public void onData(JSONObject data) {
                    Toast.makeText(MySkillsActivity.this, getString(R.string.aid_skill_added), Toast.LENGTH_SHORT).show();
                    loadSkills();
                }
                @Override
                public void onError(String error) {
                    Toast.makeText(MySkillsActivity.this, "添加失败: " + error, Toast.LENGTH_SHORT).show();
                }
            });
        } catch (Exception e) {
            Toast.makeText(this, "添加失败", Toast.LENGTH_SHORT).show();
        }
    }

    private String getSkillTypeName(String type) {
        switch (type) {
            case "medical": return "医疗急救";
            case "driving": return "驾驶";
            case "translation": return "翻译";
            case "technical": return "技术";
            case "cooking": return "烹饪";
            default: return "其他";
        }
    }

    private void showEmpty() {
        TextView empty = new TextView(this);
        empty.setText(getString(R.string.aid_no_skills));
        empty.setTextColor(getColor(R.color.slate_400));
        empty.setGravity(Gravity.CENTER);
        empty.setPadding(0, dp(20), 0, dp(20));
        skillsContainer.addView(empty);
    }
}
