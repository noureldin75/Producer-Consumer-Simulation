package com.simulation.dto;

import com.simulation.model.Machine;
import com.simulation.model.Product;
import com.simulation.model.ProductQueue;

import java.util.ArrayList;
import java.util.List;

/**
 * DTO for simulation state updates sent to the frontend
 */
public class SimulationState {
    private List<QueueState> queues;
    private List<MachineState> machines;
    private List<ConnectionState> connections;
    private boolean running;
    private boolean replayMode;
    private int replayIndex;
    private int totalSnapshots;
    private long timestamp;
    private String inputQueueId;

    public SimulationState() {
        this.queues = new ArrayList<>();
        this.machines = new ArrayList<>();
        this.connections = new ArrayList<>();
        this.timestamp = System.currentTimeMillis();
    }

    public void addQueue(ProductQueue queue) {
        QueueState state = new QueueState();
        state.id = queue.getId();
        state.name = queue.getName();
        state.x = queue.getX();
        state.y = queue.getY();
        state.size = queue.getSize();
        state.maxCapacity = queue.getMaxCapacity();
        state.isFull = queue.isFull();
        state.products = new ArrayList<>();
        for (Product p : queue.getProductsList()) {
            ProductState ps = new ProductState();
            ps.id = p.getId();
            ps.color = p.getColor();
            state.products.add(ps);
        }
        queues.add(state);
    }

    public void addMachine(Machine machine) {
        MachineState state = new MachineState();
        state.id = machine.getId();
        state.name = machine.getName();
        state.x = machine.getX();
        state.y = machine.getY();
        state.processing = machine.isProcessing();
        state.currentColor = machine.getCurrentColor();
        state.flashing = machine.isFlashing();
        state.inputQueueId = machine.getInputQueueId();
        state.outputQueueId = machine.getOutputQueueId();
        state.productsProcessed = machine.getProductsProcessed();
        state.minServiceTime = machine.getMinServiceTime();
        state.maxServiceTime = machine.getMaxServiceTime();
        if (machine.getCurrentProduct() != null) {
            state.currentProductId = machine.getCurrentProduct().getId();
        }
        machines.add(state);
    }

    public void addConnection(String fromId, String toId, String type) {
        ConnectionState state = new ConnectionState();
        state.fromId = fromId;
        state.toId = toId;
        state.type = type;
        connections.add(state);
    }

    // Getters and Setters

    public List<QueueState> getQueues() {
        return queues;
    }

    public void setQueues(List<QueueState> queues) {
        this.queues = queues;
    }

    public List<MachineState> getMachines() {
        return machines;
    }

    public void setMachines(List<MachineState> machines) {
        this.machines = machines;
    }

    public List<ConnectionState> getConnections() {
        return connections;
    }

    public void setConnections(List<ConnectionState> connections) {
        this.connections = connections;
    }

    public boolean isRunning() {
        return running;
    }

    public void setRunning(boolean running) {
        this.running = running;
    }

    public boolean isReplayMode() {
        return replayMode;
    }

    public void setReplayMode(boolean replayMode) {
        this.replayMode = replayMode;
    }

    public int getReplayIndex() {
        return replayIndex;
    }

    public void setReplayIndex(int replayIndex) {
        this.replayIndex = replayIndex;
    }

    public int getTotalSnapshots() {
        return totalSnapshots;
    }

    public void setTotalSnapshots(int totalSnapshots) {
        this.totalSnapshots = totalSnapshots;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public String getInputQueueId() {
        return inputQueueId;
    }

    public void setInputQueueId(String inputQueueId) {
        this.inputQueueId = inputQueueId;
    }

    // Inner classes for state representation

    public static class QueueState {
        public String id;
        public String name;
        public double x;
        public double y;
        public int size;
        public int maxCapacity;
        public boolean isFull;
        public List<ProductState> products;
    }

    public static class MachineState {
        public String id;
        public String name;
        public double x;
        public double y;
        public boolean processing;
        public String currentColor;
        public boolean flashing;
        public String inputQueueId;
        public String outputQueueId;
        public String currentProductId;
        public int productsProcessed;
        public int minServiceTime;
        public int maxServiceTime;
    }

    public static class ConnectionState {
        public String fromId;
        public String toId;
        public String type;
    }

    public static class ProductState {
        public String id;
        public String color;
    }
}
