package com.warrescue.app.model;

public class Alert {
    private String id;
    private String title;
    private String description;
    private String severity; // red, orange, yellow
    private String alertType; // air_strike, artillery, conflict, curfew, chemical, other
    private String city;
    private String country;
    private String createdAt;
    private double latitude;
    private double longitude;
    private double distance;
    private int reliabilityScore;
    private boolean isActive;

    public Alert() {}

    public Alert(String id, String title, String description, String severity,
                 String alertType, String city, String country, String createdAt,
                 double distance, int reliabilityScore) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.severity = severity;
        this.alertType = alertType;
        this.city = city;
        this.country = country;
        this.createdAt = createdAt;
        this.distance = distance;
        this.reliabilityScore = reliabilityScore;
        this.isActive = true;
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }
    public String getAlertType() { return alertType; }
    public void setAlertType(String alertType) { this.alertType = alertType; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }
    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }
    public double getDistance() { return distance; }
    public void setDistance(double distance) { this.distance = distance; }
    public int getReliabilityScore() { return reliabilityScore; }
    public void setReliabilityScore(int reliabilityScore) { this.reliabilityScore = reliabilityScore; }
    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
}
