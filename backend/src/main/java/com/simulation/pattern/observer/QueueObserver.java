package com.simulation.pattern.observer;

import com.simulation.model.Product;

/**
 * Observer interface for the Observer Design Pattern.
 * Machines implement this interface to be notified when products are available
 * in queues.
 */
public interface QueueObserver {

    /**
     * Called when a product becomes available in the observed queue
     * 
     * @param queueId The ID of the queue that has a product available
     */
    void onProductAvailable(String queueId);

    /**
     * Gets the unique identifier of this observer (machine)
     * 
     * @return The observer's ID
     */
    String getObserverId();

    /**
     * Check if this observer is ready to receive a product
     * 
     * @return true if ready, false otherwise
     */
    boolean isReady();
}
