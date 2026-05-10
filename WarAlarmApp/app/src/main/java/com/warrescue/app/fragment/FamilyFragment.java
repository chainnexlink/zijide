package com.warrescue.app.fragment;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.warrescue.app.R;
import com.warrescue.app.activity.FamilyMemberDetailActivity;
import com.warrescue.app.model.FamilyMember;
import com.warrescue.app.data.DataRepository;

import java.util.List;

public class FamilyFragment extends Fragment {

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_family, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        LinearLayout memberContainer = view.findViewById(R.id.memberContainer);

        DataRepository.getFamilyMembers(requireContext(), new DataRepository.DataCallback<List<FamilyMember>>() {
            @Override
            public void onData(List<FamilyMember> members) {
                renderMembers(memberContainer, members);
            }
            @Override
            public void onError(String error) {}
        });
    }

    private void renderMembers(LinearLayout memberContainer, List<FamilyMember> members) {
        memberContainer.removeAllViews();
        for (FamilyMember member : members) {
            View card = LayoutInflater.from(requireContext()).inflate(R.layout.item_family_member, memberContainer, false);

            TextView tvName = card.findViewById(R.id.tvMemberName);
            TextView tvStatus = card.findViewById(R.id.tvMemberStatus);
            View viewOnline = card.findViewById(R.id.viewOnlineIndicator);

            tvName.setText(member.getNickname());
            tvStatus.setText(member.isOnline() ? getString(R.string.online) : getString(R.string.offline) + " \u00b7 " +
                    (member.getLastSeen() != null ? member.getLastSeen() : getString(R.string.no_data)));
            tvStatus.setTextColor(requireContext().getColor(
                    member.isOnline() ? R.color.green_400 : R.color.slate_400));
            viewOnline.setBackgroundColor(requireContext().getColor(
                    member.isOnline() ? R.color.green_500 : R.color.slate_600));

            // Click to navigate to member detail (Level 3)
            card.setClickable(true);
            card.setFocusable(true);
            card.setOnClickListener(v -> {
                Intent intent = new Intent(requireContext(), FamilyMemberDetailActivity.class);
                intent.putExtra("member_name", member.getNickname());
                intent.putExtra("member_online", member.isOnline());
                intent.putExtra("member_role", member.getRole());
                intent.putExtra("member_last_seen", member.getLastSeen());
                startActivity(intent);
            });

            memberContainer.addView(card);
        }
    }
}
