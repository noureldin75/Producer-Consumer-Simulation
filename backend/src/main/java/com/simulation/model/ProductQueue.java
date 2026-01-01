package com.simulation.model;

import com.simulation.pattern.observer.QueueObserver;
import com.simulation.pattern.observer.QueueSubject;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * Represents a queue in the assembly line that holds products waiting to be
 * processed.
 * Implements the Subject part of the Observer Design Pattern.
 */
public class ProductQueue implements QueueSubject, Serializable, Cloneable {
    private static final long serialVersionUID = 1L;

    private final String id;
    private String name;
    private final ConcurrentLinkedQueue<Product> products;
    private double x;
    private double y;

    // Maximum capacity (0 or negative means unlimited)
    private int maxCapacity = 0;

    // Observer pattern: list of machines observing this queue
    private transient List<QueueObserver> observers;
    // Ready machines waiting for products
    private transient Queue<QueueObserver> readyMachines;

    // Connections
    private List<String> inputMachineIds;
    private List<String> outputMachineIds;

    public ProductQueue(String id, String name) {
        this.id = id;
        this.name = name;
        this.products = new ConcurrentLinkedQueue<>();
        this.observers = new ArrayList<>();
        this.readyMachines = new LinkedList<>();
        this.inputMachineIds = new ArrayList<>();
        this.outputMachineIds = new ArrayList<>();
        this.x = 0;
        this.y = 0;
        this.maxCapacity = 0; // Unlimited by default
    }

    /**
     * Check if queue is full (has max capacity and is at limit)
     */
    public boolean isFull() {
        return maxCapacity > 0 && products.size() >= maxCapacity;
    }

    /**
     * Add a product to the queue
     * 
     * @return true if product was added, false if queue is full
     */
    public synchronized boolean addProduct(Product product) {
        // Check capacity before adding
        if (isFull()) {
            return false;
        }

        product.setCurrentLocation(this.id);
        products.add(product);

        // Check if any machine is ready and waiting
        if (!readyMachines.isEmpty()) {
            QueueObserver readyMachine = readyMachines.poll();
            if (readyMachine != null && readyMachine.isReady()) {
                readyMachine.onProductAvailable(this.id);
            }
        }
        return true;
    }

    /**
     * Remove and return the next product from the queue
     */
    public synchronized Product removeProduct() {
        return products.poll();
    }

    /**
     * Peek at the next product without removing it
     */
    public Product peekProduct() {
        return products.peek();
    }

    /**
     * Get the current size of the queue
     */
    public int getSize() {
        return products.size();
    }

    /**
     * Check if the queue is empty
     */
    public boolean isEmpty() {
        return products.isEmpty();
    }

    // Observer Pattern Implementation

    @Override
    public void registerObserver(QueueObserver observer) {
        if (observers == null)
            observers = new ArrayList<>();
        if (!observers.contains(observer)) {
            observers.add(observer);
        }
    }

    @Override
    public void removeObserver(QueueObserver observer) {
        if (observers != null) {
            observers.remove(observer);
        }
    }

    @Override
    public void notifyObservers() {
        if (observers != null) {
            for (QueueObserver observer : observers) {
                if (observer.isReady()) {
                    observer.onProductAvailable(this.id);
                    break; // Only notify one ready machine
                }
            }
        }
    }

    @Override
    public synchronized void registerReadyMachine(QueueObserver observer) {
        if (readyMachines == null)
            readyMachines = new LinkedList<>();

        // If there are products waiting, immediately notify the machine
        if (!products.isEmpty()) {
            observer.onProductAvailable(this.id);
        } else {
            // Otherwise, add to ready queue
            if (!readyMachines.contains(observer)) {
                readyMachines.add(observer);
            }
        }
    }

    // Connection management

    public void addInputMachine(String machineId) {
        if (!inputMachineIds.contains(machineId)) {
            inputMachineIds.add(machineId);
        }
    }

    public void addOutputMachine(String machineId) {
        if (!outputMachineIds.contains(machineId)) {
            outputMachineIds.add(machineId);
        }
    }

    public void removeInputMachine(String machineId) {
        inputMachineIds.remove(machineId);
    }

    public void removeOutputMachine(String machineId) {
        outputMachineIds.remove(machineId);
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

    public List<String> getInputMachineIds() {
        return inputMachineIds;
    }

    public List<String> getOutputMachineIds() {
        return outputMachineIds;
    }

    public List<Product> getProductsList() {
        return new ArrayList<>(products);
    }

    public int getMaxCapacity() {
        return maxCapacity;
    }

    public void setMaxCapacity(int maxCapacity) {
        this.maxCapacity = maxCapacity;
    }

    @Override
    public ProductQueue clone() {
        ProductQueue clone = new ProductQueue(this.id, this.name);
        clone.x = this.x;
        clone.y = this.y;
        clone.maxCapacity = this.maxCapacity;
        clone.inputMachineIds = new ArrayList<>(this.inputMachineIds);
        clone.outputMachineIds = new ArrayList<>(this.outputMachineIds);
        for (Product p : this.products) {
            clone.products.add(p.clone());
        }
        return clone;
    }

    @Override
    public String toString() {
        return "ProductQueue{id='" + id + "', name='" + name + "', size=" + getSize() + ", maxCapacity=" + maxCapacity
                + "}";
    }
}
