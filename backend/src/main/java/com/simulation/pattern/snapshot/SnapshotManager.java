package com.simulation.pattern.snapshot;

import java.util.ArrayList;
import java.util.List;

/**
 * Caretaker class for the Snapshot Design Pattern.
 * Manages the history of simulation snapshots for replay functionality.
 */
public class SnapshotManager {

    private List<SimulationSnapshot> history;
    private int maxSnapshots;
    private int replayIndex;
    private boolean replayMode;

    public SnapshotManager() {
        this.history = new ArrayList<>();
        this.maxSnapshots = 1000; // Store up to 1000 snapshots
        this.replayIndex = 0;
        this.replayMode = false;
    }

    public SnapshotManager(int maxSnapshots) {
        this.history = new ArrayList<>();
        this.maxSnapshots = maxSnapshots;
        this.replayIndex = 0;
        this.replayMode = false;
    }

    /**
     * Save a snapshot to history
     */
    public synchronized void saveSnapshot(SimulationSnapshot snapshot) {
        if (history.size() >= maxSnapshots) {
            // Remove oldest snapshot to make room
            history.remove(0);
        }
        history.add(snapshot);
    }

    /**
     * Get all snapshots in the history
     */
    public List<SimulationSnapshot> getHistory() {
        return new ArrayList<>(history);
    }

    /**
     * Get the number of snapshots stored
     */
    public int getSnapshotCount() {
        return history.size();
    }

    /**
     * Clear all snapshots
     */
    public void clearHistory() {
        history.clear();
        replayIndex = 0;
        replayMode = false;
    }

    /**
     * Start replay mode from the beginning
     */
    public void startReplay() {
        replayIndex = 0;
        replayMode = true;
    }

    /**
     * Stop replay mode
     */
    public void stopReplay() {
        replayMode = false;
    }

    /**
     * Check if in replay mode
     */
    public boolean isReplayMode() {
        return replayMode;
    }

    /**
     * Get the next snapshot for replay
     * 
     * @return The next snapshot, or null if at the end
     */
    public synchronized SimulationSnapshot getNextReplaySnapshot() {
        if (!replayMode || replayIndex >= history.size()) {
            return null;
        }
        return history.get(replayIndex++);
    }

    /**
     * Get a specific snapshot by index
     */
    public SimulationSnapshot getSnapshot(int index) {
        if (index >= 0 && index < history.size()) {
            return history.get(index);
        }
        return null;
    }

    /**
     * Get the current replay index
     */
    public int getReplayIndex() {
        return replayIndex;
    }

    /**
     * Set the replay index
     */
    public void setReplayIndex(int index) {
        if (index >= 0 && index < history.size()) {
            this.replayIndex = index;
        }
    }

    /**
     * Check if replay has more snapshots
     */
    public boolean hasMoreSnapshots() {
        return replayMode && replayIndex < history.size();
    }

    /**
     * Get the first snapshot
     */
    public SimulationSnapshot getFirstSnapshot() {
        return history.isEmpty() ? null : history.get(0);
    }

    /**
     * Get the last snapshot
     */
    public SimulationSnapshot getLastSnapshot() {
        return history.isEmpty() ? null : history.get(history.size() - 1);
    }
}
