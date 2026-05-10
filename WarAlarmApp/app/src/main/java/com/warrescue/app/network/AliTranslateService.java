package com.warrescue.app.network;

import android.os.Handler;
import android.os.Looper;
import android.util.LruCache;

import com.warrescue.app.BuildConfig;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.Locale;
import java.util.Map;
import java.util.SimpleTimeZone;
import java.util.TreeMap;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import android.util.Base64;

/**
 * Alibaba Cloud Machine Translation service for runtime content translation.
 * Used for translating dynamic API content (not static UI strings).
 * Follows the same pattern as DeepSeekService and TwilioService.
 */
public class AliTranslateService {

    private static final String API_ENDPOINT = "https://mt.aliyuncs.com/";
    private static final String API_VERSION = "2018-10-12";
    private static final String ACTION = "TranslateGeneral";

    private final String accessKeyId;
    private final String accessKeySecret;
    private final ExecutorService executor;
    private final Handler mainHandler;
    private final LruCache<String, String> cache;

    public interface TranslateCallback {
        void onSuccess(String translatedText);
        void onError(String error);
    }

    public AliTranslateService() {
        this.accessKeyId = BuildConfig.ALIBABA_TRANSLATE_ACCESS_KEY_ID;
        this.accessKeySecret = BuildConfig.ALIBABA_TRANSLATE_ACCESS_KEY_SECRET;
        this.executor = Executors.newFixedThreadPool(2);
        this.mainHandler = new Handler(Looper.getMainLooper());
        // Cache up to 200 translated entries
        this.cache = new LruCache<>(200);
    }

    public boolean isConfigured() {
        return accessKeyId != null && !accessKeyId.isEmpty()
                && accessKeySecret != null && !accessKeySecret.isEmpty();
    }

    /**
     * Translate text from source language to target language.
     *
     * @param text       The text to translate
     * @param sourceLang Source language code (e.g. "zh", "en", "auto" for auto-detect)
     * @param targetLang Target language code (e.g. "en", "ar", "fr")
     * @param callback   Callback for result/error
     */
    public void translate(String text, String sourceLang, String targetLang, TranslateCallback callback) {
        if (!isConfigured()) {
            mainHandler.post(() -> callback.onError("Alibaba Translate API not configured"));
            return;
        }
        if (text == null || text.trim().isEmpty()) {
            mainHandler.post(() -> callback.onSuccess(""));
            return;
        }
        // Map Android locale codes to Alibaba API codes
        String source = mapLanguageCode(sourceLang);
        String target = mapLanguageCode(targetLang);

        if (source.equals(target)) {
            mainHandler.post(() -> callback.onSuccess(text));
            return;
        }

        // Check cache
        String cacheKey = source + ":" + target + ":" + text;
        String cached = cache.get(cacheKey);
        if (cached != null) {
            mainHandler.post(() -> callback.onSuccess(cached));
            return;
        }

        executor.execute(() -> {
            try {
                String result = doTranslate(text, source, target);
                cache.put(cacheKey, result);
                mainHandler.post(() -> callback.onSuccess(result));
            } catch (Exception e) {
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    private String doTranslate(String text, String sourceLang, String targetLang) throws Exception {
        // Build common parameters
        TreeMap<String, String> params = new TreeMap<>();
        params.put("Action", ACTION);
        params.put("Version", API_VERSION);
        params.put("Format", "JSON");
        params.put("AccessKeyId", accessKeyId);
        params.put("SignatureMethod", "HMAC-SHA1");
        params.put("SignatureVersion", "1.0");
        params.put("SignatureNonce", UUID.randomUUID().toString());

        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
        sdf.setTimeZone(new SimpleTimeZone(0, "UTC"));
        params.put("Timestamp", sdf.format(new Date()));

        // Business parameters
        params.put("SourceLanguage", sourceLang);
        params.put("TargetLanguage", targetLang);
        params.put("SourceText", text);
        params.put("FormatType", "text");
        params.put("Scene", "general");

        // Build signature
        String signature = computeSignature(params);
        params.put("Signature", signature);

        // Build POST body
        StringBuilder body = new StringBuilder();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (body.length() > 0) body.append("&");
            body.append(percentEncode(entry.getKey()))
                .append("=")
                .append(percentEncode(entry.getValue()));
        }

        // Send HTTP request
        URL url = new URL(API_ENDPOINT);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setDoOutput(true);
        conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(15000);

        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.toString().getBytes(StandardCharsets.UTF_8));
        }

        int responseCode = conn.getResponseCode();
        StringBuilder response = new StringBuilder();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(
                responseCode == 200 ? conn.getInputStream() : conn.getErrorStream(),
                StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) {
                response.append(line);
            }
        }

        conn.disconnect();

        if (responseCode != 200) {
            throw new Exception("Translation API error: " + responseCode + " - " + response);
        }

        return parseTranslatedText(response.toString());
    }

    private String computeSignature(TreeMap<String, String> params) throws Exception {
        // Build canonical query string (sorted by key)
        StringBuilder canonicalQS = new StringBuilder();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            if (canonicalQS.length() > 0) canonicalQS.append("&");
            canonicalQS.append(percentEncode(entry.getKey()))
                       .append("=")
                       .append(percentEncode(entry.getValue()));
        }

        // Build string to sign: POST&%2F&<url-encoded canonical query string>
        String stringToSign = "POST&" + percentEncode("/") + "&" + percentEncode(canonicalQS.toString());

        // HMAC-SHA1
        String signingKey = accessKeySecret + "&";
        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(new SecretKeySpec(signingKey.getBytes(StandardCharsets.UTF_8), "HmacSHA1"));
        byte[] rawHmac = mac.doFinal(stringToSign.getBytes(StandardCharsets.UTF_8));

        return Base64.encodeToString(rawHmac, Base64.NO_WRAP);
    }

    private static String percentEncode(String value) throws Exception {
        return URLEncoder.encode(value, "UTF-8")
                .replace("+", "%20")
                .replace("*", "%2A")
                .replace("%7E", "~");
    }

    /**
     * Parse the translated text from JSON response.
     * Response format: {"Data":{"Translated":"..."},"Code":"200"}
     */
    private String parseTranslatedText(String json) throws Exception {
        // Simple JSON parsing without external library
        int codeIdx = json.indexOf("\"Code\"");
        if (codeIdx != -1) {
            String codeStr = extractJsonStringValue(json, "Code");
            if (codeStr != null && !"200".equals(codeStr)) {
                String message = extractJsonStringValue(json, "Message");
                throw new Exception("API returned code " + codeStr + ": " + (message != null ? message : "Unknown error"));
            }
        }

        // Extract "Translated" field from nested "Data" object
        int dataIdx = json.indexOf("\"Data\"");
        if (dataIdx == -1) {
            throw new Exception("Invalid response: missing Data field");
        }
        String dataSection = json.substring(dataIdx);
        String translated = extractJsonStringValue(dataSection, "Translated");
        if (translated == null) {
            throw new Exception("Invalid response: missing Translated field");
        }
        return translated;
    }

    private String extractJsonStringValue(String json, String key) {
        String search = "\"" + key + "\"";
        int keyIdx = json.indexOf(search);
        if (keyIdx == -1) return null;

        int colonIdx = json.indexOf(':', keyIdx + search.length());
        if (colonIdx == -1) return null;

        // Skip whitespace after colon
        int i = colonIdx + 1;
        while (i < json.length() && Character.isWhitespace(json.charAt(i))) i++;

        if (i >= json.length()) return null;

        if (json.charAt(i) == '"') {
            // String value
            int start = i + 1;
            int end = start;
            while (end < json.length()) {
                if (json.charAt(end) == '\\') {
                    end += 2; // skip escaped character
                } else if (json.charAt(end) == '"') {
                    break;
                } else {
                    end++;
                }
            }
            return json.substring(start, end)
                    .replace("\\\"", "\"")
                    .replace("\\\\", "\\")
                    .replace("\\n", "\n");
        } else {
            // Non-string value (number, etc.)
            int start = i;
            while (i < json.length() && json.charAt(i) != ',' && json.charAt(i) != '}'
                    && json.charAt(i) != ']' && !Character.isWhitespace(json.charAt(i))) {
                i++;
            }
            return json.substring(start, i);
        }
    }

    /**
     * Map Android locale codes to Alibaba Translate API language codes.
     */
    private String mapLanguageCode(String androidCode) {
        if (androidCode == null) return "auto";
        switch (androidCode) {
            case "iw": return "he";       // Android uses "iw" for Hebrew
            case "zh": return "zh";
            case "en": return "en";
            case "uk": return "uk";
            case "ar": return "ar";
            case "he": return "he";
            case "fr": return "fr";
            case "es": return "es";
            case "ru": return "ru";
            case "tr": return "tr";
            default:   return "auto";
        }
    }

    /**
     * Get Alibaba Translate language code from Android locale.
     */
    public static String getAliLanguageCode(String androidLocale) {
        if ("iw".equals(androidLocale)) return "he";
        if (Arrays.asList("zh", "en", "uk", "ar", "he", "fr", "es", "ru", "tr").contains(androidLocale)) {
            return androidLocale;
        }
        return "en"; // fallback
    }

    public void clearCache() {
        cache.evictAll();
    }

    public void shutdown() {
        executor.shutdown();
    }
}
