package com.simulation.model;

import com.simulation.pattern.observer.QueueObserver;

import java.io.Serializable;
import java.util.Random;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Represents a processing machine in the assembly line.
 * Implements the Observer part of the Observer Design Pattern.
 * Each machine runs on its own thread (Concurrency Design Pattern).
 */
public class Machine implements QueueObserver, Serializable, Cloneable {
    private static final long serialVersionUID = 1L;
    private static final String DEFAULT_COLOR = "#6B7280";

    private final String id;
    private String name;
    private double x;
    private double y;

    // Processing configuration
    private int minServiceTime; // in milliseconds
    private int maxServiceTime;

    // Current state
    private transient AtomicBoolean ready;
    private transient AtomicBoolean processing;
    private transient Product currentProduct;
    private String currentColor;
    private boolean flashing;

    // Connections
    private String inputQueueId;
    private String outputQueueId;

    // Statistics
    private int productsProcessed;
    private long totalProcessingTime;

    // Transient fields for runtime
    private transient ProductQueue inputQueue;
    private transient ProductQueue outputQueue;
    private transient Thread processingThread;
    private transient AtomicBoolean running;
    private transient MachineEventListener eventListener;

    public Machine(String id, String name) {
        this.id = id;
        this.name = name;
        this.minServiceTime = 1000;
        this.maxServiceTime = 3000;
        this.ready = new AtomicBoolean(true);
        this.processing = new AtomicBoolean(false);
        this.running = new AtomicBoolean(false);
        this.currentColor = DEFAULT_COLOR;
        this.flashing = false;
        this.productsProcessed = 0;
        this.totalProcessingTime = 0;
        this.x = 0;
        this.y = 0;
    }

    /**
     * Initialize transient fields after deserialization
     */
    public void initTransient() {
        if (ready == null)
            ready = new AtomicBoolean(true);
        if (processing == null)
            processing = new AtomicBoolean(false);
        if (running == null)
            running = new AtomicBoolean(false);
    }

    /**
     * Reset machine state for simulation restart
     * Clears all counters and current product
     */
    public void reset() {
        initTransient();
        this.productsProcessed = 0;
        this.totalProcessingTime = 0;
        this.currentProduct = null;
        this.currentColor = DEFAULT_COLOR;
        this.flashing = false;
        if (processing != null)
            processing.set(false);
        if (ready != null)
            ready.set(true);
    }

    /**
     * Set the event listener for machine state changes
     */
    public void setEventListener(MachineEventListener listener) {
        this.eventListener = listener;
    }

    /**
     * Start the machine's processing thread
     */
    public void start() {
        initTransient();
        running.set(true);
        ready.set(true);

        // Register with input queue as ready
        if (inputQueue != null) {
            inputQueue.registerObserver(this);
            inputQueue.registerReadyMachine(this);
        }
    }

    /**
     * Stop the machine's processing thread
     */
    public void stop() {
        running.set(false);
        if (processingThread != null) {
            processingThread.interrupt();
        }
        if (inputQueue != null) {
            inputQueue.removeObserver(this);
        }
    }

    // Observer Pattern Implementation

    @Override
    public void onProductAvailable(String queueId) {
        if (!running.get() || !ready.get()) {
            return;
        }

        if (inputQueue != null && inputQueue.getId().equals(queueId)) {
            Product product = inputQueue.removeProduct();
            if (product != null) {
                processProduct(product);
            } else {
                // No product available, register as ready again
                inputQueue.registerReadyMachine(this);
            }
        }
    }

    @Override
    public String getObserverId() {
        return id;
    }

    @Override
    public boolean isReady() {
        return ready.get() && running.get();
    }

    /**
     * Process a product on a separate thread
     */
    private void processProduct(Product product) {
        ready.set(false);
        processing.set(true);
        currentProduct = product;
        currentProduct.setCurrentLocation(this.id);
        currentColor = product.getColor();

        // Notify UI of state change
        notifyStateChange();

        // Create processing thread (Concurrency Pattern)
        processingThread = new Thread(() -> {
            try {
                // Random service time
                Random random = new Random();
                int serviceTime = minServiceTime + random.nextInt(maxServiceTime - minServiceTime + 1);

                Thread.sleep(serviceTime);

                if (running.get()) {
                    // Processing complete
                    finishProcessing(serviceTime);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "Machine-" + id + "-Processor");

        processingThread.start();
    }

    /**
     * Finish processing the current product
     */
    private synchronized void finishProcessing(int serviceTime) {
        if (currentProduct == null)
            return;

        // Flash effect
        flashing = true;
        notifyStateChange();

        // Move product to output queue
        if (outputQueue != null) {
            outputQueue.addProduct(currentProduct);
        }

        // Update statistics
        productsProcessed++;
        totalProcessingTime += serviceTime;

        // Reset state after flash
        try {
            Thread.sleep(300); // Flash duration
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        flashing = false;
        currentProduct = null;
        currentColor = DEFAULT_COLOR;
        processing.set(false);
        ready.set(true);

        notifyStateChange();

        // Register as ready for next product
        if (inputQueue != null && running.get()) {
            inputQueue.registerReadyMachine(this);
        }
    }

    /**
     * Notify listener of state change
     */
    private void notifyStateChange() {
        if (eventListener != null) {
            eventListener.onMachineStateChange(this);
        }
    }

    // Getters and Setters

    public String getId() {
        return id;
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

    public String getInputQueueId() {
        return inputQueueId;
    }

    public void setInputQueueId(String inputQueueId) {
        this.inputQueueId = inputQueueId;
    }

    public String getOutputQueueId() {
        return outputQueueId;
    }

    public void setOutputQueueId(String outputQueueId) {
        this.outputQueueId = outputQueueId;
    }

    public ProductQueue getInputQueue() {
        return inputQueue;
    }

    public void setInputQueue(ProductQueue inputQueue) {
        this.inputQueue = inputQueue;
        if (inputQueue != null) {
            this.inputQueueId = inputQueue.getId();
        }
    }

    public ProductQueue getOutputQueue() {
        return outputQueue;
    }

    public void setOutputQueue(ProductQueue outputQueue) {
        this.outputQueue = outputQueue;
        if (outputQueue != null) {
            this.outputQueueId = outputQueue.getId();
        }
    }

    public boolean isProcessing() {
        return processing != null && processing.get();
    }

    public Product getCurrentProduct() {
        return currentProduct;
    }

    public String getCurrentColor() {
        return currentColor;
    }

    public boolean isFlashing() {
        return flashing;
    }

    public int getProductsProcessed() {
        return productsProcessed;
    }

    public long getTotalProcessingTime() {
        return totalProcessingTime;
    }

    public boolean isRunning() {
        return running != null && running.get();
    }

    @Override
    public Machine clone() {
        Machine clone = new Machine(this.id, this.name);
        clone.x = this.x;
        clone.y = this.y;
        clone.minServiceTime = this.minServiceTime;
        clone.maxServiceTime = this.maxServiceTime;
        clone.inputQueueId = this.inputQueueId;
        clone.outputQueueId = this.outputQueueId;
        clone.productsProcessed = this.productsProcessed;
        clone.totalProcessingTime = this.totalProcessingTime;
        clone.currentColor = this.currentColor;
        if (this.currentProduct != null) {
            clone.currentProduct = this.currentProduct.clone();
        }
        return clone;
    }

    @Override
    public String toString() {
        return "Machine{id='" + id + "', name='" + name + "', processing=" + isProcessing() + "}";
    }

    /**
     * Listener interface for machine state changes
     */
    public interface MachineEventListener {
        void onMachineStateChange(Machine machine);
    }
}
