package com.simulation.dto;

/**
 * DTO for creating a connection between queue and machine
 */
public class ConnectionRequest {
    private String fromId;
    private String toId;
    private String type; // "queue-to-machine" or "machine-to-queue"

    public ConnectionRequest() {
    }

    public ConnectionRequest(String fromId, String toId, String type) {
        this.fromId = fromId;
        this.toId = toId;
        this.type = type;
    }

    public String getFromId() {
        return fromId;
    }

    public void setFromId(String fromId) {
        this.fromId = fromId;
    }

    public String getToId() {
        return toId;
    }

    public void setToId(String toId) {
        this.toId = toId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
