package com.warrescue.app.model;

/**
 * Model for city-wide crowdsourced alerts.
 * Triggered when 3+ users in the same city respond within 5 minutes.
 */
public class CityAlert {
    private String id;
    private String city;
    private String alertType;
    private int userCount;
    private int triggerThreshold;
    private long windowMs;
    private String firstReportTime;
    private String description;
    private String severity;
    private boolean isActive;
    private double latitude;
    private double longitude;

    public CityAlert(String id, String city, String alertType, int userCount,
                     String firstReportTime, String description, String severity) {
        this.id = id;
        this.city = city;
        this.alertType = alertType;
        this.userCount = userCount;
        this.triggerThreshold = 3;
        this.windowMs = 5 * 60 * 1000;
        this.firstReportTime = firstReportTime;
        this.description = description;
        this.severity = severity;
        this.isActive = true;
    }

    public String getId() { return id; }
    public String getCity() { return city; }
    public String getAlertType() { return alertType; }
    public int getUserCount() { return userCount; }
    public int getTriggerThreshold() { return triggerThreshold; }
    public long getWindowMs() { return windowMs; }
    public String getFirstReportTime() { return firstReportTime; }
    public String getDescription() { return description; }
    public String getSeverity() { return severity; }
    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }
    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }
    public void setUserCount(int userCount) { this.userCount = userCount; }

    public boolean isTriggered() {
        return userCount >= triggerThreshold;
    }

    public String getStatusText() {
        if (isTriggered()) {
            return userCount + " users confirmed";
        }
        return userCount + "/" + triggerThreshold + " users";
    }
}
