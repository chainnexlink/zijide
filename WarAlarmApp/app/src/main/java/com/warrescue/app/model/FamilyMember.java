package com.warrescue.app.model;

public class FamilyMember {
    private String id;
    private String nickname;
    private boolean isOnline;
    private double latitude;
    private double longitude;
    private String lastSeen;
    private String role; // admin, member

    public FamilyMember() {}

    public FamilyMember(String id, String nickname, boolean isOnline) {
        this.id = id;
        this.nickname = nickname;
        this.isOnline = isOnline;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public boolean isOnline() { return isOnline; }
    public void setOnline(boolean online) { isOnline = online; }
    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }
    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }
    public String getLastSeen() { return lastSeen; }
    public void setLastSeen(String lastSeen) { this.lastSeen = lastSeen; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
