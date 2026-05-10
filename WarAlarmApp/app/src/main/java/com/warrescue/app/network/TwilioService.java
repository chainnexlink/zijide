package com.warrescue.app.network;

import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.Log;

import com.warrescue.app.BuildConfig;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Twilio SMS/Voice service using REST API.
 * Uses API Key authentication (SID + Secret).
 *
 * IMPORTANT: In production, Twilio calls should go through a backend server.
 * Direct client-side calls expose credentials in the APK.
 */
public class TwilioService {

    private static final String TAG = "TwilioService";
    private static final String BASE_URL = "https://api.twilio.com/2010-04-01";

    private final String keySid;
    private final String keySecret;
    private final ExecutorService executor;
    private final Handler mainHandler;

    private String accountSid;   // Must be set before sending
    private String fromNumber;   // Twilio phone number

    public interface TwilioCallback {
        void onSuccess(String messageSid);
        void onError(String error);
    }

    public TwilioService() {
        this.keySid = BuildConfig.TWILIO_KEY_SID;
        this.keySecret = BuildConfig.TWILIO_KEY_SECRET;
        this.accountSid = BuildConfig.TWILIO_ACCOUNT_SID;
        this.executor = Executors.newSingleThreadExecutor();
        this.mainHandler = new Handler(Looper.getMainLooper());
    }

    /**
     * Configure with Twilio From phone number.
     * Account SID is loaded from BuildConfig automatically.
     */
    public TwilioService configure(String fromNumber) {
        this.fromNumber = fromNumber;
        return this;
    }

    /**
     * Configure with explicit Account SID and From number.
     */
    public TwilioService configure(String accountSid, String fromNumber) {
        this.accountSid = accountSid;
        this.fromNumber = fromNumber;
        return this;
    }

    public boolean isConfigured() {
        return accountSid != null && !accountSid.isEmpty()
                && fromNumber != null && !fromNumber.isEmpty()
                && keySid != null && !keySid.isEmpty();
    }

    /**
     * Send SMS via Twilio REST API.
     *
     * @param to      recipient phone number (E.164 format: +1234567890)
     * @param body    message body
     * @param callback result callback on main thread
     */
    public void sendSMS(String to, String body, TwilioCallback callback) {
        if (!isConfigured()) {
            mainHandler.post(() -> callback.onError("Twilio not configured: missing accountSid or fromNumber"));
            return;
        }

        executor.execute(() -> {
            try {
                String url = BASE_URL + "/Accounts/" + accountSid + "/Messages.json";
                String postData = "To=" + URLEncoder.encode(to, "UTF-8")
                        + "&From=" + URLEncoder.encode(fromNumber, "UTF-8")
                        + "&Body=" + URLEncoder.encode(body, "UTF-8");

                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setRequestMethod("POST");
                conn.setDoOutput(true);

                // API Key authentication
                String credentials = keySid + ":" + keySecret;
                String auth = "Basic " + Base64.encodeToString(credentials.getBytes(), Base64.NO_WRAP);
                conn.setRequestProperty("Authorization", auth);
                conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(postData.getBytes("UTF-8"));
                }

                int responseCode = conn.getResponseCode();
                StringBuilder response = new StringBuilder();

                if (responseCode == 201 || responseCode == 200) {
                    try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
                        String line;
                        while ((line = br.readLine()) != null) response.append(line);
                    }
                    String resp = response.toString();
                    // Extract SID from JSON response (simple parsing)
                    String sid = extractJsonValue(resp, "sid");
                    Log.i(TAG, "SMS sent successfully: " + sid);
                    mainHandler.post(() -> callback.onSuccess(sid != null ? sid : "sent"));
                } else {
                    try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getErrorStream()))) {
                        String line;
                        while ((line = br.readLine()) != null) response.append(line);
                    }
                    String errorMsg = extractJsonValue(response.toString(), "message");
                    Log.e(TAG, "SMS failed (" + responseCode + "): " + response);
                    mainHandler.post(() -> callback.onError(errorMsg != null ? errorMsg : "HTTP " + responseCode));
                }

                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "SMS exception", e);
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    /**
     * Send emergency SOS SMS to multiple recipients.
     */
    public void sendEmergencySMS(String[] recipients, String alertMessage, TwilioCallback callback) {
        if (recipients == null || recipients.length == 0) {
            mainHandler.post(() -> callback.onError("No recipients"));
            return;
        }

        executor.execute(() -> {
            int successCount = 0;
            String lastError = null;

            for (String to : recipients) {
                try {
                    sendSMSSync(to, "[WarRescue SOS] " + alertMessage);
                    successCount++;
                } catch (Exception e) {
                    lastError = e.getMessage();
                    Log.e(TAG, "Failed to send SOS to " + to, e);
                }
            }

            int finalSuccess = successCount;
            String finalError = lastError;
            if (finalSuccess > 0) {
                mainHandler.post(() -> callback.onSuccess(finalSuccess + "/" + recipients.length + " sent"));
            } else {
                mainHandler.post(() -> callback.onError(finalError != null ? finalError : "All SMS failed"));
            }
        });
    }

    private void sendSMSSync(String to, String body) throws Exception {
        if (!isConfigured()) throw new Exception("Twilio not configured");

        String url = BASE_URL + "/Accounts/" + accountSid + "/Messages.json";
        String postData = "To=" + URLEncoder.encode(to, "UTF-8")
                + "&From=" + URLEncoder.encode(fromNumber, "UTF-8")
                + "&Body=" + URLEncoder.encode(body, "UTF-8");

        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);

        String credentials = keySid + ":" + keySecret;
        String auth = "Basic " + Base64.encodeToString(credentials.getBytes(), Base64.NO_WRAP);
        conn.setRequestProperty("Authorization", auth);
        conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

        try (OutputStream os = conn.getOutputStream()) {
            os.write(postData.getBytes("UTF-8"));
        }

        int code = conn.getResponseCode();
        conn.disconnect();

        if (code != 201 && code != 200) {
            throw new Exception("Twilio SMS failed: HTTP " + code);
        }
    }

    /**
     * Make a voice call via Twilio.
     */
    public void makeCall(String to, String twimlUrl, TwilioCallback callback) {
        if (!isConfigured()) {
            mainHandler.post(() -> callback.onError("Twilio not configured"));
            return;
        }

        executor.execute(() -> {
            try {
                String url = BASE_URL + "/Accounts/" + accountSid + "/Calls.json";
                String postData = "To=" + URLEncoder.encode(to, "UTF-8")
                        + "&From=" + URLEncoder.encode(fromNumber, "UTF-8")
                        + "&Url=" + URLEncoder.encode(twimlUrl, "UTF-8");

                HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setRequestMethod("POST");
                conn.setDoOutput(true);

                String credentials = keySid + ":" + keySecret;
                String auth = "Basic " + Base64.encodeToString(credentials.getBytes(), Base64.NO_WRAP);
                conn.setRequestProperty("Authorization", auth);
                conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(postData.getBytes("UTF-8"));
                }

                int responseCode = conn.getResponseCode();
                if (responseCode == 201 || responseCode == 200) {
                    Log.i(TAG, "Call initiated successfully");
                    mainHandler.post(() -> callback.onSuccess("call_initiated"));
                } else {
                    Log.e(TAG, "Call failed: HTTP " + responseCode);
                    mainHandler.post(() -> callback.onError("HTTP " + responseCode));
                }

                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "Call exception", e);
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    private String extractJsonValue(String json, String key) {
        try {
            String search = "\"" + key + "\"";
            int idx = json.indexOf(search);
            if (idx < 0) return null;
            int colonIdx = json.indexOf(":", idx);
            if (colonIdx < 0) return null;
            int startQuote = json.indexOf("\"", colonIdx);
            if (startQuote < 0) return null;
            int endQuote = json.indexOf("\"", startQuote + 1);
            if (endQuote < 0) return null;
            return json.substring(startQuote + 1, endQuote);
        } catch (Exception e) {
            return null;
        }
    }

    public void shutdown() {
        executor.shutdown();
    }
}
