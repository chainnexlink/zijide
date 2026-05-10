package com.warrescue.app.util;

import android.content.Context;
import android.util.Log;

import com.warrescue.app.model.Shelter;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

/**
 * Loads shelter data from assets/shelters.json.
 * This ensures Android App and Web frontend share the same 156 shelters.
 */
public class ShelterDataLoader {

    private static final String TAG = "ShelterDataLoader";
    private static final String SHELTERS_FILE = "shelters.json";

    public static List<Shelter> loadShelters(Context context) {
        List<Shelter> shelters = new ArrayList<>();
        try {
            String json = readAsset(context, SHELTERS_FILE);
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                Shelter s = new Shelter();
                s.setId(obj.getString("id"));
                s.setName(obj.getString("name"));
                s.setAddress(obj.optString("address", ""));
                s.setCity(obj.optString("city", ""));
                s.setCountry(obj.optString("country", ""));
                s.setLatitude(obj.getDouble("latitude"));
                s.setLongitude(obj.getDouble("longitude"));
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
            Log.d(TAG, "Loaded " + shelters.size() + " shelters from " + SHELTERS_FILE);
        } catch (Exception e) {
            Log.e(TAG, "Failed to load shelters from assets", e);
        }
        return shelters;
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
