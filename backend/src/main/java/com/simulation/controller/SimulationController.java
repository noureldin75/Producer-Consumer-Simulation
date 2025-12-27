package com.simulation.controller;

import com.simulation.dto.*;
import com.simulation.model.Machine;
import com.simulation.model.ProductQueue;
import com.simulation.service.SimulationService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * REST Controller for simulation operations
 */
@RestController
@RequestMapping("/api/simulation")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class SimulationController {

    private final SimulationService simulationService;
    private final Sinks.Many<SimulationState> stateSink;

    public SimulationController(SimulationService simulationService) {
        this.simulationService = simulationService;
        this.stateSink = Sinks.many().multicast().onBackpressureBuffer();

        // Register as state listener
        simulationService.addStateListener(state -> {
            stateSink.tryEmitNext(state);
        });
    }

    // ==================== Queue Operations ====================

    @PostMapping("/queues")
    public ResponseEntity<Map<String, Object>> createQueue(@RequestBody CreateQueueRequest request) {
        ProductQueue queue = simulationService.createQueue(
                request.getName(),
                request.getX(),
                request.getY());

        Map<String, Object> response = new HashMap<>();
        response.put("id", queue.getId());
        response.put("name", queue.getName());
        response.put("x", queue.getX());
        response.put("y", queue.getY());

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/queues/{id}")
    public ResponseEntity<Map<String, Object>> deleteQueue(@PathVariable String id) {
        boolean deleted = simulationService.deleteQueue(id);

        Map<String, Object> response = new HashMap<>();
        response.put("success", deleted);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/queues/{id}/position")
    public ResponseEntity<Map<String, Object>> updateQueuePosition(
            @PathVariable String id,
            @RequestBody Map<String, Double> position) {
        simulationService.updateQueuePosition(id, position.get("x"), position.get("y"));

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/queues/{id}/input")
    public ResponseEntity<Map<String, Object>> setInputQueue(@PathVariable String id) {
        simulationService.setInputQueue(id);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);

        return ResponseEntity.ok(response);
    }

    // ==================== Machine Operations ====================

    @PostMapping("/machines")
    public ResponseEntity<Map<String, Object>> createMachine(@RequestBody CreateMachineRequest request) {
        Machine machine = simulationService.createMachine(
                request.getName(),
                request.getX(),
                request.getY(),
                request.getMinServiceTime(),
                request.getMaxServiceTime());

        Map<String, Object> response = new HashMap<>();
        response.put("id", machine.getId());
        response.put("name", machine.getName());
        response.put("x", machine.getX());
        response.put("y", machine.getY());

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/machines/{id}")
    public ResponseEntity<Map<String, Object>> deleteMachine(@PathVariable String id) {
        boolean deleted = simulationService.deleteMachine(id);

        Map<String, Object> response = new HashMap<>();
        response.put("success", deleted);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/machines/{id}/position")
    public ResponseEntity<Map<String, Object>> updateMachinePosition(
            @PathVariable String id,
            @RequestBody Map<String, Double> position) {
        simulationService.updateMachinePosition(id, position.get("x"), position.get("y"));

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);

        return ResponseEntity.ok(response);
    }

    // ==================== Connection Operations ====================

    @PostMapping("/connections")
    public ResponseEntity<Map<String, Object>> createConnection(@RequestBody ConnectionRequest request) {
        boolean created = simulationService.createConnection(
                request.getFromId(),
                request.getToId(),
                request.getType());

        Map<String, Object> response = new HashMap<>();
        response.put("success", created);

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/connections")
    public ResponseEntity<Map<String, Object>> deleteConnection(@RequestBody ConnectionRequest request) {
        boolean deleted = simulationService.deleteConnection(
                request.getFromId(),
                request.getToId());

        Map<String, Object> response = new HashMap<>();
        response.put("success", deleted);

        return ResponseEntity.ok(response);
    }

    // ==================== Simulation Control ====================

    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> startSimulation() {
        simulationService.startSimulation();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("running", simulationService.isRunning());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/stop")
    public ResponseEntity<Map<String, Object>> stopSimulation() {
        simulationService.stopSimulation();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("running", simulationService.isRunning());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/clear")
    public ResponseEntity<Map<String, Object>> clearBoard() {
        simulationService.clearBoard();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/replay/start")
    public ResponseEntity<Map<String, Object>> startReplay() {
        simulationService.startReplay();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("replayMode", simulationService.isReplayMode());
        response.put("totalSnapshots", simulationService.getSnapshotCount());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/replay/stop")
    public ResponseEntity<Map<String, Object>> stopReplay() {
        simulationService.stopReplay();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("replayMode", simulationService.isReplayMode());

        return ResponseEntity.ok(response);
    }

    @PutMapping("/config/input-rate")
    public ResponseEntity<Map<String, Object>> setInputRate(@RequestBody Map<String, Integer> config) {
        simulationService.setInputRate(config.get("min"), config.get("max"));

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/load-example")
    public ResponseEntity<Map<String, Object>> loadExample() {
        simulationService.loadExample();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);

        return ResponseEntity.ok(response);
    }

    // ==================== State Streaming ====================

    @GetMapping("/state")
    public ResponseEntity<SimulationState> getState() {
        return ResponseEntity.ok(simulationService.getCurrentState());
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<SimulationState> streamState() {
        // Send initial state immediately, then stream updates
        Flux<SimulationState> initialState = Flux.just(simulationService.getCurrentState());
        Flux<SimulationState> updates = stateSink.asFlux();

        return Flux.concat(initialState, updates)
                .onBackpressureLatest()
                .delayElements(Duration.ofMillis(50)); // Throttle to prevent flooding
    }
}
