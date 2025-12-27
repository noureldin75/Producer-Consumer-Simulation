package com.simulation.pattern.snapshot;

import com.simulation.model.Machine;
import com.simulation.model.Product;
import com.simulation.model.ProductQueue;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Memento class for the Snapshot Design Pattern.
 * Stores a complete state of the simulation at a specific point in time.
 */
public class SimulationSnapshot implements Serializable {
    private static final long serialVersionUID = 1L;

    private final long timestamp;
    private final Map<String, QueueSnapshot> queueSnapshots;
    private final Map<String, MachineSnapshot> machineSnapshots;
    private final List<ConnectionSnapshot> connections;

    public SimulationSnapshot(long timestamp) {
        this.timestamp = timestamp;
        this.queueSnapshots = new HashMap<>();
        this.machineSnapshots = new HashMap<>();
        this.connections = new ArrayList<>();
    }

    public void addQueueSnapshot(ProductQueue queue) {
        QueueSnapshot snapshot = new QueueSnapshot();
        snapshot.id = queue.getId();
        snapshot.name = queue.getName();
        snapshot.x = queue.getX();
        snapshot.y = queue.getY();
        snapshot.products = new ArrayList<>();
        for (Product p : queue.getProductsList()) {
            snapshot.products.add(p.clone());
        }
        snapshot.inputMachineIds = new ArrayList<>(queue.getInputMachineIds());
        snapshot.outputMachineIds = new ArrayList<>(queue.getOutputMachineIds());
        queueSnapshots.put(queue.getId(), snapshot);
    }

    public void addMachineSnapshot(Machine machine) {
        MachineSnapshot snapshot = new MachineSnapshot();
        snapshot.id = machine.getId();
        snapshot.name = machine.getName();
        snapshot.x = machine.getX();
        snapshot.y = machine.getY();
        snapshot.minServiceTime = machine.getMinServiceTime();
        snapshot.maxServiceTime = machine.getMaxServiceTime();
        snapshot.inputQueueId = machine.getInputQueueId();
        snapshot.outputQueueId = machine.getOutputQueueId();
        snapshot.currentColor = machine.getCurrentColor();
        snapshot.flashing = machine.isFlashing();
        snapshot.processing = machine.isProcessing();
        if (machine.getCurrentProduct() != null) {
            snapshot.currentProduct = machine.getCurrentProduct().clone();
        }
        snapshot.productsProcessed = machine.getProductsProcessed();
        machineSnapshots.put(machine.getId(), snapshot);
    }

    public void addConnection(String fromId, String toId, String type) {
        ConnectionSnapshot conn = new ConnectionSnapshot();
        conn.fromId = fromId;
        conn.toId = toId;
        conn.type = type;
        connections.add(conn);
    }

    // Getters

    public long getTimestamp() {
        return timestamp;
    }

    public Map<String, QueueSnapshot> getQueueSnapshots() {
        return queueSnapshots;
    }

    public Map<String, MachineSnapshot> getMachineSnapshots() {
        return machineSnapshots;
    }

    public List<ConnectionSnapshot> getConnections() {
        return connections;
    }

    /**
     * Inner class for queue state
     */
    public static class QueueSnapshot implements Serializable {
        private static final long serialVersionUID = 1L;

        public String id;
        public String name;
        public double x;
        public double y;
        public List<Product> products;
        public List<String> inputMachineIds;
        public List<String> outputMachineIds;
    }

    /**
     * Inner class for machine state
     */
    public static class MachineSnapshot implements Serializable {
        private static final long serialVersionUID = 1L;

        public String id;
        public String name;
        public double x;
        public double y;
        public int minServiceTime;
        public int maxServiceTime;
        public String inputQueueId;
        public String outputQueueId;
        public String currentColor;
        public boolean flashing;
        public boolean processing;
        public Product currentProduct;
        public int productsProcessed;
    }

    /**
     * Inner class for connection state
     */
    public static class ConnectionSnapshot implements Serializable {
        private static final long serialVersionUID = 1L;

        public String fromId;
        public String toId;
        public String type; // "queue-to-machine" or "machine-to-queue"
    }
}
