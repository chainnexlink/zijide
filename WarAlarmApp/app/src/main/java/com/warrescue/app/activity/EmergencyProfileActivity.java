package com.warrescue.app.activity;

import android.content.SharedPreferences;
import android.text.InputType;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Toast;

import com.warrescue.app.R;

public class EmergencyProfileActivity extends BaseDetailActivity {

    private EditText etBlood, etAge, etHeight, etWeight;
    private EditText etDrugAllergy, etFoodAllergy;
    private EditText etHistory, etMedication;
    private EditText etContact1Name, etContact1Phone;

    @Override
    protected String getPageTitle() { return getString(R.string.emergency_profile); }

    @Override
    protected void buildContent(LinearLayout container) {
        SharedPreferences sp = getSharedPreferences("emergency", MODE_PRIVATE);

        addSectionTitle(container, getString(R.string.basic_info));
        etBlood = addInputField(container, getString(R.string.blood_type), getString(R.string.hint_blood_type), InputType.TYPE_CLASS_TEXT);
        etBlood.setText(sp.getString("blood", "O+"));

        etAge = addInputField(container, getString(R.string.age), getString(R.string.hint_age), InputType.TYPE_CLASS_NUMBER);
        etAge.setText(sp.getString("age", "32"));

        etHeight = addInputField(container, getString(R.string.height_cm), getString(R.string.hint_height), InputType.TYPE_CLASS_NUMBER);
        etHeight.setText(sp.getString("height", "175"));

        etWeight = addInputField(container, getString(R.string.weight_kg), getString(R.string.hint_weight), InputType.TYPE_CLASS_NUMBER);
        etWeight.setText(sp.getString("weight", "70"));

        addSectionTitle(container, getString(R.string.allergy_history));
        etDrugAllergy = addInputField(container, getString(R.string.drug_allergy), getString(R.string.hint_drug_allergy), InputType.TYPE_CLASS_TEXT);
        etDrugAllergy.setText(sp.getString("drug_allergy", getString(R.string.default_drug_allergy)));

        etFoodAllergy = addInputField(container, getString(R.string.food_allergy), getString(R.string.hint_food_allergy), InputType.TYPE_CLASS_TEXT);
        etFoodAllergy.setText(sp.getString("food_allergy", getString(R.string.none)));

        addSectionTitle(container, getString(R.string.chronic_disease));
        etHistory = addInputField(container, getString(R.string.medical_history), getString(R.string.hint_chronic), InputType.TYPE_CLASS_TEXT);
        etHistory.setText(sp.getString("history", getString(R.string.none)));

        etMedication = addInputField(container, getString(R.string.current_medication), getString(R.string.hint_medication), InputType.TYPE_CLASS_TEXT);
        etMedication.setText(sp.getString("medication", getString(R.string.none)));

        addSectionTitle(container, getString(R.string.emergency_contact));
        etContact1Name = addInputField(container, getString(R.string.contact_1_name), getString(R.string.hint_name), InputType.TYPE_CLASS_TEXT);
        etContact1Name.setText(sp.getString("contact1_name", getString(R.string.default_contact_1_name)));

        etContact1Phone = addInputField(container, getString(R.string.contact_1_phone), getString(R.string.hint_phone_number), InputType.TYPE_CLASS_PHONE);
        etContact1Phone.setText(sp.getString("contact1_phone", "+380 50 111 2222"));

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
                .putString("blood", etBlood.getText().toString())
                .putString("age", etAge.getText().toString())
                .putString("height", etHeight.getText().toString())
                .putString("weight", etWeight.getText().toString())
                .putString("drug_allergy", etDrugAllergy.getText().toString())
                .putString("food_allergy", etFoodAllergy.getText().toString())
                .putString("history", etHistory.getText().toString())
                .putString("medication", etMedication.getText().toString())
                .putString("contact1_name", etContact1Name.getText().toString())
                .putString("contact1_phone", etContact1Phone.getText().toString())
                .apply();
            Toast.makeText(this, getString(R.string.emergency_saved), Toast.LENGTH_SHORT).show();
            finish();
        });
        container.addView(btnSave);
    }
}
