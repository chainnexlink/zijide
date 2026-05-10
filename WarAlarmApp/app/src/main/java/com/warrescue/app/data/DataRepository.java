package com.warrescue.app.data;

import android.content.Context;
import android.util.Log;

import com.warrescue.app.model.Alert;
import com.warrescue.app.model.Announcement;
import com.warrescue.app.model.FamilyMember;
import com.warrescue.app.model.Shelter;
import com.warrescue.app.network.SupabaseClient;
import com.warrescue.app.util.DemoDataProvider;
import com.warrescue.app.util.ShelterDataLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Central data repository for the App.
 * Priority: Supabase API > Local JSON fallback.
 * Ensures App data stays in sync with Admin dashboard and Web frontend.
 */
public class DataRepository {

    private static final String TAG = "DataRepository";

    public interface DataCallback<T> {
        void onData(T data);
        void onError(String error);
    }

    // ===================== Alerts =====================

    public static void getAlerts(Context ctx, DataCallback<List<Alert>> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            // Fallback to localized demo alerts (includes Palestine/Gaza data)
            callback.onData(DemoDataProvider.getAlerts(ctx));
            return;
        }

        client.select("alerts", "order=created_at.desc&limit=50", new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                List<Alert> alerts = new ArrayList<>();
                try {
                    for (int i = 0; i < result.length(); i++) {
                        JSONObject obj = result.getJSONObject(i);
                        Alert a = new Alert(
                                obj.getString("id"),
                                obj.optString("title", ""),
                                obj.optString("description", ""),
                                obj.optString("severity", "yellow"),
                                obj.optString("alert_type", "other"),
                                obj.optString("city", ""),
                                obj.optString("country", ""),
                                obj.optString("created_at", ""),
                                0,
                                obj.optInt("reliability_score", 0)
                        );
                        a.setLatitude(obj.optDouble("latitude", 0));
                        a.setLongitude(obj.optDouble("longitude", 0));
                        a.setActive(obj.optBoolean("is_active", true));
                        alerts.add(a);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Parse alerts error", e);
                }
                callback.onData(alerts);
            }

            @Override
            public void onError(String error) {
                Log.w(TAG, "Alerts API failed, using demo: " + error);
                callback.onData(DemoDataProvider.getAlerts(ctx));
            }
        });
    }

    // ===================== Shelters =====================

    public static void getShelters(Context ctx, DataCallback<List<Shelter>> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            // Fallback to local JSON
            callback.onData(ShelterDataLoader.loadShelters(ctx));
            return;
        }

        client.select("shelters", "order=name.asc", new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                List<Shelter> shelters = new ArrayList<>();
                try {
                    for (int i = 0; i < result.length(); i++) {
                        JSONObject obj = result.getJSONObject(i);
                        Shelter s = new Shelter();
                        s.setId(obj.getString("id"));
                        s.setName(obj.optString("name", ""));
                        s.setAddress(obj.optString("address", ""));
                        s.setCity(obj.optString("city", ""));
                        s.setCountry(obj.optString("country", ""));
                        s.setLatitude(obj.optDouble("latitude", 0));
                        s.setLongitude(obj.optDouble("longitude", 0));
                        s.setCapacity(obj.optInt("capacity", 0));
                        s.setCurrentOccupancy(obj.optInt("current_occupancy", 0));
                        s.setStatus(obj.optString("status", "open"));
                        s.setHasWater(obj.optBoolean("has_water", false));
                        s.setHasElectricity(obj.optBoolean("has_electricity", false));
                        s.setHasMedical(obj.optBoolean("has_medical", false));
                        s.setHasToilet(obj.optBoolean("has_toilet", false));
                        s.setHasRestArea(obj.optBoolean("has_rest_area", false));
                        s.setPhone(obj.optString("phone", ""));
                        s.setOpeningHours(obj.optString("opening_hours", "24/7"));
                        s.setType(obj.optString("type", "underground"));
                        shelters.add(s);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Parse shelters error", e);
                }
                if (shelters.isEmpty()) {
                    // API returned empty, use local fallback
                    shelters = ShelterDataLoader.loadShelters(ctx);
                }
                List<Shelter> finalShelters = shelters;
                callback.onData(finalShelters);
            }

            @Override
            public void onError(String error) {
                Log.w(TAG, "Shelters API failed, using local: " + error);
                callback.onData(ShelterDataLoader.loadShelters(ctx));
            }
        });
    }

    // ===================== Announcements =====================

    public static void getAnnouncements(Context ctx, DataCallback<List<Announcement>> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            // Fallback to localized demo announcements
            callback.onData(DemoDataProvider.getAnnouncements(ctx));
            return;
        }

        client.select("announcements", "is_active=eq.true&order=created_at.desc&limit=20",
                new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                List<Announcement> list = new ArrayList<>();
                try {
                    for (int i = 0; i < result.length(); i++) {
                        JSONObject obj = result.getJSONObject(i);
                        list.add(new Announcement(
                                obj.getString("id"),
                                obj.optString("title", ""),
                                obj.optString("content", ""),
                                obj.optString("type", "info"),
                                obj.optString("created_at", "")
                        ));
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Parse announcements error", e);
                }
                if (list.isEmpty()) {
                    // API returned empty, use localized demo data
                    list = DemoDataProvider.getAnnouncements(ctx);
                }
                callback.onData(list);
            }

            @Override
            public void onError(String error) {
                Log.w(TAG, "Announcements API failed: " + error);
                // Fallback to localized demo announcements
                callback.onData(DemoDataProvider.getAnnouncements(ctx));
            }
        });
    }

    // ===================== Family Members =====================

    public static void getFamilyMembers(Context ctx, DataCallback<List<FamilyMember>> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            callback.onData(new ArrayList<>());
            return;
        }

        client.select("family_members", "select=*&order=created_at.asc",
                new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                List<FamilyMember> members = new ArrayList<>();
                try {
                    for (int i = 0; i < result.length(); i++) {
                        JSONObject obj = result.getJSONObject(i);
                        FamilyMember m = new FamilyMember(
                                obj.getString("id"),
                                obj.optString("user_id", ""),
                                obj.optBoolean("is_online", false)
                        );
                        m.setRole(obj.optString("role", "member"));
                        m.setLatitude(obj.optDouble("latitude", 0));
                        m.setLongitude(obj.optDouble("longitude", 0));
                        m.setLastSeen(obj.optString("last_seen_at", null));
                        members.add(m);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Parse family members error", e);
                }
                callback.onData(members);
            }

            @Override
            public void onError(String error) {
                Log.w(TAG, "Family members API failed: " + error);
                callback.onData(new ArrayList<>());
            }
        });
    }

    // ===================== Points =====================

    /**
     * Get current user's points balance.
     * Returns a JSONObject with { balance, total_earned, total_spent }.
     */
    public static void getPoints(Context ctx, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            callback.onData(new JSONObject());
            return;
        }

        client.select("user_points", "select=*&limit=1",
                new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) {
                    callback.onData(result.optJSONObject(0));
                } else {
                    callback.onData(new JSONObject());
                }
            }

            @Override
            public void onError(String error) {
                Log.w(TAG, "Points API failed: " + error);
                callback.onData(new JSONObject());
            }
        });
    }

    /**
     * Get current user's point transaction history.
     * Returns a list of JSONObject entries (most recent first).
     */
    public static void getPointTransactions(Context ctx, DataCallback<List<JSONObject>> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            callback.onData(new ArrayList<>());
            return;
        }

        client.select("point_transactions", "select=*&order=created_at.desc&limit=50",
                new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                List<JSONObject> list = new ArrayList<>();
                for (int i = 0; i < result.length(); i++) {
                    list.add(result.optJSONObject(i));
                }
                callback.onData(list);
            }

            @Override
            public void onError(String error) {
                Log.w(TAG, "Point transactions API failed: " + error);
                callback.onData(new ArrayList<>());
            }
        });
    }

    // ===================== Subscription Plans =====================

    /**
     * Fetch active subscription plans from database.
     * Returns JSONArray of plans with id, name, price, currency, duration_days, features.
     */
    public static void getSubscriptionPlans(DataCallback<JSONArray> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            callback.onData(new JSONArray());
            return;
        }

        client.select("subscription_plans", "is_active=eq.true&order=sort_order.asc",
                new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                callback.onData(result);
            }

            @Override
            public void onError(String error) {
                Log.w(TAG, "Subscription plans API failed: " + error);
                callback.onData(new JSONArray());
            }
        });
    }

    /**
     * Create a subscription order in the database.
     */
    public static void createSubscriptionOrder(JSONObject order, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            callback.onError("Supabase not configured");
            return;
        }

        client.insert("subscription_orders", order, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) {
                    callback.onData(result.optJSONObject(0));
                } else {
                    callback.onError("Empty response");
                }
            }

            @Override
            public void onError(String error) {
                Log.e(TAG, "Create order failed: " + error);
                callback.onError(error);
            }
        });
    }

    /**
     * Create or update a subscription record.
     */
    public static void upsertSubscription(JSONObject sub, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            callback.onError("Supabase not configured");
            return;
        }

        client.insert("subscriptions", sub, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) {
                    callback.onData(result.optJSONObject(0));
                } else {
                    callback.onError("Empty response");
                }
            }

            @Override
            public void onError(String error) {
                Log.e(TAG, "Upsert subscription failed: " + error);
                callback.onError(error);
            }
        });
    }

    // ===================== City Alerts =====================

    /**
     * Submit a city alert trigger to the backend.
     */
    public static void submitCityAlertTrigger(JSONObject trigger, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            callback.onError("Supabase not configured");
            return;
        }

        client.insert("city_alert_triggers", trigger, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) {
                    callback.onData(result.optJSONObject(0));
                } else {
                    callback.onData(new JSONObject());
                }
            }

            @Override
            public void onError(String error) {
                Log.e(TAG, "City alert trigger failed: " + error);
                callback.onError(error);
            }
        });
    }

    /**
     * Get active city alerts for a given city.
     */
    public static void getCityAlerts(String city, DataCallback<JSONArray> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            callback.onData(new JSONArray());
            return;
        }

        String query = "is_active=eq.true&order=created_at.desc&limit=10";
        if (city != null && !city.isEmpty()) {
            query = "city=eq." + city + "&" + query;
        }
        client.select("city_alerts", query, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                callback.onData(result);
            }

            @Override
            public void onError(String error) {
                Log.w(TAG, "City alerts API failed: " + error);
                callback.onData(new JSONArray());
            }
        });
    }

    // ===================== SOS Records =====================

    /**
     * Create a new SOS record in the database.
     */
    public static void createSosRecord(JSONObject record, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            callback.onError("Supabase not configured");
            return;
        }

        client.insert("sos_records", record, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) {
                    callback.onData(result.optJSONObject(0));
                } else {
                    callback.onData(new JSONObject());
                }
            }

            @Override
            public void onError(String error) {
                Log.e(TAG, "Create SOS record failed: " + error);
                callback.onError(error);
            }
        });
    }

    /**
     * Update an existing SOS record (e.g., cancel, resolve).
     */
    public static void updateSosRecord(String recordId, JSONObject updates, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            callback.onError("Supabase not configured");
            return;
        }

        client.update("sos_records", "id=eq." + recordId, updates, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) {
                    callback.onData(result.optJSONObject(0));
                } else {
                    callback.onData(new JSONObject());
                }
            }

            @Override
            public void onError(String error) {
                Log.e(TAG, "Update SOS record failed: " + error);
                callback.onError(error);
            }
        });
    }

    // ===================== Simulation Trials =====================

    /**
     * Create a simulation trial record.
     */
    public static void createSimulationTrial(JSONObject trial, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            callback.onError("Supabase not configured");
            return;
        }

        client.insert("simulation_trials", trial, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) {
                    callback.onData(result.optJSONObject(0));
                } else {
                    callback.onData(new JSONObject());
                }
            }

            @Override
            public void onError(String error) {
                Log.e(TAG, "Create simulation trial failed: " + error);
                callback.onError(error);
            }
        });
    }

    // ===================== Mutual Aid Events =====================

    /**
     * Get nearby mutual aid events.
     */
    public static void getMutualAidEvents(String statusFilter, DataCallback<JSONArray> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            callback.onData(new JSONArray());
            return;
        }
        String query = "order=created_at.desc&limit=50";
        if (statusFilter != null && !statusFilter.isEmpty()) {
            query = "status=eq." + statusFilter + "&" + query;
        }
        client.select("mutual_aid_events", query, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) { callback.onData(result); }
            @Override
            public void onError(String error) {
                Log.w(TAG, "Mutual aid events API failed: " + error);
                callback.onData(new JSONArray());
            }
        });
    }

    /**
     * Create a mutual aid event (help request).
     */
    public static void createMutualAidEvent(JSONObject event, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) { callback.onError("Supabase not configured"); return; }
        client.insert("mutual_aid_events", event, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) callback.onData(result.optJSONObject(0));
                else callback.onError("Empty response");
            }
            @Override
            public void onError(String error) { Log.e(TAG, "Create aid event failed: " + error); callback.onError(error); }
        });
    }

    /**
     * Update a mutual aid event.
     */
    public static void updateMutualAidEvent(String eventId, JSONObject updates, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) { callback.onError("Supabase not configured"); return; }
        client.update("mutual_aid_events", "id=eq." + eventId, updates, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) callback.onData(result.optJSONObject(0));
                else callback.onData(new JSONObject());
            }
            @Override
            public void onError(String error) { Log.e(TAG, "Update aid event failed: " + error); callback.onError(error); }
        });
    }

    // ===================== Mutual Aid Event Responses =====================

    /**
     * Get responses for a specific event.
     */
    public static void getMutualAidResponses(String eventId, DataCallback<JSONArray> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) { callback.onData(new JSONArray()); return; }
        client.select("mutual_aid_event_responses", "event_id=eq." + eventId + "&order=created_at.desc",
                new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) { callback.onData(result); }
            @Override
            public void onError(String error) { Log.w(TAG, "Aid responses API failed: " + error); callback.onData(new JSONArray()); }
        });
    }

    /**
     * Create a response to an aid event.
     */
    public static void createMutualAidResponse(JSONObject response, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) { callback.onError("Supabase not configured"); return; }
        client.insert("mutual_aid_event_responses", response, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) callback.onData(result.optJSONObject(0));
                else callback.onError("Empty response");
            }
            @Override
            public void onError(String error) { Log.e(TAG, "Create aid response failed: " + error); callback.onError(error); }
        });
    }

    /**
     * Update a response status.
     */
    public static void updateMutualAidResponse(String responseId, JSONObject updates, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) { callback.onError("Supabase not configured"); return; }
        client.update("mutual_aid_event_responses", "id=eq." + responseId, updates, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) callback.onData(result.optJSONObject(0));
                else callback.onData(new JSONObject());
            }
            @Override
            public void onError(String error) { Log.e(TAG, "Update aid response failed: " + error); callback.onError(error); }
        });
    }

    // ===================== Mutual Aid Skills =====================

    /**
     * Get user's skills.
     */
    public static void getMutualAidSkills(String userId, DataCallback<JSONArray> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) { callback.onData(new JSONArray()); return; }
        client.select("mutual_aid_skills", "user_id=eq." + userId + "&order=created_at.desc",
                new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) { callback.onData(result); }
            @Override
            public void onError(String error) { Log.w(TAG, "Aid skills API failed: " + error); callback.onData(new JSONArray()); }
        });
    }

    /**
     * Add a skill.
     */
    public static void addMutualAidSkill(JSONObject skill, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) { callback.onError("Supabase not configured"); return; }
        client.insert("mutual_aid_skills", skill, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) callback.onData(result.optJSONObject(0));
                else callback.onError("Empty response");
            }
            @Override
            public void onError(String error) { Log.e(TAG, "Add skill failed: " + error); callback.onError(error); }
        });
    }

    // ===================== Mutual Aid Settings =====================

    /**
     * Get user's mutual aid settings.
     */
    public static void getMutualAidSettings(String userId, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) { callback.onData(new JSONObject()); return; }
        client.select("mutual_aid_settings", "user_id=eq." + userId + "&limit=1",
                new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) callback.onData(result.optJSONObject(0));
                else callback.onData(new JSONObject());
            }
            @Override
            public void onError(String error) { Log.w(TAG, "Aid settings API failed: " + error); callback.onData(new JSONObject()); }
        });
    }

    /**
     * Save user's mutual aid settings (upsert).
     */
    public static void saveMutualAidSettings(JSONObject settings, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) { callback.onError("Supabase not configured"); return; }
        client.insert("mutual_aid_settings", settings, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) callback.onData(result.optJSONObject(0));
                else callback.onData(new JSONObject());
            }
            @Override
            public void onError(String error) { Log.e(TAG, "Save aid settings failed: " + error); callback.onError(error); }
        });
    }

    // ===================== Mutual Aid Messages =====================

    /**
     * Get messages for an event.
     */
    public static void getMutualAidMessages(String eventId, DataCallback<JSONArray> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) { callback.onData(new JSONArray()); return; }
        client.select("mutual_aid_messages", "event_id=eq." + eventId + "&order=created_at.asc&limit=100",
                new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) { callback.onData(result); }
            @Override
            public void onError(String error) { Log.w(TAG, "Aid messages API failed: " + error); callback.onData(new JSONArray()); }
        });
    }

    /**
     * Send a message in an event chat.
     */
    public static void sendMutualAidMessage(JSONObject message, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) { callback.onError("Supabase not configured"); return; }
        client.insert("mutual_aid_messages", message, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) callback.onData(result.optJSONObject(0));
                else callback.onData(new JSONObject());
            }
            @Override
            public void onError(String error) { Log.e(TAG, "Send aid message failed: " + error); callback.onError(error); }
        });
    }

    // ===================== Mutual Aid Reviews =====================

    /**
     * Submit a review for a completed aid event.
     */
    public static void submitMutualAidReview(JSONObject review, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) { callback.onError("Supabase not configured"); return; }
        client.insert("mutual_aid_reviews", review, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) callback.onData(result.optJSONObject(0));
                else callback.onData(new JSONObject());
            }
            @Override
            public void onError(String error) { Log.e(TAG, "Submit aid review failed: " + error); callback.onError(error); }
        });
    }

    // ===================== Mutual Aid Subscriptions =====================

    /**
     * Get user's mutual aid subscription status.
     */
    public static void getMutualAidSubscription(String userId, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) { callback.onData(new JSONObject()); return; }
        client.select("mutual_aid_subscriptions", "user_id=eq." + userId + "&limit=1",
                new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) callback.onData(result.optJSONObject(0));
                else callback.onData(new JSONObject());
            }
            @Override
            public void onError(String error) { Log.w(TAG, "Aid subscription API failed: " + error); callback.onData(new JSONObject()); }
        });
    }

    /**
     * Toggle mutual aid subscription.
     */
    public static void toggleMutualAidSubscription(JSONObject sub, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) { callback.onError("Supabase not configured"); return; }
        client.insert("mutual_aid_subscriptions", sub, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) callback.onData(result.optJSONObject(0));
                else callback.onData(new JSONObject());
            }
            @Override
            public void onError(String error) { Log.e(TAG, "Toggle aid subscription failed: " + error); callback.onError(error); }
        });
    }

    /**
     * Create a simulation alert record.
     */
    public static void createSimulationAlert(JSONObject alert, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            callback.onError("Supabase not configured");
            return;
        }

        client.insert("simulation_alerts", alert, new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) {
                    callback.onData(result.optJSONObject(0));
                } else {
                    callback.onData(new JSONObject());
                }
            }

            @Override
            public void onError(String error) {
                Log.e(TAG, "Create simulation alert failed: " + error);
                callback.onError(error);
            }
        });
    }

    // ===================== Cancel Subscription =====================

    /**
     * Cancel a user's subscription by updating status to 'cancelled'.
     */
    public static void cancelSubscription(String userId, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            callback.onError("Supabase not configured");
            return;
        }

        try {
            JSONObject updates = new JSONObject();
            updates.put("status", "cancelled");
            updates.put("auto_renew", false);
            updates.put("updated_at", new java.text.SimpleDateFormat(
                    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).format(new java.util.Date()));

            client.update("subscriptions", "user_id=eq." + userId + "&status=eq.active",
                    updates, new SupabaseClient.Callback<JSONArray>() {
                @Override
                public void onSuccess(JSONArray result) {
                    if (result.length() > 0) {
                        callback.onData(result.optJSONObject(0));
                    } else {
                        callback.onData(new JSONObject());
                    }
                }

                @Override
                public void onError(String error) {
                    Log.e(TAG, "Cancel subscription failed: " + error);
                    callback.onError(error);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Cancel subscription build json error", e);
            callback.onError(e.getMessage());
        }
    }

    /**
     * Restore a user's subscription from the backend.
     */
    public static void restoreSubscription(String userId, DataCallback<JSONObject> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            callback.onError("Supabase not configured");
            return;
        }

        client.select("subscriptions",
                "user_id=eq." + userId + "&order=created_at.desc&limit=1",
                new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                if (result.length() > 0) {
                    callback.onData(result.optJSONObject(0));
                } else {
                    callback.onData(null);
                }
            }

            @Override
            public void onError(String error) {
                Log.e(TAG, "Restore subscription failed: " + error);
                callback.onError(error);
            }
        });
    }

    // ===================== Account Deletion =====================

    /**
     * Delete all user data from the backend (GDPR/Apple requirement).
     */
    public static void deleteUserAccount(String userId, DataCallback<Boolean> callback) {
        SupabaseClient client = SupabaseClient.getInstance();
        if (!client.isConfigured()) {
            callback.onError("Supabase not configured");
            return;
        }

        // Table-to-column mapping: some tables use different column names for user reference
        String[][] tableColumns = {
                {"subscriptions", "user_id"},
                {"subscription_orders", "user_id"},
                {"mutual_aid_messages", "sender_id"},
                {"mutual_aid_event_responses", "responder_id"},
                {"mutual_aid_events", "user_id"},
                {"mutual_aid_skills", "user_id"},
                {"mutual_aid_settings", "user_id"},
                {"mutual_aid_reviews", "reviewer_id"},
                {"mutual_aid_subscriptions", "user_id"},
                {"family_members", "user_id"},
                {"sos_records", "user_id"},
                {"simulation_trials", "user_id"},
                {"user_points", "user_id"},
                {"point_transactions", "user_id"}
        };

        deleteFromTablesSequentially(client, userId, tableColumns, 0, callback);
    }

    private static void deleteFromTablesSequentially(SupabaseClient client, String userId,
            String[][] tableColumns, int index, DataCallback<Boolean> callback) {
        if (index >= tableColumns.length) {
            // For mutual_aid_reviews, also delete where user is the reviewed party
            client.delete("mutual_aid_reviews", "reviewed_id=eq." + userId,
                    new SupabaseClient.Callback<JSONArray>() {
                @Override
                public void onSuccess(JSONArray result) {
                    callback.onData(true);
                }
                @Override
                public void onError(String error) {
                    Log.w(TAG, "Delete reviewed_id from mutual_aid_reviews failed (continuing): " + error);
                    callback.onData(true);
                }
            });
            return;
        }

        String table = tableColumns[index][0];
        String column = tableColumns[index][1];

        client.delete(table, column + "=eq." + userId,
                new SupabaseClient.Callback<JSONArray>() {
            @Override
            public void onSuccess(JSONArray result) {
                deleteFromTablesSequentially(client, userId, tableColumns, index + 1, callback);
            }

            @Override
            public void onError(String error) {
                Log.w(TAG, "Delete from " + table + " failed (continuing): " + error);
                deleteFromTablesSequentially(client, userId, tableColumns, index + 1, callback);
            }
        });
    }
}
