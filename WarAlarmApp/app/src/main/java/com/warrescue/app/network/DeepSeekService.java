package com.warrescue.app.network;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.warrescue.app.BuildConfig;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * DeepSeek AI service for real-time threat analysis and monitoring.
 * Uses DeepSeek Chat Completions API (OpenAI-compatible).
 *
 * Used by the AI Monitor feature to analyze threat data and generate alerts.
 */
public class DeepSeekService {

    private static final String TAG = "DeepSeekService";
    private static final String API_URL = "https://api.deepseek.com/chat/completions";
    private static final String MODEL = "deepseek-chat";

    private final String apiKey;
    private final ExecutorService executor;
    private final Handler mainHandler;

    public interface AICallback {
        void onResult(String analysis);
        void onError(String error);
    }

    /**
     * Threat analysis result from AI.
     */
    public static class ThreatAnalysis {
        public final String level;       // red, orange, yellow, green
        public final String type;        // air_strike, artillery, chemical, etc.
        public final String description;
        public final int confidence;     // 0-100
        public final String suggestion;

        public ThreatAnalysis(String level, String type, String description, int confidence, String suggestion) {
            this.level = level;
            this.type = type;
            this.description = description;
            this.confidence = confidence;
            this.suggestion = suggestion;
        }
    }

    public interface ThreatCallback {
        void onResult(ThreatAnalysis analysis);
        void onError(String error);
    }

    public DeepSeekService() {
        this.apiKey = BuildConfig.DEEPSEEK_API_KEY;
        this.executor = Executors.newFixedThreadPool(2);
        this.mainHandler = new Handler(Looper.getMainLooper());
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isEmpty();
    }

    /**
     * Analyze sensor data for potential threats.
     * Sends structured data to DeepSeek and receives threat assessment.
     */
    public void analyzeThreat(String sensorData, String location, ThreatCallback callback) {
        if (!isConfigured()) {
            mainHandler.post(() -> callback.onError("DeepSeek API not configured"));
            return;
        }

        String systemPrompt = "You are a military threat analysis AI for WarRescue app. "
                + "Analyze the provided sensor data and location information. "
                + "Respond ONLY in this exact JSON format:\n"
                + "{\"level\":\"red|orange|yellow|green\","
                + "\"type\":\"air_strike|artillery|chemical|conflict|curfew|safe\","
                + "\"description\":\"brief description\","
                + "\"confidence\":0-100,"
                + "\"suggestion\":\"recommended action\"}\n"
                + "Be concise. Level meanings: red=immediate danger, orange=warning, yellow=caution, green=safe.";

        String userMessage = "Location: " + location + "\nSensor Data:\n" + sensorData;

        callAPI(systemPrompt, userMessage, new AICallback() {
            @Override
            public void onResult(String analysis) {
                try {
                    ThreatAnalysis result = parseThreatAnalysis(analysis);
                    mainHandler.post(() -> callback.onResult(result));
                } catch (Exception e) {
                    mainHandler.post(() -> callback.onError("Failed to parse AI response: " + e.getMessage()));
                }
            }

            @Override
            public void onError(String error) {
                mainHandler.post(() -> callback.onError(error));
            }
        });
    }

    /**
     * Generate alert message for users based on threat data.
     */
    public void generateAlertMessage(String threatType, String location, String severity, AICallback callback) {
        if (!isConfigured()) {
            mainHandler.post(() -> callback.onError("DeepSeek API not configured"));
            return;
        }

        String systemPrompt = "You are a concise emergency alert generator for WarRescue app. "
                + "Generate a brief, clear emergency alert message (max 100 chars) suitable for push notifications. "
                + "Include: what happened, where, and immediate action needed. Respond with ONLY the alert text.";

        String userMessage = "Threat: " + threatType + "\nLocation: " + location + "\nSeverity: " + severity;

        callAPI(systemPrompt, userMessage, callback);
    }

    /**
     * Analyze city alert pattern for crowdsource verification.
     */
    public void verifyCityAlert(String alertType, String city, int userCount, String[] userReports, AICallback callback) {
        if (!isConfigured()) {
            mainHandler.post(() -> callback.onError("DeepSeek API not configured"));
            return;
        }

        String systemPrompt = "You are a crowdsource alert verification AI for WarRescue. "
                + "Analyze multiple user reports from the same city to determine if the alert is genuine. "
                + "Respond in JSON: {\"verified\":true|false,\"confidence\":0-100,\"summary\":\"brief analysis\"}";

        StringBuilder userMsg = new StringBuilder();
        userMsg.append("Alert Type: ").append(alertType).append("\n");
        userMsg.append("City: ").append(city).append("\n");
        userMsg.append("Responding Users: ").append(userCount).append("\n");
        userMsg.append("Reports:\n");
        if (userReports != null) {
            for (int i = 0; i < userReports.length; i++) {
                userMsg.append(i + 1).append(". ").append(userReports[i]).append("\n");
            }
        }

        callAPI(systemPrompt, userMsg.toString(), callback);
    }

    /**
     * Generic API call to DeepSeek Chat Completions.
     */
    public void callAPI(String systemPrompt, String userMessage, AICallback callback) {
        executor.execute(() -> {
            try {
                String requestBody = buildRequestBody(systemPrompt, userMessage);

                HttpURLConnection conn = (HttpURLConnection) new URL(API_URL).openConnection();
                conn.setRequestMethod("POST");
                conn.setDoOutput(true);
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(60000);
                conn.setRequestProperty("Authorization", "Bearer " + apiKey);
                conn.setRequestProperty("Content-Type", "application/json");

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(requestBody.getBytes("UTF-8"));
                }

                int responseCode = conn.getResponseCode();
                StringBuilder response = new StringBuilder();

                if (responseCode == 200) {
                    try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
                        String line;
                        while ((line = br.readLine()) != null) response.append(line);
                    }

                    String content = extractContent(response.toString());
                    Log.i(TAG, "AI response: " + content);
                    mainHandler.post(() -> callback.onResult(content));
                } else {
                    try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getErrorStream()))) {
                        String line;
                        while ((line = br.readLine()) != null) response.append(line);
                    }
                    Log.e(TAG, "API error (" + responseCode + "): " + response);
                    mainHandler.post(() -> callback.onError("API error: HTTP " + responseCode));
                }

                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "API exception", e);
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    private String buildRequestBody(String systemPrompt, String userMessage) {
        return "{\"model\":\"" + MODEL + "\","
                + "\"messages\":["
                + "{\"role\":\"system\",\"content\":" + jsonEscape(systemPrompt) + "},"
                + "{\"role\":\"user\",\"content\":" + jsonEscape(userMessage) + "}"
                + "],"
                + "\"temperature\":0.3,"
                + "\"max_tokens\":500}";
    }

    private String jsonEscape(String text) {
        if (text == null) return "\"\"";
        return "\"" + text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t")
                + "\"";
    }

    /**
     * Extract the assistant's message content from the API response.
     */
    private String extractContent(String json) {
        try {
            // Find "content":"..." in the response
            String marker = "\"content\"";
            int lastIdx = json.lastIndexOf(marker);
            if (lastIdx < 0) return json;

            int colonIdx = json.indexOf(":", lastIdx);
            if (colonIdx < 0) return json;

            // Skip whitespace and find opening quote
            int i = colonIdx + 1;
            while (i < json.length() && json.charAt(i) == ' ') i++;

            if (i >= json.length() || json.charAt(i) != '"') return json;

            // Parse the JSON string value
            StringBuilder sb = new StringBuilder();
            i++; // skip opening quote
            while (i < json.length()) {
                char c = json.charAt(i);
                if (c == '\\' && i + 1 < json.length()) {
                    char next = json.charAt(i + 1);
                    if (next == '"') { sb.append('"'); i += 2; }
                    else if (next == 'n') { sb.append('\n'); i += 2; }
                    else if (next == 'r') { sb.append('\r'); i += 2; }
                    else if (next == 't') { sb.append('\t'); i += 2; }
                    else if (next == '\\') { sb.append('\\'); i += 2; }
                    else { sb.append(c); i++; }
                } else if (c == '"') {
                    break;
                } else {
                    sb.append(c);
                    i++;
                }
            }
            return sb.toString();
        } catch (Exception e) {
            return json;
        }
    }

    private ThreatAnalysis parseThreatAnalysis(String json) {
        String level = extractJsonField(json, "level");
        String type = extractJsonField(json, "type");
        String desc = extractJsonField(json, "description");
        String suggestion = extractJsonField(json, "suggestion");
        int confidence = 0;
        try {
            String confStr = extractJsonField(json, "confidence");
            if (confStr != null) confidence = Integer.parseInt(confStr.trim());
        } catch (Exception ignored) {}

        return new ThreatAnalysis(
                level != null ? level : "green",
                type != null ? type : "safe",
                desc != null ? desc : "No threat detected",
                confidence,
                suggestion != null ? suggestion : "Stay alert"
        );
    }

    private String extractJsonField(String json, String key) {
        try {
            String search = "\"" + key + "\"";
            int idx = json.indexOf(search);
            if (idx < 0) return null;

            int colonIdx = json.indexOf(":", idx + search.length());
            if (colonIdx < 0) return null;

            // Skip whitespace
            int i = colonIdx + 1;
            while (i < json.length() && (json.charAt(i) == ' ' || json.charAt(i) == '\n')) i++;

            if (i >= json.length()) return null;

            char firstChar = json.charAt(i);
            if (firstChar == '"') {
                // String value
                int endQuote = json.indexOf("\"", i + 1);
                return endQuote > 0 ? json.substring(i + 1, endQuote) : null;
            } else {
                // Number or boolean
                int end = i;
                while (end < json.length() && json.charAt(end) != ',' && json.charAt(end) != '}') end++;
                return json.substring(i, end).trim();
            }
        } catch (Exception e) {
            return null;
        }
    }

    public void shutdown() {
        executor.shutdown();
    }
}
