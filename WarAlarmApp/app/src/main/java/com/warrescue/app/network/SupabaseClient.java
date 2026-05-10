package com.warrescue.app.network;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.warrescue.app.BuildConfig;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Supabase REST API client for Android.
 * Uses PostgREST API to query/insert/update data.
 * All 3 platforms (App, Web, Admin) share the same Supabase backend.
 */
public class SupabaseClient {

    private static final String TAG = "SupabaseClient";
    private static SupabaseClient instance;

    private final String baseUrl;
    private final String anonKey;
    private final ExecutorService executor;
    private final Handler mainHandler;
    private String accessToken; // user JWT after auth

    private SupabaseClient() {
        this.baseUrl = BuildConfig.SUPABASE_URL;
        this.anonKey = BuildConfig.SUPABASE_ANON_KEY;
        this.executor = Executors.newFixedThreadPool(3);
        this.mainHandler = new Handler(Looper.getMainLooper());
    }

    public static synchronized SupabaseClient getInstance() {
        if (instance == null) {
            instance = new SupabaseClient();
        }
        return instance;
    }

    public boolean isConfigured() {
        return baseUrl != null && !baseUrl.isEmpty()
                && anonKey != null && !anonKey.isEmpty();
    }

    public void setAccessToken(String token) {
        this.accessToken = token;
    }

    // ============= Generic Query Methods =============

    public interface Callback<T> {
        void onSuccess(T result);
        void onError(String error);
    }

    /**
     * GET /rest/v1/{table}?{query}
     * Example: select("alerts", "is_active=eq.true&order=created_at.desc&limit=50")
     */
    public void select(String table, String query, Callback<JSONArray> callback) {
        executor.execute(() -> {
            try {
                String urlStr = baseUrl + "/rest/v1/" + table;
                if (query != null && !query.isEmpty()) {
                    urlStr += "?" + query;
                }
                HttpURLConnection conn = createConnection(urlStr, "GET");
                conn.setRequestProperty("Accept", "application/json");

                int code = conn.getResponseCode();
                String body = readResponse(conn);

                if (code >= 200 && code < 300) {
                    JSONArray arr = new JSONArray(body);
                    mainHandler.post(() -> callback.onSuccess(arr));
                } else {
                    Log.e(TAG, "SELECT " + table + " failed: " + code + " " + body);
                    mainHandler.post(() -> callback.onError("HTTP " + code));
                }
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "SELECT " + table + " error", e);
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    /**
     * POST /rest/v1/{table}
     */
    public void insert(String table, JSONObject data, Callback<JSONArray> callback) {
        executor.execute(() -> {
            try {
                String urlStr = baseUrl + "/rest/v1/" + table;
                HttpURLConnection conn = createConnection(urlStr, "POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Prefer", "return=representation");
                conn.setDoOutput(true);

                OutputStream os = conn.getOutputStream();
                os.write(data.toString().getBytes("UTF-8"));
                os.close();

                int code = conn.getResponseCode();
                String body = readResponse(conn);

                if (code >= 200 && code < 300) {
                    JSONArray arr = new JSONArray(body);
                    mainHandler.post(() -> callback.onSuccess(arr));
                } else {
                    Log.e(TAG, "INSERT " + table + " failed: " + code + " " + body);
                    mainHandler.post(() -> callback.onError("HTTP " + code));
                }
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "INSERT " + table + " error", e);
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    /**
     * PATCH /rest/v1/{table}?{filter}
     */
    public void update(String table, String filter, JSONObject data, Callback<JSONArray> callback) {
        executor.execute(() -> {
            try {
                String urlStr = baseUrl + "/rest/v1/" + table + "?" + filter;
                HttpURLConnection conn = createConnection(urlStr, "PATCH");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Prefer", "return=representation");
                conn.setDoOutput(true);

                OutputStream os = conn.getOutputStream();
                os.write(data.toString().getBytes("UTF-8"));
                os.close();

                int code = conn.getResponseCode();
                String body = readResponse(conn);

                if (code >= 200 && code < 300) {
                    JSONArray arr = new JSONArray(body);
                    mainHandler.post(() -> callback.onSuccess(arr));
                } else {
                    Log.e(TAG, "UPDATE " + table + " failed: " + code + " " + body);
                    mainHandler.post(() -> callback.onError("HTTP " + code));
                }
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "UPDATE " + table + " error", e);
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    /**
     * DELETE /rest/v1/{table}?{filter}
     */
    public void delete(String table, String filter, Callback<JSONArray> callback) {
        executor.execute(() -> {
            try {
                String urlStr = baseUrl + "/rest/v1/" + table + "?" + filter;
                HttpURLConnection conn = createConnection(urlStr, "DELETE");
                conn.setRequestProperty("Prefer", "return=representation");

                int code = conn.getResponseCode();
                String body = readResponse(conn);

                if (code >= 200 && code < 300) {
                    JSONArray arr = body.isEmpty() ? new JSONArray() : new JSONArray(body);
                    mainHandler.post(() -> callback.onSuccess(arr));
                } else {
                    Log.e(TAG, "DELETE " + table + " failed: " + code + " " + body);
                    mainHandler.post(() -> callback.onError("HTTP " + code));
                }
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "DELETE " + table + " error", e);
                mainHandler.post(() -> callback.onError(e.getMessage()));
            }
        });
    }

    // ============= Internal Helpers =============

    private HttpURLConnection createConnection(String urlStr, String method) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod(method);
        conn.setRequestProperty("apikey", anonKey);
        if (accessToken != null && !accessToken.isEmpty()) {
            conn.setRequestProperty("Authorization", "Bearer " + accessToken);
        } else {
            conn.setRequestProperty("Authorization", "Bearer " + anonKey);
        }
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(15000);
        return conn;
    }

    private String readResponse(HttpURLConnection conn) throws Exception {
        BufferedReader reader;
        try {
            reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
        } catch (Exception e) {
            java.io.InputStream errStream = conn.getErrorStream();
            if (errStream == null) {
                return "";
            }
            reader = new BufferedReader(new InputStreamReader(errStream, "UTF-8"));
        }
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line);
        }
        reader.close();
        return sb.toString();
    }
}
