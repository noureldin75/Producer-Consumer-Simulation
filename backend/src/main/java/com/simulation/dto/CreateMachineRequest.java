package com.simulation.dto;

/**
 * DTO for creating a new machine
 */
public class CreateMachineRequest {
    private String name;
    private double x;
    private double y;
    private int minServiceTime;
    private int maxServiceTime;

    public CreateMachineRequest() {
        this.minServiceTime = 1000;
        this.maxServiceTime = 3000;
    }

    public CreateMachineRequest(String name, double x, double y) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.minServiceTime = 1000;
        this.maxServiceTime = 3000;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public double getX() {
        return x;
    }

    public void setX(double x) {
        this.x = x;
    }

    public double getY() {
        return y;
    }

    public void setY(double y) {
        this.y = y;
    }

    public int getMinServiceTime() {
        return minServiceTime;
    }

    public void setMinServiceTime(int minServiceTime) {
        this.minServiceTime = minServiceTime;
    }

    public int getMaxServiceTime() {
        return maxServiceTime;
    }

    public void setMaxServiceTime(int maxServiceTime) {
        this.maxServiceTime = maxServiceTime;
    }
}
