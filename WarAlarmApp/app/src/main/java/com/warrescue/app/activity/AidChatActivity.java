package com.warrescue.app.activity;

import android.graphics.Typeface;
import android.os.Handler;
import android.text.InputType;
import android.view.Gravity;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import com.warrescue.app.R;
import com.warrescue.app.data.DataRepository;
import com.warrescue.app.util.SessionManager;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * L4: 互助对话 - 求助者和响应者之间的实时聊天
 */
public class AidChatActivity extends BaseDetailActivity {

    private String eventId;
    private String userId;
    private LinearLayout messagesContainer;
    private EditText inputField;
    private Handler refreshHandler;
    private Runnable refreshRunnable;

    @Override
    protected String getPageTitle() { return getString(R.string.aid_chat); }

    @Override
    protected void buildContent(LinearLayout container) {
        SessionManager sm = new SessionManager(this);
        userId = sm.getUserId();
        eventId = getIntent().getStringExtra("event_id");

        // Chat messages area
        messagesContainer = new LinearLayout(this);
        messagesContainer.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams mcLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        mcLp.bottomMargin = dp(16);
        messagesContainer.setLayoutParams(mcLp);
        container.addView(messagesContainer);

        // Input area
        LinearLayout inputRow = new LinearLayout(this);
        inputRow.setOrientation(LinearLayout.HORIZONTAL);
        inputRow.setGravity(Gravity.CENTER_VERTICAL);
        inputRow.setBackgroundResource(R.drawable.bg_card);
        int pad = dp(8);
        inputRow.setPadding(pad, pad, pad, pad);

        inputField = new EditText(this);
        inputField.setHint(getString(R.string.aid_message_hint));
        inputField.setInputType(InputType.TYPE_CLASS_TEXT);
        inputField.setBackgroundResource(R.drawable.bg_input);
        inputField.setTextColor(getColor(R.color.white));
        inputField.setHintTextColor(getColor(R.color.slate_400));
        inputField.setTextSize(14);
        int iPadding = dp(10);
        inputField.setPadding(iPadding, iPadding, iPadding, iPadding);
        inputField.setLayoutParams(new LinearLayout.LayoutParams(0, dp(44), 1f));
        inputRow.addView(inputField);

        TextView sendBtn = new TextView(this);
        sendBtn.setText(getString(R.string.aid_send_message));
        sendBtn.setTextColor(getColor(R.color.blue_400));
        sendBtn.setTextSize(14);
        sendBtn.setTypeface(null, Typeface.BOLD);
        LinearLayout.LayoutParams sLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, dp(44));
        sLp.leftMargin = dp(8);
        sendBtn.setLayoutParams(sLp);
        sendBtn.setGravity(Gravity.CENTER);
        sendBtn.setOnClickListener(v -> sendMessage());
        inputRow.addView(sendBtn);

        container.addView(inputRow);

        // Load messages
        loadMessages();

        // Auto-refresh every 5 seconds
        refreshHandler = new Handler();
        refreshRunnable = new Runnable() {
            @Override
            public void run() {
                loadMessages();
                refreshHandler.postDelayed(this, 5000);
            }
        };
        refreshHandler.postDelayed(refreshRunnable, 5000);
    }

    private void loadMessages() {
        if (eventId == null) return;

        DataRepository.getMutualAidMessages(eventId, new DataRepository.DataCallback<JSONArray>() {
            @Override
            public void onData(JSONArray data) {
                messagesContainer.removeAllViews();
                if (data.length() == 0) {
                    TextView empty = new TextView(AidChatActivity.this);
                    empty.setText(getString(R.string.aid_no_messages));
                    empty.setTextColor(getColor(R.color.slate_400));
                    empty.setGravity(Gravity.CENTER);
                    empty.setPadding(0, dp(40), 0, dp(40));
                    messagesContainer.addView(empty);
                    return;
                }
                for (int i = 0; i < data.length(); i++) {
                    JSONObject msg = data.optJSONObject(i);
                    if (msg != null) addMessageBubble(msg);
                }
            }
            @Override
            public void onError(String error) {
                // Keep existing messages on error
            }
        });
    }

    private void addMessageBubble(JSONObject msg) {
        String senderId = msg.optString("sender_id", "");
        boolean isMe = userId != null && userId.equals(senderId);
        String msgType = msg.optString("message_type", "text");

        LinearLayout bubbleWrapper = new LinearLayout(this);
        bubbleWrapper.setOrientation(LinearLayout.VERTICAL);
        bubbleWrapper.setGravity(isMe ? Gravity.END : Gravity.START);
        LinearLayout.LayoutParams wLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        wLp.bottomMargin = dp(6);
        bubbleWrapper.setLayoutParams(wLp);

        // Sender label
        if (!isMe) {
            TextView sender = new TextView(this);
            sender.setText(senderId.substring(0, Math.min(10, senderId.length())));
            sender.setTextSize(11);
            sender.setTextColor(getColor(R.color.slate_400));
            LinearLayout.LayoutParams slLp = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            slLp.bottomMargin = dp(2);
            sender.setLayoutParams(slLp);
            bubbleWrapper.addView(sender);
        }

        // Message bubble
        TextView bubble = new TextView(this);
        bubble.setText(msg.optString("message", ""));
        bubble.setTextSize(14);
        bubble.setTextColor(getColor(R.color.white));
        bubble.setBackgroundResource(isMe ? R.drawable.bg_icon_blue : R.drawable.bg_card);
        int bPad = dp(12);
        bubble.setPadding(bPad, dp(8), bPad, dp(8));
        LinearLayout.LayoutParams bLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        bLp.gravity = isMe ? Gravity.END : Gravity.START;
        bubble.setLayoutParams(bLp);
        bubble.setMaxWidth((int)(getResources().getDisplayMetrics().widthPixels * 0.75));

        if ("system".equals(msgType)) {
            bubble.setTextColor(getColor(R.color.slate_400));
            bubble.setTextSize(12);
            bubble.setBackgroundResource(0);
            bubble.setGravity(Gravity.CENTER);
            bLp.gravity = Gravity.CENTER;
        }

        bubbleWrapper.addView(bubble);
        messagesContainer.addView(bubbleWrapper);
    }

    private void sendMessage() {
        String text = inputField.getText().toString().trim();
        if (text.isEmpty()) return;

        if (userId == null || userId.isEmpty()) {
            Toast.makeText(this, "请先登录", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            JSONObject message = new JSONObject();
            message.put("event_id", eventId);
            message.put("sender_id", userId);
            message.put("message", text);
            message.put("message_type", "text");

            inputField.setText("");

            DataRepository.sendMutualAidMessage(message, new DataRepository.DataCallback<JSONObject>() {
                @Override
                public void onData(JSONObject data) {
                    loadMessages(); // Refresh to show new message
                }
                @Override
                public void onError(String error) {
                    Toast.makeText(AidChatActivity.this, "发送失败: " + error, Toast.LENGTH_SHORT).show();
                }
            });
        } catch (Exception e) {
            Toast.makeText(this, "发送失败", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (refreshHandler != null && refreshRunnable != null) {
            refreshHandler.removeCallbacks(refreshRunnable);
        }
    }
}
