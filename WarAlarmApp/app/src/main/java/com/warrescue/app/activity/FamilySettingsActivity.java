package com.warrescue.app.activity;

import android.content.Intent;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.Toast;

import com.warrescue.app.R;
import com.warrescue.app.model.FamilyMember;
import com.warrescue.app.data.DataRepository;

import java.util.List;

public class FamilySettingsActivity extends BaseDetailActivity {
    @Override
    protected String getPageTitle() { return getString(R.string.family_group); }

    @Override
    protected void buildContent(LinearLayout container) {
        // Section title placeholder (will be updated with count)
        addSectionTitle(container, getString(R.string.family_members));

        // Placeholder for member cards
        LinearLayout membersContainer = new LinearLayout(this);
        membersContainer.setOrientation(LinearLayout.VERTICAL);
        container.addView(membersContainer);

        // Load family members asynchronously from Supabase API
        DataRepository.getFamilyMembers(this, new DataRepository.DataCallback<List<FamilyMember>>() {
            @Override
            public void onData(List<FamilyMember> members) {
                renderMembers(membersContainer, members);
            }
            @Override
            public void onError(String error) {
                // Show empty state
            }
        });

        Button btnInvite = new Button(this);
        btnInvite.setText(getString(R.string.invite_member));
        btnInvite.setTextColor(getColor(R.color.white));
        btnInvite.setBackgroundResource(R.drawable.bg_button_primary);
        btnInvite.setAllCaps(false);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
        lp.topMargin = dp(16);
        btnInvite.setLayoutParams(lp);
        btnInvite.setOnClickListener(v ->
                Toast.makeText(this, getString(R.string.invite_copied), Toast.LENGTH_SHORT).show());
        container.addView(btnInvite);

        addSectionTitle(container, getString(R.string.family_settings));
        addSettingCard(container, getString(R.string.meeting_point), getString(R.string.meeting_point_desc), R.drawable.bg_icon_amber);
        addSettingCard(container, getString(R.string.location_sharing), getString(R.string.location_sharing_desc), R.drawable.bg_icon_blue);
        addSettingCard(container, getString(R.string.sos_link), getString(R.string.sos_link_desc), R.drawable.bg_icon_red);
    }

    private void renderMembers(LinearLayout membersContainer, List<FamilyMember> members) {
        for (FamilyMember m : members) {
            String status = m.isOnline() ? getString(R.string.online) : getString(R.string.offline);
            String role = "admin".equals(m.getRole()) ? " \u00b7 " + getString(R.string.admin) : "";
            addSettingCard(membersContainer,
                    m.getNickname() + role,
                    status + (m.getLastSeen() != null ? " \u00b7 " + m.getLastSeen() : ""),
                    m.isOnline() ? R.drawable.bg_icon_green : R.drawable.bg_icon_red)
                    .setOnClickListener(v -> {
                        Intent intent = new Intent(this, FamilyMemberDetailActivity.class);
                        intent.putExtra("member_name", m.getNickname());
                        intent.putExtra("member_online", m.isOnline());
                        intent.putExtra("member_role", m.getRole());
                        intent.putExtra("member_last_seen", m.getLastSeen());
                        startActivity(intent);
                    });
        }
    }
}
