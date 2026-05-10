package com.warrescue.app.adapter;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.warrescue.app.R;
import com.warrescue.app.model.Alert;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class AlertAdapter extends RecyclerView.Adapter<AlertAdapter.AlertViewHolder> {

    private List<Alert> alerts = new ArrayList<>();
    private OnAlertClickListener listener;

    private static final Map<String, Integer> TYPE_LABEL_RES = new HashMap<>();
    static {
        TYPE_LABEL_RES.put("air_strike", R.string.air_strike);
        TYPE_LABEL_RES.put("artillery", R.string.artillery);
        TYPE_LABEL_RES.put("conflict", R.string.conflict);
        TYPE_LABEL_RES.put("curfew", R.string.curfew);
        TYPE_LABEL_RES.put("chemical", R.string.chemical);
        TYPE_LABEL_RES.put("other", R.string.other);
    }

    public interface OnAlertClickListener {
        void onAlertClick(Alert alert);
    }

    public AlertAdapter(OnAlertClickListener listener) {
        this.listener = listener;
    }

    public void setAlerts(List<Alert> alerts) {
        this.alerts = alerts;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public AlertViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_alert, parent, false);
        return new AlertViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull AlertViewHolder holder, int position) {
        Alert alert = alerts.get(position);
        Context ctx = holder.itemView.getContext();

        holder.tvTitle.setText(alert.getTitle());
        holder.tvDescription.setText(alert.getDescription());
        holder.tvCity.setText(alert.getCity());
        holder.tvTime.setText(getTimeAgo(ctx, alert.getCreatedAt()));
        holder.tvReliability.setText(alert.getReliabilityScore() + "%");

        Integer labelRes = TYPE_LABEL_RES.get(alert.getAlertType());
        holder.tvType.setText(ctx.getString(labelRes != null ? labelRes : R.string.other));

        // Severity color
        int colorRes;
        int bgRes;
        switch (alert.getSeverity()) {
            case "red":
                colorRes = R.color.red_500;
                bgRes = R.drawable.bg_alert_red;
                break;
            case "orange":
                colorRes = R.color.orange_500;
                bgRes = R.drawable.bg_alert_orange;
                break;
            case "yellow":
                colorRes = R.color.yellow_500;
                bgRes = R.drawable.bg_alert_yellow;
                break;
            default:
                colorRes = R.color.slate_500;
                bgRes = R.drawable.bg_card;
        }

        holder.viewSeverity.setBackgroundColor(ContextCompat.getColor(ctx, colorRes));
        holder.itemView.setBackgroundResource(bgRes);

        holder.itemView.setOnClickListener(v -> {
            if (listener != null) listener.onAlertClick(alert);
        });
    }

    @Override
    public int getItemCount() {
        return alerts.size();
    }

    private String getTimeAgo(Context ctx, String dateStr) {
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());
            Date date = sdf.parse(dateStr);
            if (date == null) return dateStr;

            long diff = System.currentTimeMillis() - date.getTime();
            long minutes = diff / 60000;
            long hours = diff / 3600000;
            long days = diff / 86400000;

            if (minutes < 60) return String.format(ctx.getString(R.string.time_ago_minutes), (int) minutes);
            if (hours < 24) return String.format(ctx.getString(R.string.time_ago_hours), (int) hours);
            return String.format(ctx.getString(R.string.time_ago_days), (int) days);
        } catch (ParseException e) {
            return dateStr;
        }
    }

    static class AlertViewHolder extends RecyclerView.ViewHolder {
        View viewSeverity;
        TextView tvTitle, tvDescription, tvCity, tvTime, tvReliability, tvType;

        AlertViewHolder(@NonNull View itemView) {
            super(itemView);
            viewSeverity = itemView.findViewById(R.id.viewSeverity);
            tvTitle = itemView.findViewById(R.id.tvTitle);
            tvDescription = itemView.findViewById(R.id.tvDescription);
            tvCity = itemView.findViewById(R.id.tvCity);
            tvTime = itemView.findViewById(R.id.tvTime);
            tvReliability = itemView.findViewById(R.id.tvReliability);
            tvType = itemView.findViewById(R.id.tvType);
        }
    }
}
