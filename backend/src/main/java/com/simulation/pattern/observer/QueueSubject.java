package com.simulation.pattern.observer;

/**
 * Subject interface for the Observer Design Pattern.
 * Queues implement this interface to manage observer (machine) subscriptions.
 */
public interface QueueSubject {

    /**
     * Register an observer (machine) to be notified when products are available
     * 
     * @param observer The observer to register
     */
    void registerObserver(QueueObserver observer);

    /**
     * Remove an observer from the notification list
     * 
     * @param observer The observer to remove
     */
    void removeObserver(QueueObserver observer);

    /**
     * Notify all registered observers that a product is available
     */
    void notifyObservers();

    /**
     * Register a machine as ready to receive products
     * 
     * @param observer The observer that is ready
     */
    void registerReadyMachine(QueueObserver observer);
}
