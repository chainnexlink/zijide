package com.warrescue.app.model;

public class Announcement {
    private String id;
    private String title;
    private String content;
    private String type; // "info", "warning", "critical"
    private String createdAt;

    public Announcement(String id, String title, String content, String type, String createdAt) {
        this.id = id;
        this.title = title;
        this.content = content;
        this.type = type;
        this.createdAt = createdAt;
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public String getType() { return type; }
    public String getCreatedAt() { return createdAt; }
}
