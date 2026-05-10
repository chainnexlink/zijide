package com.warrescue.app.util;

import android.content.Context;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

/**
 * Loads rescue organization data from assets/rescue_organizations.json.
 * Used by the rescue notification system to find local rescue contacts
 * when an alert is triggered in a specific country/city.
 */
public class RescueOrgLoader {

    private static final String TAG = "RescueOrgLoader";
    private static final String FILE_NAME = "rescue_organizations.json";

    public static class RescueOrg {
        public final String id;
        public final String name;
        public final String nameEn;
        public final String type;
        public final String country;
        public final String city;
        public final String phone;
        public final String email;
        public final List<String> services;
        public final String operatingHours;
        public final boolean isActive;

        public RescueOrg(String id, String name, String nameEn, String type,
                         String country, String city, String phone, String email,
                         List<String> services, String operatingHours, boolean isActive) {
            this.id = id;
            this.name = name;
            this.nameEn = nameEn;
            this.type = type;
            this.country = country;
            this.city = city;
            this.phone = phone;
            this.email = email;
            this.services = services;
            this.operatingHours = operatingHours;
            this.isActive = isActive;
        }
    }

    /**
     * Load all rescue organizations from local JSON.
     */
    public static List<RescueOrg> loadAll(Context context) {
        List<RescueOrg> orgs = new ArrayList<>();
        try {
            String json = readAsset(context, FILE_NAME);
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                orgs.add(parseOrg(arr.getJSONObject(i)));
            }
            Log.d(TAG, "Loaded " + orgs.size() + " rescue organizations");
        } catch (Exception e) {
            Log.e(TAG, "Failed to load rescue organizations", e);
        }
        return orgs;
    }

    /**
     * Get rescue organizations for a specific country.
     * Also includes international organizations.
     */
    public static List<RescueOrg> getByCountry(Context context, String country) {
        List<RescueOrg> all = loadAll(context);
        List<RescueOrg> result = new ArrayList<>();
        for (RescueOrg org : all) {
            if (org.isActive && (org.country.equalsIgnoreCase(country) || "International".equalsIgnoreCase(org.country))) {
                result.add(org);
            }
        }
        return result;
    }

    /**
     * Get 24/7 available rescue organizations for a country (for emergency notifications).
     */
    public static List<RescueOrg> getEmergencyContacts(Context context, String country) {
        List<RescueOrg> byCountry = getByCountry(context, country);
        List<RescueOrg> emergency = new ArrayList<>();
        for (RescueOrg org : byCountry) {
            if ("24/7".equals(org.operatingHours)) {
                emergency.add(org);
            }
        }
        return emergency;
    }

    private static RescueOrg parseOrg(JSONObject obj) throws Exception {
        List<String> services = new ArrayList<>();
        JSONArray svcArr = obj.optJSONArray("services");
        if (svcArr != null) {
            for (int j = 0; j < svcArr.length(); j++) {
                services.add(svcArr.getString(j));
            }
        }
        return new RescueOrg(
                obj.getString("id"),
                obj.getString("name"),
                obj.optString("name_en", ""),
                obj.optString("type", "ngo"),
                obj.optString("country", ""),
                obj.optString("city", ""),
                obj.optString("phone", ""),
                obj.optString("email", ""),
                services,
                obj.optString("operating_hours", ""),
                obj.optBoolean("is_active", true)
        );
    }

    private static String readAsset(Context context, String fileName) throws Exception {
        InputStream is = context.getAssets().open(fileName);
        BufferedReader reader = new BufferedReader(new InputStreamReader(is, "UTF-8"));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line);
        }
        reader.close();
        is.close();
        return sb.toString();
    }
}
