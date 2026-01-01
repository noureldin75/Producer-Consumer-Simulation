package com.simulation.service;

import com.simulation.dto.SimulationState;
import com.simulation.model.Machine;
import com.simulation.model.Product;
import com.simulation.model.ProductQueue;
import com.simulation.pattern.snapshot.SimulationSnapshot;
import com.simulation.pattern.snapshot.SnapshotManager;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

/**
 * Main service for managing the simulation.
 * Implements Concurrency Design Pattern with thread management.
 */
@Service
public class SimulationService implements Machine.MachineEventListener {

    // Storage for queues and machines
    private final Map<String, ProductQueue> queues = new ConcurrentHashMap<>();
    private final Map<String, Machine> machines = new ConcurrentHashMap<>();

    // Connections tracking
    private final List<Connection> connections = new CopyOnWriteArrayList<>();

    // Thread management (Concurrency Pattern)
    private ExecutorService productGeneratorExecutor;
    private ScheduledExecutorService snapshotExecutor;
    private ScheduledExecutorService stateUpdateExecutor;

    // Simulation state
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final AtomicBoolean replayMode = new AtomicBoolean(false);

    // Snapshot management (Snapshot Pattern)
    private final SnapshotManager snapshotManager = new SnapshotManager(1000);

    // State update listeners
    private final List<Consumer<SimulationState>> stateListeners = new CopyOnWriteArrayList<>();

    // Counters for generating IDs
    private final AtomicInteger queueCounter = new AtomicInteger(0);
    private final AtomicInteger machineCounter = new AtomicInteger(0);

    // Product generation configuration
    private int minInputRate = 500; // minimum ms between products
    private int maxInputRate = 2000; // maximum ms between products

    // Input queue ID (first queue where products enter)
    private String inputQueueId = null;

    public SimulationService() {
        // Initialize executors
        initExecutors();
    }

    private void initExecutors() {
        productGeneratorExecutor = Executors.newSingleThreadExecutor();
        snapshotExecutor = Executors.newSingleThreadScheduledExecutor();
        stateUpdateExecutor = Executors.newSingleThreadScheduledExecutor();
    }

    /**
     * Create a new queue
     */
    public ProductQueue createQueue(String name, double x, double y) {
        String id = "Q" + queueCounter.getAndIncrement();
        ProductQueue queue = new ProductQueue(id, name != null ? name : id);
        queue.setX(x);
        queue.setY(y);
        queues.put(id, queue);

        // Set as input queue if it's the first one
        if (inputQueueId == null) {
            inputQueueId = id;
        }

        broadcastState();
        return queue;
    }

    /**
     * Create a new machine
     */
    public Machine createMachine(String name, double x, double y, int minServiceTime, int maxServiceTime) {
        String id = "M" + machineCounter.getAndIncrement();
        Machine machine = new Machine(id, name != null ? name : id);
        machine.setX(x);
        machine.setY(y);
        machine.setMinServiceTime(minServiceTime);
        machine.setMaxServiceTime(maxServiceTime);
        machine.setEventListener(this);
        machines.put(id, machine);

        broadcastState();
        return machine;
    }

    /**
     * Create a connection between queue and machine
     */
    public boolean createConnection(String fromId, String toId, String type) {
        if ("queue-to-machine".equals(type)) {
            ProductQueue queue = queues.get(fromId);
            Machine machine = machines.get(toId);

            if (queue != null && machine != null) {
                queue.addOutputMachine(toId);
                machine.setInputQueue(queue);
                machine.setInputQueueId(fromId);
                connections.add(new Connection(fromId, toId, type));
                broadcastState();
                return true;
            }
        } else if ("machine-to-queue".equals(type)) {
            Machine machine = machines.get(fromId);
            ProductQueue queue = queues.get(toId);

            if (machine != null && queue != null) {
                machine.setOutputQueue(queue);
                machine.setOutputQueueId(toId);
                queue.addInputMachine(fromId);
                connections.add(new Connection(fromId, toId, type));
                broadcastState();
                return true;
            }
        }
        return false;
    }

    /**
     * Delete a queue
     */
    public boolean deleteQueue(String id) {
        ProductQueue queue = queues.remove(id);
        if (queue != null) {
            // Remove all connections involving this queue
            connections.removeIf(c -> c.fromId.equals(id) || c.toId.equals(id));

            // Update machines that were connected
            for (Machine machine : machines.values()) {
                if (id.equals(machine.getInputQueueId())) {
                    machine.setInputQueue(null);
                    machine.setInputQueueId(null);
                }
                if (id.equals(machine.getOutputQueueId())) {
                    machine.setOutputQueue(null);
                    machine.setOutputQueueId(null);
                }
            }

            // Update input queue if needed
            if (id.equals(inputQueueId)) {
                inputQueueId = queues.isEmpty() ? null : queues.keySet().iterator().next();
            }

            broadcastState();
            return true;
        }
        return false;
    }

    /**
     * Delete a machine
     */
    public boolean deleteMachine(String id) {
        Machine machine = machines.remove(id);
        if (machine != null) {
            machine.stop();

            // Remove all connections involving this machine
            connections.removeIf(c -> c.fromId.equals(id) || c.toId.equals(id));

            // Update queues that were connected
            for (ProductQueue queue : queues.values()) {
                queue.removeInputMachine(id);
                queue.removeOutputMachine(id);
            }

            broadcastState();
            return true;
        }
        return false;
    }

    /**
     * Delete a connection
     */
    public boolean deleteConnection(String fromId, String toId) {
        Connection toRemove = null;
        for (Connection conn : connections) {
            if (conn.fromId.equals(fromId) && conn.toId.equals(toId)) {
                toRemove = conn;
                break;
            }
        }

        if (toRemove != null) {
            connections.remove(toRemove);

            if ("queue-to-machine".equals(toRemove.type)) {
                ProductQueue queue = queues.get(fromId);
                Machine machine = machines.get(toId);
                if (queue != null)
                    queue.removeOutputMachine(toId);
                if (machine != null) {
                    machine.setInputQueue(null);
                    machine.setInputQueueId(null);
                }
            } else if ("machine-to-queue".equals(toRemove.type)) {
                Machine machine = machines.get(fromId);
                ProductQueue queue = queues.get(toId);
                if (machine != null) {
                    machine.setOutputQueue(null);
                    machine.setOutputQueueId(null);
                }
                if (queue != null)
                    queue.removeInputMachine(fromId);
            }

            broadcastState();
            return true;
        }
        return false;
    }

    /**
     * Update queue position
     */
    public void updateQueuePosition(String id, double x, double y) {
        ProductQueue queue = queues.get(id);
        if (queue != null) {
            queue.setX(x);
            queue.setY(y);
            broadcastState();
        }
    }

    /**
     * Update machine position
     */
    public void updateMachinePosition(String id, double x, double y) {
        Machine machine = machines.get(id);
        if (machine != null) {
            machine.setX(x);
            machine.setY(y);
            broadcastState();
        }
    }

    /**
     * Update machine settings (service times and optionally name)
     */
    public boolean updateMachineSettings(String id, Integer minServiceTime, Integer maxServiceTime, String name) {
        Machine machine = machines.get(id);
        if (machine != null) {
            if (minServiceTime != null && minServiceTime > 0) {
                machine.setMinServiceTime(minServiceTime);
            }
            if (maxServiceTime != null && maxServiceTime > 0) {
                machine.setMaxServiceTime(maxServiceTime);
            }
            if (name != null && !name.trim().isEmpty()) {
                machine.setName(name.trim());
            }
            broadcastState();
            return true;
        }
        return false;
    }

    /**
     * Set the input queue where products enter
     */
    public void setInputQueue(String queueId) {
        if (queues.containsKey(queueId)) {
            this.inputQueueId = queueId;
        }
    }

    /**
     * Start the simulation
     */
    public void startSimulation() {
        if (running.get()) {
            return;
        }

        if (queues.isEmpty() || machines.isEmpty()) {
            return;
        }

        running.set(true);
        replayMode.set(false);
        snapshotManager.clearHistory();

        // Start all machines
        for (Machine machine : machines.values()) {
            machine.setEventListener(this);
            machine.start();
        }

        // Start product generator thread (Concurrency Pattern)
        productGeneratorExecutor = Executors.newSingleThreadExecutor();
        productGeneratorExecutor.submit(this::generateProducts);

        // Start snapshot scheduler - take snapshots every 200ms
        snapshotExecutor = Executors.newSingleThreadScheduledExecutor();
        snapshotExecutor.scheduleAtFixedRate(this::takeSnapshot, 0, 200, TimeUnit.MILLISECONDS);

        // Start state broadcaster - broadcast state every 100ms
        stateUpdateExecutor = Executors.newSingleThreadScheduledExecutor();
        stateUpdateExecutor.scheduleAtFixedRate(this::broadcastState, 0, 100, TimeUnit.MILLISECONDS);

        broadcastState();
    }

    /**
     * Stop the simulation
     */
    public void stopSimulation() {
        running.set(false);

        // Stop all machines
        for (Machine machine : machines.values()) {
            machine.stop();
        }

        // Shutdown executors
        if (productGeneratorExecutor != null) {
            productGeneratorExecutor.shutdownNow();
        }
        if (snapshotExecutor != null) {
            snapshotExecutor.shutdownNow();
        }
        if (stateUpdateExecutor != null) {
            stateUpdateExecutor.shutdownNow();
        }

        broadcastState();
    }

    /**
     * Clear the simulation board
     */
    public void clearBoard() {
        stopSimulation();

        queues.clear();
        machines.clear();
        connections.clear();
        snapshotManager.clearHistory();

        queueCounter.set(0);
        machineCounter.set(0);
        inputQueueId = null;

        broadcastState();
    }

    /**
     * Reset simulation - restart from beginning without clearing configuration
     * Keeps queues, machines, and connections but clears all products and resets
     * states
     */
    public void resetSimulation() {
        stopSimulation();

        // Clear all products from queues
        for (ProductQueue queue : queues.values()) {
            while (queue.removeProduct() != null) {
                // Remove all products
            }
        }

        // Reset machine states (clears all counters and product state)
        for (Machine machine : machines.values()) {
            machine.reset();
        }

        // Clear snapshot history
        snapshotManager.clearHistory();

        broadcastState();
    }

    /**
     * Start replay mode
     */
    public void startReplay() {
        if (running.get()) {
            stopSimulation();
        }

        if (snapshotManager.getSnapshotCount() == 0) {
            return;
        }

        replayMode.set(true);
        snapshotManager.startReplay();

        // Start replay executor
        stateUpdateExecutor = Executors.newSingleThreadScheduledExecutor();
        stateUpdateExecutor.scheduleAtFixedRate(this::replayNextFrame, 0, 200, TimeUnit.MILLISECONDS);
    }

    /**
     * Stop replay mode
     */
    public void stopReplay() {
        replayMode.set(false);
        snapshotManager.stopReplay();

        if (stateUpdateExecutor != null) {
            stateUpdateExecutor.shutdownNow();
        }

        broadcastState();
    }

    /**
     * Replay the next frame
     */
    private void replayNextFrame() {
        SimulationSnapshot snapshot = snapshotManager.getNextReplaySnapshot();
        if (snapshot != null) {
            broadcastSnapshotState(snapshot);
        } else {
            stopReplay();
        }
    }

    /**
     * Generate products at random intervals
     */
    private void generateProducts() {
        Random random = new Random();

        while (running.get()) {
            try {
                // Random delay between products
                int delay = minInputRate + random.nextInt(maxInputRate - minInputRate + 1);
                Thread.sleep(delay);

                if (running.get() && inputQueueId != null) {
                    ProductQueue inputQueue = queues.get(inputQueueId);
                    if (inputQueue != null) {
                        Product product = new Product();
                        inputQueue.addProduct(product);
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }

    /**
     * Take a snapshot of the current state
     */
    private void takeSnapshot() {
        if (!running.get())
            return;

        SimulationSnapshot snapshot = new SimulationSnapshot(System.currentTimeMillis());

        for (ProductQueue queue : queues.values()) {
            snapshot.addQueueSnapshot(queue);
        }

        for (Machine machine : machines.values()) {
            snapshot.addMachineSnapshot(machine);
        }

        for (Connection conn : connections) {
            snapshot.addConnection(conn.fromId, conn.toId, conn.type);
        }

        snapshotManager.saveSnapshot(snapshot);
    }

    /**
     * Get current simulation state
     */
    public SimulationState getCurrentState() {
        SimulationState state = new SimulationState();

        for (ProductQueue queue : queues.values()) {
            state.addQueue(queue);
        }

        for (Machine machine : machines.values()) {
            state.addMachine(machine);
        }

        for (Connection conn : connections) {
            state.addConnection(conn.fromId, conn.toId, conn.type);
        }

        state.setRunning(running.get());
        state.setReplayMode(replayMode.get());
        state.setReplayIndex(snapshotManager.getReplayIndex());
        state.setTotalSnapshots(snapshotManager.getSnapshotCount());
        state.setInputQueueId(inputQueueId);

        return state;
    }

    /**
     * Broadcast current state to all listeners
     */
    public void broadcastState() {
        SimulationState state = getCurrentState();
        for (Consumer<SimulationState> listener : stateListeners) {
            try {
                listener.accept(state);
            } catch (Exception e) {
                // Remove broken listeners
                stateListeners.remove(listener);
            }
        }
    }

    /**
     * Broadcast a snapshot state (for replay)
     */
    private void broadcastSnapshotState(SimulationSnapshot snapshot) {
        SimulationState state = new SimulationState();
        state.setTimestamp(snapshot.getTimestamp());
        state.setRunning(false);
        state.setReplayMode(true);
        state.setReplayIndex(snapshotManager.getReplayIndex());
        state.setTotalSnapshots(snapshotManager.getSnapshotCount());

        // Convert snapshot to state
        for (SimulationSnapshot.QueueSnapshot qs : snapshot.getQueueSnapshots().values()) {
            SimulationState.QueueState qState = new SimulationState.QueueState();
            qState.id = qs.id;
            qState.name = qs.name;
            qState.x = qs.x;
            qState.y = qs.y;
            qState.size = qs.products.size();
            qState.products = new ArrayList<>();
            for (Product p : qs.products) {
                SimulationState.ProductState ps = new SimulationState.ProductState();
                ps.id = p.getId();
                ps.color = p.getColor();
                qState.products.add(ps);
            }
            state.getQueues().add(qState);
        }

        for (SimulationSnapshot.MachineSnapshot ms : snapshot.getMachineSnapshots().values()) {
            SimulationState.MachineState mState = new SimulationState.MachineState();
            mState.id = ms.id;
            mState.name = ms.name;
            mState.x = ms.x;
            mState.y = ms.y;
            mState.processing = ms.processing;
            mState.currentColor = ms.currentColor;
            mState.flashing = ms.flashing;
            mState.inputQueueId = ms.inputQueueId;
            mState.outputQueueId = ms.outputQueueId;
            mState.productsProcessed = ms.productsProcessed;
            if (ms.currentProduct != null) {
                mState.currentProductId = ms.currentProduct.getId();
            }
            state.getMachines().add(mState);
        }

        for (SimulationSnapshot.ConnectionSnapshot cs : snapshot.getConnections()) {
            state.addConnection(cs.fromId, cs.toId, cs.type);
        }

        for (Consumer<SimulationState> listener : stateListeners) {
            try {
                listener.accept(state);
            } catch (Exception e) {
                stateListeners.remove(listener);
            }
        }
    }

    /**
     * Add a state listener
     */
    public void addStateListener(Consumer<SimulationState> listener) {
        stateListeners.add(listener);
    }

    /**
     * Remove a state listener
     */
    public void removeStateListener(Consumer<SimulationState> listener) {
        stateListeners.remove(listener);
    }

    // Machine event listener

    @Override
    public void onMachineStateChange(Machine machine) {
        // Don't broadcast on every change to avoid flooding
        // The scheduled broadcaster will handle it
    }

    // Getters

    public Map<String, ProductQueue> getQueues() {
        return new HashMap<>(queues);
    }

    public Map<String, Machine> getMachines() {
        return new HashMap<>(machines);
    }

    public boolean isRunning() {
        return running.get();
    }

    public boolean isReplayMode() {
        return replayMode.get();
    }

    public int getSnapshotCount() {
        return snapshotManager.getSnapshotCount();
    }

    public void setInputRate(int min, int max) {
        this.minInputRate = min;
        this.maxInputRate = max;
    }

    /**
     * Get the input queue ID
     */
    public String getInputQueueId() {
        return this.inputQueueId;
    }

    /**
     * Load a complex example configuration
     * Creates a 4-stage parallel assembly line:
     * Queue0 (Input) -> M1, M0 -> Q1, Q2 -> M2, M3 -> Q4, Q3 -> M4, M5 -> Q5, Q6 ->
     * M6 -> Q7 (Output)
     */
    public void loadExample() {
        // Clear existing
        clearBoard();

        // === Stage 0: Input Queue ===
        ProductQueue q0 = createQueue("Queue 0", 30, 250); // INPUT

        // === Stage 1: First parallel machines ===
        Machine m1 = createMachine("Machine 1", 120, 80, 800, 2000);
        Machine m0 = createMachine("Machine 0", 120, 420, 1000, 2500);

        // === Stage 1 Output Queues ===
        ProductQueue q1 = createQueue("Queue 1", 230, 140);
        ProductQueue q2 = createQueue("Queue 2", 230, 320);

        // === Stage 2: Second parallel machines ===
        Machine m2 = createMachine("Machine 2", 320, 80, 600, 1500);
        Machine m3 = createMachine("Machine 3", 320, 420, 900, 2000);

        // === Stage 2 Output Queues ===
        ProductQueue q4 = createQueue("Queue 4", 430, 140);
        ProductQueue q3 = createQueue("Queue 3", 430, 320);

        // === Stage 3: Third parallel machines ===
        Machine m4 = createMachine("Machine 4", 530, 80, 700, 1800);
        Machine m5 = createMachine("Machine 5", 530, 380, 800, 2200);

        // === Stage 3 Output Queues ===
        ProductQueue q5 = createQueue("Queue 5", 640, 140);
        ProductQueue q6 = createQueue("Queue 6", 640, 320);

        // === Stage 4: Final merge machine ===
        Machine m6 = createMachine("Machine 6", 750, 200, 600, 1500);

        // === Output Queue ===
        ProductQueue q7 = createQueue("Queue 7", 870, 200);

        // === Create all connections ===

        // Input -> M1 and M0
        createConnection(q0.getId(), m1.getId(), "queue-to-machine");
        createConnection(q0.getId(), m0.getId(), "queue-to-machine");

        // M1 -> Q1, M0 -> Q2
        createConnection(m1.getId(), q1.getId(), "machine-to-queue");
        createConnection(m0.getId(), q2.getId(), "machine-to-queue");

        // Q1 -> M2, Q2 -> M3
        createConnection(q1.getId(), m2.getId(), "queue-to-machine");
        createConnection(q2.getId(), m3.getId(), "queue-to-machine");

        // M2 -> Q4, M3 -> Q3
        createConnection(m2.getId(), q4.getId(), "machine-to-queue");
        createConnection(m3.getId(), q3.getId(), "machine-to-queue");

        // Q4 -> M4, Q4 -> M5 (shared), Q3 -> M5
        createConnection(q4.getId(), m4.getId(), "queue-to-machine");
        createConnection(q4.getId(), m5.getId(), "queue-to-machine");
        createConnection(q3.getId(), m5.getId(), "queue-to-machine");

        // M4 -> Q5, M5 -> Q6
        createConnection(m4.getId(), q5.getId(), "machine-to-queue");
        createConnection(m5.getId(), q6.getId(), "machine-to-queue");

        // Q5 -> M6, Q6 -> M6 (merge)
        createConnection(q5.getId(), m6.getId(), "queue-to-machine");
        createConnection(q6.getId(), m6.getId(), "queue-to-machine");

        // M6 -> Q7 (Output)
        createConnection(m6.getId(), q7.getId(), "machine-to-queue");

        // Set input queue
        setInputQueue(q0.getId());

        broadcastState();
    }

    /**
     * Export current configuration as a Map
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> exportConfiguration() {
        Map<String, Object> config = new HashMap<>();

        // Export queues
        List<Map<String, Object>> queueList = new ArrayList<>();
        for (ProductQueue queue : queues.values()) {
            Map<String, Object> queueMap = new HashMap<>();
            queueMap.put("id", queue.getId());
            queueMap.put("name", queue.getName());
            queueMap.put("x", queue.getX());
            queueMap.put("y", queue.getY());
            queueList.add(queueMap);
        }
        config.put("queues", queueList);

        // Export machines
        List<Map<String, Object>> machineList = new ArrayList<>();
        for (Machine machine : machines.values()) {
            Map<String, Object> machineMap = new HashMap<>();
            machineMap.put("id", machine.getId());
            machineMap.put("name", machine.getName());
            machineMap.put("x", machine.getX());
            machineMap.put("y", machine.getY());
            machineMap.put("minServiceTime", machine.getMinServiceTime());
            machineMap.put("maxServiceTime", machine.getMaxServiceTime());
            machineList.add(machineMap);
        }
        config.put("machines", machineList);

        // Export connections
        List<Map<String, Object>> connectionList = new ArrayList<>();
        for (Connection connection : connections) {
            Map<String, Object> connMap = new HashMap<>();
            connMap.put("fromId", connection.fromId);
            connMap.put("toId", connection.toId);
            connMap.put("type", connection.type);
            connectionList.add(connMap);
        }
        config.put("connections", connectionList);

        config.put("inputQueueId", inputQueueId);

        return config;
    }

    /**
     * Import configuration from a Map
     */
    @SuppressWarnings("unchecked")
    public boolean importConfiguration(Map<String, Object> config) {
        try {
            // Clear existing
            clearBoard();

            // Import queues
            List<Map<String, Object>> queueList = (List<Map<String, Object>>) config.get("queues");
            Map<String, String> queueIdMapping = new HashMap<>();

            if (queueList != null) {
                for (Map<String, Object> queueMap : queueList) {
                    String oldId = (String) queueMap.get("id");
                    String name = (String) queueMap.get("name");
                    double x = ((Number) queueMap.get("x")).doubleValue();
                    double y = ((Number) queueMap.get("y")).doubleValue();

                    ProductQueue queue = createQueue(name, x, y);
                    queueIdMapping.put(oldId, queue.getId());
                }
            }

            // Import machines
            List<Map<String, Object>> machineList = (List<Map<String, Object>>) config.get("machines");
            Map<String, String> machineIdMapping = new HashMap<>();

            if (machineList != null) {
                for (Map<String, Object> machineMap : machineList) {
                    String oldId = (String) machineMap.get("id");
                    String name = (String) machineMap.get("name");
                    double x = ((Number) machineMap.get("x")).doubleValue();
                    double y = ((Number) machineMap.get("y")).doubleValue();
                    int minServiceTime = ((Number) machineMap.get("minServiceTime")).intValue();
                    int maxServiceTime = ((Number) machineMap.get("maxServiceTime")).intValue();

                    Machine machine = createMachine(name, x, y, minServiceTime, maxServiceTime);
                    machineIdMapping.put(oldId, machine.getId());
                }
            }

            // Import connections
            List<Map<String, Object>> connectionList = (List<Map<String, Object>>) config.get("connections");
            if (connectionList != null) {
                for (Map<String, Object> connMap : connectionList) {
                    String oldFromId = (String) connMap.get("fromId");
                    String oldToId = (String) connMap.get("toId");
                    String type = (String) connMap.get("type");

                    // Map old IDs to new IDs
                    String newFromId = queueIdMapping.getOrDefault(oldFromId, machineIdMapping.get(oldFromId));
                    String newToId = queueIdMapping.getOrDefault(oldToId, machineIdMapping.get(oldToId));

                    if (newFromId != null && newToId != null) {
                        createConnection(newFromId, newToId, type);
                    }
                }
            }

            // Set input queue
            String oldInputQueueId = (String) config.get("inputQueueId");
            if (oldInputQueueId != null) {
                String newInputQueueId = queueIdMapping.get(oldInputQueueId);
                if (newInputQueueId != null) {
                    setInputQueue(newInputQueueId);
                }
            }

            broadcastState();
            return true;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Inner class for connection tracking
     */
    private static class Connection {
        String fromId;
        String toId;
        String type;

        Connection(String fromId, String toId, String type) {
            this.fromId = fromId;
            this.toId = toId;
            this.type = type;
        }
    }
}
