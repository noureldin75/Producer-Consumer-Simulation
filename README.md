# Producer/Consumer Simulation Program

A visual simulation of an assembly line production system using queues and processing machines. Built with **Angular 19** (frontend) and **Spring Boot 3.2** (backend).

![Simulation Screenshot](docs/screenshot.png)

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Design Patterns](#design-patterns)
4. [Architecture](#architecture)
5. [Installation & Running](#installation--running)
6. [User Guide](#user-guide)
7. [UML Diagrams](#uml-diagrams)
8. [API Documentation](#api-documentation)

---

## 🎯 Overview

This application simulates an assembly line where products flow through a network of queues and processing machines. Users can:
- Graphically add and connect queues and machines
- Watch products flow through the system in real-time
- See machines process products with visual feedback
- Replay previous simulations

---

## ✨ Features

### Core Features
- **Graphical UI**: Drag-and-drop interface for building assembly lines
- **Real-time Simulation**: Products flow from input queue through machines
- **Random Processing**: Both product arrival and machine processing times are randomized
- **Multi-threaded Processing**: Each machine operates on its own thread
- **Visual Feedback**:
  - Queue sizes displayed in real-time
  - Machines change color to match the product being processed
  - Machines flash when completing processing
  - Products maintain their color throughout the lifecycle

### Control Features
- Start/Stop simulation
- Clear the board
- Replay previous simulations
- Configure input rates

---

## 🎨 Design Patterns

### 1. Observer Design Pattern

**Purpose**: Machines need to know when products are available in their input queue.

**Implementation**:
- `QueueSubject` interface (implemented by `ProductQueue`)
- `QueueObserver` interface (implemented by `Machine`)

```java
// When a product arrives in a queue:
public void addProduct(Product product) {
    products.add(product);
    // Notify ready machines
    if (!readyMachines.isEmpty()) {
        QueueObserver readyMachine = readyMachines.poll();
        readyMachine.onProductAvailable(this.id);
    }
}

// Machine registers as ready when idle:
public void registerReadyMachine(QueueObserver observer) {
    if (!products.isEmpty()) {
        observer.onProductAvailable(this.id);
    } else {
        readyMachines.add(observer);
    }
}
```

**Files**:
- `backend/src/main/java/com/simulation/pattern/observer/QueueObserver.java`
- `backend/src/main/java/com/simulation/pattern/observer/QueueSubject.java`
- `backend/src/main/java/com/simulation/model/ProductQueue.java`
- `backend/src/main/java/com/simulation/model/Machine.java`

### 2. Concurrency Design Pattern

**Purpose**: Each machine processes products independently on its own thread.

**Implementation**:
- Each machine creates a processing thread when a product arrives
- ExecutorService manages product generation
- ScheduledExecutorService handles periodic snapshot taking and state broadcasting

```java
// Machine processing on separate thread:
private void processProduct(Product product) {
    processingThread = new Thread(() -> {
        int serviceTime = minServiceTime + random.nextInt(maxServiceTime - minServiceTime);
        Thread.sleep(serviceTime);
        finishProcessing(serviceTime);
    }, "Machine-" + id + "-Processor");
    processingThread.start();
}

// Product generator running on its own thread:
productGeneratorExecutor.submit(this::generateProducts);
```

**Files**:
- `backend/src/main/java/com/simulation/model/Machine.java`
- `backend/src/main/java/com/simulation/service/SimulationService.java`

### 3. Snapshot (Memento) Design Pattern

**Purpose**: Save simulation state for replay functionality.

**Implementation**:
- `SimulationSnapshot` (Memento): Stores complete state at a point in time
- `SnapshotManager` (Caretaker): Manages snapshot history
- `SimulationService` (Originator): Creates snapshots periodically

```java
// Taking a snapshot:
private void takeSnapshot() {
    SimulationSnapshot snapshot = new SimulationSnapshot(System.currentTimeMillis());
    for (ProductQueue queue : queues.values()) {
        snapshot.addQueueSnapshot(queue);
    }
    for (Machine machine : machines.values()) {
        snapshot.addMachineSnapshot(machine);
    }
    snapshotManager.saveSnapshot(snapshot);
}

// Replaying:
public void startReplay() {
    snapshotManager.startReplay();
    stateUpdateExecutor.scheduleAtFixedRate(this::replayNextFrame, 0, 200, TimeUnit.MILLISECONDS);
}
```

**Files**:
- `backend/src/main/java/com/simulation/pattern/snapshot/SimulationSnapshot.java`
- `backend/src/main/java/com/simulation/pattern/snapshot/SnapshotManager.java`
- `backend/src/main/java/com/simulation/service/SimulationService.java`

---

## 🏗️ Architecture

### Backend (Spring Boot)

```
backend/
├── src/main/java/com/simulation/
│   ├── SimulationApplication.java    # Main entry point
│   ├── config/
│   │   └── WebConfig.java            # CORS configuration
│   ├── controller/
│   │   └── SimulationController.java # REST API endpoints
│   ├── dto/
│   │   ├── CreateQueueRequest.java
│   │   ├── CreateMachineRequest.java
│   │   ├── ConnectionRequest.java
│   │   └── SimulationState.java      # State DTO for SSE
│   ├── model/
│   │   ├── Product.java              # Product entity
│   │   ├── ProductQueue.java         # Queue (Subject)
│   │   └── Machine.java              # Machine (Observer)
│   ├── pattern/
│   │   ├── observer/
│   │   │   ├── QueueObserver.java
│   │   │   └── QueueSubject.java
│   │   └── snapshot/
│   │       ├── SimulationSnapshot.java
│   │       └── SnapshotManager.java
│   └── service/
│       └── SimulationService.java    # Core simulation logic
└── pom.xml
```

### Frontend (Angular)

```
frontend/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── simulation-board/     # Main board component
│   │   │   ├── control-panel/        # Control panel
│   │   │   ├── queue-node/           # Queue visualization
│   │   │   └── machine-node/         # Machine visualization
│   │   ├── models/
│   │   │   └── simulation.models.ts  # TypeScript interfaces
│   │   ├── services/
│   │   │   └── simulation.service.ts # API & SSE service
│   │   ├── app.ts
│   │   └── app.config.ts
│   ├── styles.css
│   └── index.html
└── package.json
```

---

## 🚀 Installation & Running

### Prerequisites

- **Java 17+** (for backend)
- **Maven 3.8+** (for backend)
- **Node.js 18+** (for frontend)
- **npm 9+** (for frontend)

### Step 1: Clone/Download the Project

```bash
cd producer-consumer-simulation
```

### Step 2: Start the Backend

```bash
cd backend
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

### Step 3: Start the Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run start
```

The frontend will start on `http://localhost:4200`

### Step 4: Open the Application

Navigate to `http://localhost:4200` in your browser.

---

## 📖 User Guide

### Building an Assembly Line

1. **Add Queues**: Click "Add Queue" in the control panel
2. **Add Machines**: Click "Add Machine" in the control panel
3. **Connect Components**:
   - Click "Connect Nodes" to enter connection mode
   - Click on a connection point (small circle) on a queue
   - Click on a connection point on a machine
   - Connections: Queue → Machine (input) or Machine → Queue (output)

4. **Set Input Queue**: Double-click a queue to set it as the input queue (where products enter)

### Running the Simulation

1. **Start**: Click "Start" to begin the simulation
   - Products will appear in the input queue at random intervals
   - Machines will pull products from their input queues
   - Machines change color while processing
   - Machines flash when completing
   - Products move to output queues

2. **Stop**: Click "Stop" to pause the simulation

3. **Clear**: Click "Clear" to remove all components

### Replay

After stopping a simulation:
1. Click "Replay" to watch the simulation again
2. Progress bar shows replay position
3. Click "Stop Replay" to end

### Keyboard Shortcuts

- **Delete**: Remove selected node
- **Escape**: Cancel connection mode / deselect

---

## 📊 UML Diagrams

### Class Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           OBSERVER PATTERN                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐         ┌──────────────────┐                      │
│  │  <<interface>>    │         │  <<interface>>    │                      │
│  │  QueueSubject     │         │  QueueObserver    │                      │
│  ├──────────────────┤         ├──────────────────┤                      │
│  │+registerObserver()│         │+onProductAvailable│                      │
│  │+removeObserver()  │         │+getObserverId()  │                      │
│  │+notifyObservers() │         │+isReady()        │                      │
│  │+registerReady()   │         └────────▲─────────┘                      │
│  └────────▲─────────┘                   │                                │
│           │                              │                                │
│           │                              │                                │
│  ┌────────┴─────────┐         ┌─────────┴────────┐                      │
│  │   ProductQueue    │◄────────│     Machine       │                      │
│  ├──────────────────┤         ├──────────────────┤                      │
│  │-id: String       │         │-id: String       │                      │
│  │-name: String     │         │-name: String     │                      │
│  │-products: Queue  │         │-minServiceTime   │                      │
│  │-observers: List  │         │-maxServiceTime   │                      │
│  │-readyMachines    │         │-inputQueue       │                      │
│  ├──────────────────┤         │-outputQueue      │                      │
│  │+addProduct()     │         │-currentProduct   │                      │
│  │+removeProduct()  │         │-processing       │                      │
│  │+getSize()        │         ├──────────────────┤                      │
│  └──────────────────┘         │+start()          │                      │
│                                │+stop()           │                      │
│                                │+processProduct() │                      │
│                                └──────────────────┘                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          SNAPSHOT PATTERN                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐    ┌──────────────────┐   ┌──────────────────┐   │
│  │ SimulationService │───>│  SnapshotManager  │──>│SimulationSnapshot│   │
│  │   (Originator)    │    │   (Caretaker)     │   │   (Memento)      │   │
│  ├──────────────────┤    ├──────────────────┤   ├──────────────────┤   │
│  │+takeSnapshot()   │    │-history: List    │   │-timestamp        │   │
│  │+startReplay()    │    │-replayIndex      │   │-queueSnapshots   │   │
│  │+replayNextFrame()│    ├──────────────────┤   │-machineSnapshots │   │
│  └──────────────────┘    │+saveSnapshot()   │   │-connections      │   │
│                          │+getNextReplay()  │   └──────────────────┘   │
│                          │+startReplay()    │                           │
│                          └──────────────────┘                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        CONCURRENCY PATTERN                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     SimulationService                             │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │   │
│  │  │ productGenerator │  │ snapshotExecutor │  │ stateUpdateExec  │   │   │
│  │  │   (Thread)       │  │  (Scheduled)     │  │  (Scheduled)     │   │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │   Machine 1   │  │   Machine 2   │  │   Machine N   │                   │
│  │  (Thread)     │  │  (Thread)     │  │  (Thread)     │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Sequence Diagram - Product Processing

```
    ┌─────┐          ┌───────────┐       ┌─────────┐       ┌───────────┐
    │Input│          │InputQueue │       │ Machine │       │OutputQueue│
    └──┬──┘          └─────┬─────┘       └────┬────┘       └─────┬─────┘
       │                   │                  │                  │
       │ addProduct()      │                  │                  │
       │──────────────────>│                  │                  │
       │                   │                  │                  │
       │                   │onProductAvailable│                  │
       │                   │─────────────────>│                  │
       │                   │                  │                  │
       │                   │ removeProduct()  │                  │
       │                   │<─────────────────│                  │
       │                   │                  │                  │
       │                   │   product        │                  │
       │                   │─────────────────>│                  │
       │                   │                  │                  │
       │                   │                  │[processing]      │
       │                   │                  │─────────┐        │
       │                   │                  │         │        │
       │                   │                  │<────────┘        │
       │                   │                  │                  │
       │                   │                  │   addProduct()   │
       │                   │                  │─────────────────>│
       │                   │                  │                  │
       │                   │registerReadyMachine                 │
       │                   │<─────────────────│                  │
       │                   │                  │                  │
    ┌──┴──┐          ┌─────┴─────┐       ┌────┴────┐       ┌─────┴─────┐
    │Input│          │InputQueue │       │ Machine │       │OutputQueue│
    └─────┘          └───────────┘       └─────────┘       └───────────┘
```

---

## 📡 API Documentation

### Queues

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/simulation/queues` | Create a new queue |
| DELETE | `/api/simulation/queues/{id}` | Delete a queue |
| PUT | `/api/simulation/queues/{id}/position` | Update queue position |
| PUT | `/api/simulation/queues/{id}/input` | Set as input queue |

### Machines

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/simulation/machines` | Create a new machine |
| DELETE | `/api/simulation/machines/{id}` | Delete a machine |
| PUT | `/api/simulation/machines/{id}/position` | Update machine position |

### Connections

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/simulation/connections` | Create a connection |
| DELETE | `/api/simulation/connections` | Delete a connection |

### Simulation Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/simulation/start` | Start simulation |
| POST | `/api/simulation/stop` | Stop simulation |
| POST | `/api/simulation/clear` | Clear all components |
| POST | `/api/simulation/replay/start` | Start replay |
| POST | `/api/simulation/replay/stop` | Stop replay |
| PUT | `/api/simulation/config/input-rate` | Set input rate |

### State

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/simulation/state` | Get current state |
| GET | `/api/simulation/stream` | SSE stream for real-time updates |

---

## 📝 Design Decisions

1. **SSE over WebSocket**: Server-Sent Events chosen for simplicity since communication is primarily server-to-client

2. **Standalone Angular Components**: Using Angular's new standalone component architecture for cleaner imports

3. **Concurrent Collections**: Using `ConcurrentHashMap` and `ConcurrentLinkedQueue` for thread-safe operations

4. **Reactor for SSE**: Using Spring WebFlux's `Flux` for efficient SSE streaming with backpressure handling

5. **200ms Snapshot Interval**: Balances replay smoothness with memory usage

6. **Throttled State Updates**: 100ms interval prevents flooding the client while maintaining responsiveness

