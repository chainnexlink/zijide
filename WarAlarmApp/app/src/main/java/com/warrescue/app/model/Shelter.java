package com.warrescue.app.model;

public class Shelter {
    private String id;
    private String name;
    private String address;
    private String city;
    private String country;
    private double latitude;
    private double longitude;
    private int capacity;
    private int currentOccupancy;
    private String status; // open, crowded, full, closed
    private double distance;
    private String type; // underground, building, bunker
    private boolean hasWater;
    private boolean hasElectricity;
    private boolean hasMedical;
    private boolean hasToilet;
    private boolean hasRestArea;
    private String phone;
    private String openingHours;

    public Shelter() {}

    public Shelter(String id, String name, String address, String city,
                   int capacity, int currentOccupancy, String status,
                   double distance, String type) {
        this.id = id;
        this.name = name;
        this.address = address;
        this.city = city;
        this.capacity = capacity;
        this.currentOccupancy = currentOccupancy;
        this.status = status;
        this.distance = distance;
        this.type = type;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }
    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }
    public int getCapacity() { return capacity; }
    public void setCapacity(int capacity) { this.capacity = capacity; }
    public int getCurrentOccupancy() { return currentOccupancy; }
    public void setCurrentOccupancy(int currentOccupancy) { this.currentOccupancy = currentOccupancy; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public double getDistance() { return distance; }
    public void setDistance(double distance) { this.distance = distance; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public boolean isHasWater() { return hasWater; }
    public void setHasWater(boolean hasWater) { this.hasWater = hasWater; }
    public boolean isHasElectricity() { return hasElectricity; }
    public void setHasElectricity(boolean hasElectricity) { this.hasElectricity = hasElectricity; }
    public boolean isHasMedical() { return hasMedical; }
    public void setHasMedical(boolean hasMedical) { this.hasMedical = hasMedical; }
    public boolean isHasToilet() { return hasToilet; }
    public void setHasToilet(boolean hasToilet) { this.hasToilet = hasToilet; }
    public boolean isHasRestArea() { return hasRestArea; }
    public void setHasRestArea(boolean hasRestArea) { this.hasRestArea = hasRestArea; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getOpeningHours() { return openingHours; }
    public void setOpeningHours(String openingHours) { this.openingHours = openingHours; }
}
