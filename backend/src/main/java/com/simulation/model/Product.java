package com.simulation.model;

import java.io.Serializable;
import java.util.UUID;

/**
 * Represents a product being processed in the assembly line.
 * Each product has a unique ID and a color that persists throughout its
 * lifecycle.
 */
public class Product implements Serializable, Cloneable {
    private static final long serialVersionUID = 1L;

    private final String id;
    private final String color;
    private final long createdAt;
    private String currentLocation;

    public Product() {
        this.id = UUID.randomUUID().toString().substring(0, 8);
        this.color = generateRandomColor();
        this.createdAt = System.currentTimeMillis();
        this.currentLocation = "Q0";
    }

    public Product(String id, String color, long createdAt, String currentLocation) {
        this.id = id;
        this.color = color;
        this.createdAt = createdAt;
        this.currentLocation = currentLocation;
    }

    /**
     * Generates a random vibrant color in hex format
     */
    private String generateRandomColor() {
        String[] colors = {
                "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
                "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
                "#F8B500", "#FF6F61", "#6B5B95", "#88B04B", "#F7CAC9",
                "#92A8D1", "#955251", "#B565A7", "#009B77", "#DD4124"
        };
        return colors[(int) (Math.random() * colors.length)];
    }

    public String getId() {
        return id;
    }

    public String getColor() {
        return color;
    }

    public long getCreatedAt() {
        return createdAt;
    }

    public String getCurrentLocation() {
        return currentLocation;
    }

    public void setCurrentLocation(String currentLocation) {
        this.currentLocation = currentLocation;
    }

    @Override
    public Product clone() {
        return new Product(this.id, this.color, this.createdAt, this.currentLocation);
    }

    @Override
    public String toString() {
        return "Product{id='" + id + "', color='" + color + "', location='" + currentLocation + "'}";
    }
}
