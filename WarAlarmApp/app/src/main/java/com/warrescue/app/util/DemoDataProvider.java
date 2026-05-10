package com.warrescue.app.util;

import android.content.Context;

import com.warrescue.app.R;
import com.warrescue.app.model.Alert;
import com.warrescue.app.model.Announcement;
import com.warrescue.app.model.CityAlert;
import com.warrescue.app.model.FamilyMember;
import com.warrescue.app.model.Shelter;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

/**
 * Provides mock data for demo mode.
 * In production, this would be replaced with actual API calls.
 */
public class DemoDataProvider {

    public static List<Alert> getAlerts(Context ctx) {
        List<Alert> alerts = new ArrayList<>();
        Calendar cal = Calendar.getInstance();
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());

        cal.add(Calendar.MINUTE, -15);
        Alert a1 = new Alert("1", ctx.getString(R.string.demo_alert_1_title),
                ctx.getString(R.string.demo_alert_1_desc),
                "red", "air_strike", ctx.getString(R.string.demo_alert_1_city), ctx.getString(R.string.demo_country_ukraine),
                sdf.format(cal.getTime()), 3.2, 92);
        a1.setLatitude(50.4501);
        a1.setLongitude(30.5234);
        alerts.add(a1);

        cal.add(Calendar.MINUTE, -30);
        Alert a2 = new Alert("2", ctx.getString(R.string.demo_alert_2_title),
                ctx.getString(R.string.demo_alert_2_desc),
                "orange", "artillery", ctx.getString(R.string.demo_alert_2_city), ctx.getString(R.string.demo_country_ukraine),
                sdf.format(cal.getTime()), 12.5, 87);
        a2.setLatitude(48.0159);
        a2.setLongitude(37.8029);
        alerts.add(a2);

        cal.add(Calendar.HOUR, -2);
        Alert a3 = new Alert("3", ctx.getString(R.string.demo_alert_3_title),
                ctx.getString(R.string.demo_alert_3_desc),
                "orange", "conflict", ctx.getString(R.string.demo_alert_3_city), ctx.getString(R.string.demo_country_lebanon),
                sdf.format(cal.getTime()), 8.1, 78);
        a3.setLatitude(33.8938);
        a3.setLongitude(35.5018);
        alerts.add(a3);

        cal.add(Calendar.HOUR, -4);
        Alert a4 = new Alert("4", ctx.getString(R.string.demo_alert_4_title),
                ctx.getString(R.string.demo_alert_4_desc),
                "yellow", "curfew", ctx.getString(R.string.demo_alert_4_city), ctx.getString(R.string.demo_country_iraq),
                sdf.format(cal.getTime()), 0, 95);
        a4.setLatitude(33.3152);
        a4.setLongitude(44.3661);
        alerts.add(a4);

        cal.add(Calendar.HOUR, -6);
        Alert a5 = new Alert("5", ctx.getString(R.string.demo_alert_5_title),
                ctx.getString(R.string.demo_alert_5_desc),
                "red", "air_strike", ctx.getString(R.string.demo_alert_5_city), ctx.getString(R.string.demo_country_israel),
                sdf.format(cal.getTime()), 5.8, 96);
        a5.setLatitude(32.0853);
        a5.setLongitude(34.7818);
        alerts.add(a5);

        cal.add(Calendar.DAY_OF_MONTH, -1);
        Alert a6 = new Alert("6", ctx.getString(R.string.demo_alert_6_title),
                ctx.getString(R.string.demo_alert_6_desc),
                "orange", "chemical", ctx.getString(R.string.demo_alert_6_city), ctx.getString(R.string.demo_country_ukraine),
                sdf.format(cal.getTime()), 15.3, 71);
        a6.setLatitude(49.9935);
        a6.setLongitude(36.2304);
        alerts.add(a6);

        cal.add(Calendar.DAY_OF_MONTH, -1);
        Alert a7 = new Alert("7", ctx.getString(R.string.demo_alert_7_title),
                ctx.getString(R.string.demo_alert_7_desc),
                "yellow", "other", ctx.getString(R.string.demo_alert_7_city), ctx.getString(R.string.demo_country_ukraine),
                sdf.format(cal.getTime()), 25.0, 65);
        a7.setLatitude(47.8388);
        a7.setLongitude(35.1396);
        alerts.add(a7);

        // Palestine / Gaza
        cal.add(Calendar.MINUTE, -20);
        Alert a8 = new Alert("8", ctx.getString(R.string.demo_alert_8_title),
                ctx.getString(R.string.demo_alert_8_desc),
                "red", "air_strike", ctx.getString(R.string.demo_alert_8_city), ctx.getString(R.string.demo_country_palestine),
                sdf.format(cal.getTime()), 2.0, 94);
        a8.setLatitude(31.5017);
        a8.setLongitude(34.4668);
        alerts.add(a8);

        cal.add(Calendar.HOUR, -3);
        Alert a9 = new Alert("9", ctx.getString(R.string.demo_alert_9_title),
                ctx.getString(R.string.demo_alert_9_desc),
                "orange", "artillery", ctx.getString(R.string.demo_alert_9_city), ctx.getString(R.string.demo_country_palestine),
                sdf.format(cal.getTime()), 6.0, 88);
        a9.setLatitude(31.2357);
        a9.setLongitude(34.2529);
        alerts.add(a9);

        return alerts;
    }

    public static List<Shelter> getShelters(Context ctx) {
        // Load all 156 shelters from assets/shelters.json (synced with Web frontend)
        List<Shelter> shelters = ShelterDataLoader.loadShelters(ctx);
        if (!shelters.isEmpty()) {
            return shelters;
        }
        // Fallback: 5 hardcoded Kyiv shelters if JSON loading fails
        String city = ctx.getString(R.string.demo_alert_1_city);

        Shelter s1 = new Shelter("1", ctx.getString(R.string.demo_shelter_1_name),
                ctx.getString(R.string.demo_shelter_1_addr), city,
                500, 123, "open", 0.8, "underground");
        s1.setLatitude(50.4501);
        s1.setLongitude(30.5234);
        shelters.add(s1);

        Shelter s2 = new Shelter("2", ctx.getString(R.string.demo_shelter_2_name),
                ctx.getString(R.string.demo_shelter_2_addr), city,
                200, 89, "open", 1.2, "bunker");
        s2.setLatitude(50.4505);
        s2.setLongitude(30.5225);
        shelters.add(s2);

        Shelter s3 = new Shelter("3", ctx.getString(R.string.demo_shelter_3_name),
                ctx.getString(R.string.demo_shelter_3_addr), city,
                150, 145, "full", 2.1, "underground");
        s3.setLatitude(50.4480);
        s3.setLongitude(30.5180);
        shelters.add(s3);

        Shelter s4 = new Shelter("4", ctx.getString(R.string.demo_shelter_4_name),
                ctx.getString(R.string.demo_shelter_4_addr), city,
                800, 234, "open", 3.5, "building");
        s4.setLatitude(50.4350);
        s4.setLongitude(30.5290);
        shelters.add(s4);

        Shelter s5 = new Shelter("5", ctx.getString(R.string.demo_shelter_5_name),
                ctx.getString(R.string.demo_shelter_5_addr), city,
                100, 45, "open", 0.5, "underground");
        s5.setLatitude(50.5010);
        s5.setLongitude(30.4980);
        shelters.add(s5);

        // Palestine / Gaza shelters
        String gazaCity = ctx.getString(R.string.demo_alert_8_city);

        Shelter s6 = new Shelter("6", ctx.getString(R.string.demo_shelter_6_name),
                ctx.getString(R.string.demo_shelter_6_addr), gazaCity,
                600, 520, "open", 0.3, "building");
        s6.setLatitude(31.5015);
        s6.setLongitude(34.4670);
        shelters.add(s6);

        Shelter s7 = new Shelter("7", ctx.getString(R.string.demo_shelter_7_name),
                ctx.getString(R.string.demo_shelter_7_addr), gazaCity,
                300, 280, "full", 1.5, "underground");
        s7.setLatitude(31.5193);
        s7.setLongitude(34.4510);
        shelters.add(s7);

        Shelter s8 = new Shelter("8", ctx.getString(R.string.demo_shelter_8_name),
                ctx.getString(R.string.demo_shelter_8_addr), gazaCity,
                400, 310, "open", 0.8, "building");
        s8.setLatitude(31.5050);
        s8.setLongitude(34.4590);
        shelters.add(s8);

        return shelters;
    }

    public static List<FamilyMember> getFamilyMembers(Context ctx) {
        List<FamilyMember> members = new ArrayList<>();

        FamilyMember m1 = new FamilyMember("1", ctx.getString(R.string.demo_family_dad), true);
        m1.setRole("admin");
        members.add(m1);

        FamilyMember m2 = new FamilyMember("2", ctx.getString(R.string.demo_family_mom), true);
        m2.setRole("member");
        members.add(m2);

        FamilyMember m3 = new FamilyMember("3", ctx.getString(R.string.demo_family_child), false);
        m3.setRole("member");
        m3.setLastSeen(ctx.getString(R.string.demo_family_last_seen));
        members.add(m3);

        FamilyMember m4 = new FamilyMember("4", ctx.getString(R.string.demo_family_grandma), true);
        m4.setRole("member");
        members.add(m4);

        return members;
    }

    public static List<CityAlert> getCityAlerts(Context ctx) {
        List<CityAlert> alerts = new ArrayList<>();
        Calendar cal = Calendar.getInstance();
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());

        cal.add(Calendar.MINUTE, -3);
        CityAlert ca1 = new CityAlert("c1", ctx.getString(R.string.demo_alert_1_city), "air_strike", 5,
                sdf.format(cal.getTime()),
                ctx.getString(R.string.demo_city_alert_1_desc),
                "red");
        ca1.setLatitude(50.4501);
        ca1.setLongitude(30.5234);
        alerts.add(ca1);

        cal.add(Calendar.MINUTE, -8);
        CityAlert ca2 = new CityAlert("c2", ctx.getString(R.string.demo_alert_6_city), "artillery", 3,
                sdf.format(cal.getTime()),
                ctx.getString(R.string.demo_city_alert_2_desc),
                "orange");
        ca2.setLatitude(49.9935);
        ca2.setLongitude(36.2304);
        alerts.add(ca2);

        cal.add(Calendar.MINUTE, -12);
        CityAlert ca3 = new CityAlert("c3", ctx.getString(R.string.demo_alert_2_city), "conflict", 2,
                sdf.format(cal.getTime()),
                ctx.getString(R.string.demo_city_alert_3_desc),
                "orange");
        ca3.setLatitude(48.0159);
        ca3.setLongitude(37.8029);
        alerts.add(ca3);

        cal.add(Calendar.HOUR, -1);
        CityAlert ca4 = new CityAlert("c4", ctx.getString(R.string.demo_alert_3_city), "conflict", 4,
                sdf.format(cal.getTime()),
                ctx.getString(R.string.demo_city_alert_4_desc),
                "red");
        ca4.setLatitude(33.8938);
        ca4.setLongitude(35.5018);
        alerts.add(ca4);

        cal.add(Calendar.HOUR, -3);
        CityAlert ca5 = new CityAlert("c5", ctx.getString(R.string.demo_alert_1_city), "chemical", 1,
                sdf.format(cal.getTime()),
                ctx.getString(R.string.demo_city_alert_5_desc),
                "yellow");
        ca5.setActive(false);
        ca5.setLatitude(50.4480);
        ca5.setLongitude(30.5180);
        alerts.add(ca5);

        // Gaza, Palestine
        cal.add(Calendar.MINUTE, -20);
        CityAlert ca6 = new CityAlert("c6", ctx.getString(R.string.demo_alert_8_city), "air_strike", 7,
                sdf.format(cal.getTime()),
                ctx.getString(R.string.demo_city_alert_6_desc),
                "red");
        ca6.setActive(true);
        ca6.setLatitude(31.5017);
        ca6.setLongitude(34.4668);
        alerts.add(ca6);

        return alerts;
    }

    public static List<Announcement> getAnnouncements(Context ctx) {
        List<Announcement> list = new ArrayList<>();
        Calendar cal = Calendar.getInstance();
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());

        cal.add(Calendar.MINUTE, -10);
        list.add(new Announcement("a1",
                ctx.getString(R.string.demo_announce_1_title),
                ctx.getString(R.string.demo_announce_1_content),
                "reward", sdf.format(cal.getTime())));

        cal.add(Calendar.HOUR, -2);
        list.add(new Announcement("a2",
                ctx.getString(R.string.demo_announce_2_title),
                ctx.getString(R.string.demo_announce_2_content),
                "subscription", sdf.format(cal.getTime())));

        cal.add(Calendar.DAY_OF_MONTH, -1);
        list.add(new Announcement("a3",
                ctx.getString(R.string.demo_announce_3_title),
                ctx.getString(R.string.demo_announce_3_content),
                "system", sdf.format(cal.getTime())));

        return list;
    }
}