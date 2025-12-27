# Producer/Consumer Simulation - Complete Documentation

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Backend Architecture (Spring Boot)](#2-backend-architecture-spring-boot)
3. [Frontend Architecture (Angular)](#3-frontend-architecture-angular)
4. [Design Patterns Implementation](#4-design-patterns-implementation)
5. [API Reference](#5-api-reference)
6. [Data Flow](#6-data-flow)

---

## 1. Project Overview

### 1.1 Purpose
This application simulates an **assembly line production system** where:
- **Products** enter through an **Input Queue**
- **Machines** pull products from queues and process them
- After processing, products go to **Output Queues**
- The user can build custom configurations with multiple queues and machines

### 1.2 Technologies Used

| Layer | Technology | Version |
|-------|------------|---------|
| Backend | Spring Boot | 3.2.0 |
| Backend | Java | 17+ |
| Backend | WebFlux (SSE) | Built-in |
| Frontend | Angular | 19 |
| Frontend | TypeScript | 5.6 |
| Build | Maven | 3.9.6 |
| Build | npm | 9+ |

### 1.3 Project Structure

```
producer-consumer-simulation/
├── backend/                     # Spring Boot Application
│   ├── pom.xml                  # Maven dependencies
│   └── src/main/java/com/simulation/
│       ├── SimulationApplication.java   # Main entry point
│       ├── config/
│       │   └── WebConfig.java           # CORS configuration
│       ├── controller/
│       │   └── SimulationController.java # REST API endpoints
│       ├── dto/
│       │   ├── CreateQueueRequest.java
│       │   ├── CreateMachineRequest.java
│       │   ├── ConnectionRequest.java
│       │   └── SimulationState.java     # State DTO for SSE
│       ├── model/
│       │   ├── Product.java             # Product entity
│       │   ├── ProductQueue.java        # Queue (Observer Subject)
│       │   └── Machine.java             # Machine (Observer)
│       ├── pattern/
│       │   ├── observer/
│       │   │   ├── QueueObserver.java   # Observer interface
│       │   │   └── QueueSubject.java    # Subject interface
│       │   └── snapshot/
│       │       ├── SimulationSnapshot.java  # Memento
│       │       └── SnapshotManager.java     # Caretaker
│       └── service/
│           └── SimulationService.java   # Core business logic
│
└── frontend/                    # Angular Application
    ├── package.json
    └── src/
        ├── index.html
        ├── main.ts
        ├── styles.css
        └── app/
            ├── app.ts                   # Root component
            ├── app.config.ts            # App configuration
            ├── components/
            │   ├── simulation-board/    # Main board component
            │   ├── control-panel/       # Control buttons
            │   ├── queue-node/          # Queue visualization
            │   └── machine-node/        # Machine visualization
            ├── models/
            │   └── simulation.models.ts # TypeScript interfaces
            └── services/
                └── simulation.service.ts # API & SSE service
```

---

## 2. Backend Architecture (Spring Boot)

### 2.1 Main Application (`SimulationApplication.java`)

```java
@SpringBootApplication
public class SimulationApplication {
    public static void main(String[] args) {
        SpringApplication.run(SimulationApplication.class, args);
    }
}
```

**Purpose**: Entry point for the Spring Boot application. Runs on port 8080.

---

### 2.2 Models

#### 2.2.1 Product (`model/Product.java`)

**Purpose**: Represents a product flowing through the simulation.

**Key Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique identifier (UUID) |
| `color` | String | Random hex color (persists throughout lifecycle) |
| `createdAt` | long | Creation timestamp |
| `currentLocation` | String | Current queue/machine ID |

**Key Methods**:
- `Product()` - Constructor that generates random unique color
- `generateRandomColor()` - Creates visually distinct color using HSL

**Design Decision**: Colors are generated using HSL color space to ensure vibrant, visually distinct colors. The formula uses golden ratio for hue distribution.

---

#### 2.2.2 ProductQueue (`model/ProductQueue.java`)

**Purpose**: Represents a queue that holds products. Implements the **Observer Pattern** as a Subject.

**Key Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique identifier (Q0, Q1, etc.) |
| `name` | String | Display name |
| `products` | ConcurrentLinkedQueue | Thread-safe product storage |
| `observers` | List\<QueueObserver\> | Registered machines (observers) |
| `readyMachines` | Queue\<QueueObserver\> | Machines waiting for products |
| `x, y` | double | Position on the board |

**Key Methods**:
- `addProduct(Product)` - Adds product and notifies waiting machines
- `removeProduct()` - Returns and removes first product
- `registerReadyMachine(QueueObserver)` - Machine signals it's ready for work
- `notifyObservers()` - Notifies all registered observers

**Observer Pattern Implementation**:
```java
public synchronized void addProduct(Product product) {
    products.add(product);
    
    // If a machine is waiting, notify it immediately
    if (!readyMachines.isEmpty()) {
        QueueObserver readyMachine = readyMachines.poll();
        readyMachine.onProductAvailable(this.id);
    }
}
```

---

#### 2.2.3 Machine (`model/Machine.java`)

**Purpose**: Represents a processing machine. Implements the **Observer Pattern** as an Observer and **Concurrency Pattern** with its own processing thread.

**Key Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique identifier (M0, M1, etc.) |
| `name` | String | Display name |
| `minServiceTime` | int | Minimum processing time (ms) |
| `maxServiceTime` | int | Maximum processing time (ms) |
| `processing` | AtomicBoolean | Currently processing? |
| `flashing` | AtomicBoolean | Flash effect after completion? |
| `currentProduct` | Product | Product being processed |
| `currentColor` | String | Color of current product |
| `inputQueue` | ProductQueue | Source queue |
| `outputQueue` | ProductQueue | Destination queue |
| `productsProcessed` | int | Counter for statistics |

**Key Methods**:
- `start()` - Begins listening for products
- `stop()` - Stops the machine
- `onProductAvailable(queueId)` - Called when product is available (Observer callback)
- `processProduct(Product)` - Processes on separate thread (Concurrency)
- `finishProcessing()` - Completes processing, triggers flash effect

**Concurrency Pattern Implementation**:
```java
private void processProduct(Product product) {
    // Each product is processed on its own thread
    processingThread = new Thread(() -> {
        try {
            // Random service time within configured range
            int serviceTime = minServiceTime + 
                random.nextInt(maxServiceTime - minServiceTime + 1);
            
            Thread.sleep(serviceTime);
            
            if (running.get()) {
                finishProcessing(serviceTime);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }, "Machine-" + id + "-Processor");
    
    processingThread.start();
}
```

---

### 2.3 Design Pattern Interfaces

#### 2.3.1 QueueObserver (`pattern/observer/QueueObserver.java`)

```java
public interface QueueObserver {
    void onProductAvailable(String queueId);
    String getObserverId();
    boolean isReady();
}
```

**Purpose**: Interface for machines to receive product availability notifications.

#### 2.3.2 QueueSubject (`pattern/observer/QueueSubject.java`)

```java
public interface QueueSubject {
    void registerObserver(QueueObserver observer);
    void removeObserver(QueueObserver observer);
    void notifyObservers();
    void registerReadyMachine(QueueObserver observer);
}
```

**Purpose**: Interface for queues to manage observer subscriptions.

---

### 2.4 Snapshot Pattern Classes

#### 2.4.1 SimulationSnapshot (`pattern/snapshot/SimulationSnapshot.java`)

**Purpose**: Stores complete simulation state at a point in time (Memento pattern).

**Contents**:
- `timestamp` - When snapshot was taken
- `queueSnapshots` - Map of queue states (ID → products, position)
- `machineSnapshots` - Map of machine states (ID → status, color, position)
- `connections` - List of connections

#### 2.4.2 SnapshotManager (`pattern/snapshot/SnapshotManager.java`)

**Purpose**: Manages snapshot history for replay functionality (Caretaker).

**Key Methods**:
- `saveSnapshot(snapshot)` - Adds to history
- `startReplay()` - Resets replay index to 0
- `getNextReplaySnapshot()` - Returns next snapshot for playback
- `getSnapshotCount()` - Total snapshots recorded

---

### 2.5 Service Layer (`service/SimulationService.java`)

**Purpose**: Core business logic. Manages all simulation operations.

**Key Responsibilities**:

| Responsibility | Methods |
|---------------|---------|
| Component Management | `createQueue()`, `createMachine()`, `deleteQueue()`, `deleteMachine()` |
| Connection Management | `createConnection()`, `deleteConnection()` |
| Position Updates | `updateQueuePosition()`, `updateMachinePosition()` |
| Simulation Control | `startSimulation()`, `stopSimulation()`, `clearBoard()` |
| Replay | `startReplay()`, `stopReplay()`, `replayNextFrame()` |
| State Broadcasting | `broadcastState()`, `getCurrentState()` |
| Example Loading | `loadExample()` - Creates demo configuration |

**Thread Management (Concurrency Pattern)**:
```java
// Product generator - runs on its own thread
private ExecutorService productGeneratorExecutor;

// Snapshot scheduler - takes snapshots every 200ms
private ScheduledExecutorService snapshotExecutor;

// State broadcaster - sends updates every 100ms  
private ScheduledExecutorService stateUpdateExecutor;
```

**Product Generation**:
```java
private void generateProducts() {
    Random random = new Random();
    
    while (running.get()) {
        // Random delay between minInputRate and maxInputRate
        int delay = minInputRate + random.nextInt(maxInputRate - minInputRate + 1);
        Thread.sleep(delay);
        
        // Add product to input queue
        ProductQueue inputQueue = queues.get(inputQueueId);
        if (inputQueue != null) {
            Product product = new Product();
            inputQueue.addProduct(product);
        }
    }
}
```

---

### 2.6 Controller (`controller/SimulationController.java`)

**Purpose**: REST API endpoints for frontend communication.

**Key Endpoints**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/simulation/queues` | Create queue |
| DELETE | `/api/simulation/queues/{id}` | Delete queue |
| PUT | `/api/simulation/queues/{id}/position` | Update position |
| PUT | `/api/simulation/queues/{id}/input` | Set as input queue |
| POST | `/api/simulation/machines` | Create machine |
| DELETE | `/api/simulation/machines/{id}` | Delete machine |
| PUT | `/api/simulation/machines/{id}/position` | Update position |
| POST | `/api/simulation/connections` | Create connection |
| DELETE | `/api/simulation/connections` | Delete connection |
| POST | `/api/simulation/start` | Start simulation |
| POST | `/api/simulation/stop` | Stop simulation |
| POST | `/api/simulation/clear` | Clear board |
| POST | `/api/simulation/replay/start` | Start replay |
| POST | `/api/simulation/replay/stop` | Stop replay |
| PUT | `/api/simulation/config/input-rate` | Set input rate |
| POST | `/api/simulation/load-example` | Load demo config |
| GET | `/api/simulation/state` | Get current state |
| GET | `/api/simulation/stream` | **SSE stream** |

**Server-Sent Events (SSE)**:
```java
@GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<SimulationState> streamState() {
    Flux<SimulationState> initialState = Flux.just(simulationService.getCurrentState());
    Flux<SimulationState> updates = stateSink.asFlux();
    
    return Flux.concat(initialState, updates)
            .onBackpressureLatest()
            .delayElements(Duration.ofMillis(50));
}
```

---

### 2.7 DTOs (Data Transfer Objects)

#### SimulationState
The main DTO sent to frontend via SSE:
```java
public class SimulationState {
    List<QueueState> queues;
    List<MachineState> machines;
    List<ConnectionState> connections;
    boolean running;
    boolean replayMode;
    int replayIndex;
    int totalSnapshots;
    long timestamp;
    String inputQueueId;  // Which queue receives new products
}
```

---

### 2.8 Configuration

#### WebConfig (`config/WebConfig.java`)
```java
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("http://localhost:4200")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowCredentials(true);
    }
}
```

#### application.properties
```properties
server.port=8080
spring.application.name=producer-consumer-simulation
simulation.input.rate.min=500
simulation.input.rate.max=2000
```

---

## 3. Frontend Architecture (Angular)

### 3.1 Models (`models/simulation.models.ts`)

TypeScript interfaces matching backend DTOs:

```typescript
export interface Product {
  id: string;
  color: string;
}

export interface QueueState {
  id: string;
  name: string;
  x: number;
  y: number;
  size: number;
  products: Product[];
}

export interface MachineState {
  id: string;
  name: string;
  x: number;
  y: number;
  processing: boolean;
  currentColor: string;
  flashing: boolean;
  inputQueueId: string | null;
  outputQueueId: string | null;
  currentProductId: string | null;
  productsProcessed: number;
}

export interface SimulationState {
  queues: QueueState[];
  machines: MachineState[];
  connections: ConnectionState[];
  running: boolean;
  replayMode: boolean;
  replayIndex: number;
  totalSnapshots: number;
  timestamp: number;
  inputQueueId: string | null;
}
```

---

### 3.2 Services (`services/simulation.service.ts`)

**Purpose**: Handles all HTTP communication and SSE streaming.

**Key Features**:

1. **SSE Connection**:
```typescript
private connectToStream(): void {
    this.eventSource = new EventSource(`${this.API_URL}/stream`);
    
    this.eventSource.onmessage = (event) => {
        this.ngZone.run(() => {
            const state: SimulationState = JSON.parse(event.data);
            this.stateSubject.next(state);
        });
    };
    
    // Auto-reconnect on error with exponential backoff
    this.eventSource.onerror = () => {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => this.connectToStream(), 2000 * this.reconnectAttempts);
        }
    };
}
```

2. **API Methods**:
- `createQueue(request)` / `deleteQueue(id)`
- `createMachine(request)` / `deleteMachine(id)`
- `createConnection(request)` / `deleteConnection(request)`
- `startSimulation()` / `stopSimulation()` / `clearBoard()`
- `startReplay()` / `stopReplay()`
- `setInputRate(min, max)`
- `loadExample()` - Loads demo configuration

---

### 3.3 Components

#### 3.3.1 SimulationBoardComponent (`components/simulation-board/`)

**Purpose**: Main canvas that displays and manages all nodes and connections.

**Features**:
- SVG layer for drawing connection lines
- Drag-and-drop node positioning
- Connection mode for linking nodes
- Keyboard shortcuts (Delete, Escape)
- Node selection

**Key Methods**:
| Method | Description |
|--------|-------------|
| `addQueue()` | Creates new queue at calculated position |
| `addMachine()` | Creates new machine at calculated position |
| `toggleConnectionMode()` | Enables/disables connection drawing |
| `handleConnectionPoint()` | Manages connection creation |
| `getConnectionPath()` | Generates SVG bezier curve for connections |
| `loadExample()` | Loads demo configuration |

**Connection Drawing**:
```typescript
getConnectionPath(conn: ConnectionState): string {
    // Calculate bezier curve from source to target
    const fromX = fromNode.x + 140;  // Right edge of source
    const fromY = fromNode.y + 50;   // Center
    const toX = toNode.x;            // Left edge of target
    const toY = toNode.y + 50;       // Center
    
    const controlOffset = Math.min(Math.abs(toX - fromX) / 2, 100);
    
    return `M ${fromX} ${fromY} 
            C ${fromX + controlOffset} ${fromY}, 
              ${toX - controlOffset} ${toY}, 
              ${toX} ${toY}`;
}
```

---

#### 3.3.2 QueueNodeComponent (`components/queue-node/`)

**Purpose**: Visual representation of a queue.

**Features**:
- Displays queue name and size badge
- Shows product colors as circles
- Connection points (input/output)
- INPUT label for input queue (green border)
- Draggable (when not running)

**Visual Indicators**:
- **Size Badge**: Green circle showing product count
- **Product Colors**: Row of colored circles (max 6 shown)
- **Input Queue**: Green border + "INPUT" label
- **Selected State**: Blue glow effect

---

#### 3.3.3 MachineNodeComponent (`components/machine-node/`)

**Purpose**: Visual representation of a machine.

**Features**:
- Processing animation (red pulsing glow)
- Flashing effect on completion (green flash)
- Color changes to match current product
- Processing status indicator
- Products processed counter

**Animations**:
```css
/* Processing animation */
@keyframes processing {
    0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.4); }
    50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.8); }
}

/* Flash on completion */
@keyframes flash {
    0% { filter: brightness(1); }
    50% { filter: brightness(2); }
    100% { filter: brightness(1); }
}
```

---

#### 3.3.4 ControlPanelComponent (`components/control-panel/`)

**Purpose**: Sidebar with all simulation controls.

**Sections**:
1. **Quick Start**: Load Example button
2. **Add Components**: Add Queue / Add Machine buttons
3. **Connection Mode**: Toggle for connecting nodes
4. **Simulation**: Start / Stop / Clear buttons
5. **Replay**: Replay / Stop Replay with progress bar
6. **Settings**: Input rate configuration (min-max ms)
7. **Status**: Live counters and simulation state
8. **Instructions**: User guide

---

### 3.4 Styling

**Design System**:
- Dark theme (backgrounds: #0a0f1a, #0f172a, #1e293b)
- Gradient buttons with hover effects
- Grid background pattern
- Smooth animations and transitions
- Modern glassmorphism elements

**Color Palette**:
| Purpose | Color |
|---------|-------|
| Primary | #3b82f6 (Blue) |
| Secondary | #a855f7 (Purple) |
| Success | #22c55e (Green) |
| Danger | #ef4444 (Red) |
| Warning | #f59e0b (Amber) |
| Neutral | #64748b (Slate) |

---

## 4. Design Patterns Implementation

### 4.1 Observer Pattern

**Problem Solved**: Machines need to know when products are available in their input queue.

**Implementation**:
```
ProductQueue (Subject) ─────observes─────> Machine (Observer)
     │                                         │
     ├─ registerObserver()                     ├─ onProductAvailable()
     ├─ removeObserver()                       ├─ getObserverId()
     ├─ registerReadyMachine()                 └─ isReady()
     └─ notifyObservers()
```

**Flow**:
1. Machine finishes processing → calls `registerReadyMachine(this)` on input queue
2. Product arrives in queue → queue checks for ready machines
3. If machine waiting → queue calls `onProductAvailable(queueId)`
4. Machine pulls product and starts processing

---

### 4.2 Concurrency Pattern

**Problem Solved**: Each machine must process independently without blocking.

**Implementation**:
1. **SimulationService** uses ExecutorService for:
   - Product generation thread
   - Snapshot taking (ScheduledExecutorService)
   - State broadcasting (ScheduledExecutorService)

2. **Machine** creates new Thread for each product:
   - Processing happens without blocking main thread
   - Random sleep time simulates variable processing

**Thread Safety**:
- `ConcurrentHashMap` for queues/machines storage
- `CopyOnWriteArrayList` for connections
- `AtomicBoolean` for running/processing flags
- `synchronized` blocks for critical sections

---

### 4.3 Snapshot (Memento) Pattern

**Problem Solved**: Need to record simulation state for replay.

**Implementation**:
```
SimulationService (Originator) 
     │
     ├─ takeSnapshot() ──creates──> SimulationSnapshot (Memento)
     │                                    │
     │                                    └─ timestamp, queues, machines, connections
     │
     └─ uses ──────────────────────> SnapshotManager (Caretaker)
                                          │
                                          ├─ history: List<SimulationSnapshot>
                                          ├─ saveSnapshot()
                                          ├─ getNextReplaySnapshot()
                                          └─ getSnapshotCount()
```

**Replay Flow**:
1. During simulation: `takeSnapshot()` called every 200ms
2. Snapshot stored in SnapshotManager history
3. On replay: `getNextReplaySnapshot()` returns snapshots in order
4. State broadcast to frontend for visualization

---

## 5. API Reference

### 5.1 Queue Endpoints

#### Create Queue
```http
POST /api/simulation/queues
Content-Type: application/json

{
    "name": "Queue 1",
    "x": 100,
    "y": 200
}
```

#### Delete Queue
```http
DELETE /api/simulation/queues/Q0
```

#### Set as Input Queue
```http
PUT /api/simulation/queues/Q0/input
```

---

### 5.2 Machine Endpoints

#### Create Machine
```http
POST /api/simulation/machines
Content-Type: application/json

{
    "name": "Machine A",
    "x": 300,
    "y": 200,
    "minServiceTime": 1000,
    "maxServiceTime": 3000
}
```

---

### 5.3 Connection Endpoints

#### Create Connection
```http
POST /api/simulation/connections
Content-Type: application/json

{
    "fromId": "Q0",
    "toId": "M0",
    "type": "queue-to-machine"
}
```

Types: `queue-to-machine` | `machine-to-queue`

---

### 5.4 Simulation Control

```http
POST /api/simulation/start
POST /api/simulation/stop
POST /api/simulation/clear
POST /api/simulation/load-example
```

---

### 5.5 SSE Stream

```http
GET /api/simulation/stream
Accept: text/event-stream
```

Returns continuous stream of `SimulationState` JSON objects.

---

## 6. Data Flow

### 6.1 Product Lifecycle

```
1. ProductGenerator (Thread)
   │
   └─> Creates Product with random color
       │
       └─> InputQueue.addProduct(product)
           │
           └─> Queue notifies waiting Machine
               │
               └─> Machine.onProductAvailable()
                   │
                   └─> Machine pulls product, starts processing (new Thread)
                       │
                       └─> Thread.sleep(randomServiceTime)
                           │
                           └─> Machine.finishProcessing()
                               │
                               ├─> Flash effect triggered
                               ├─> Product added to OutputQueue
                               └─> Machine registers as ready for next product
```

### 6.2 State Update Flow

```
SimulationService
   │
   ├─> takeSnapshot() [every 200ms] ─> SnapshotManager.saveSnapshot()
   │
   └─> broadcastState() [every 100ms]
       │
       └─> getCurrentState()
           │
           └─> SimulationController.stateSink.tryEmitNext(state)
               │
               └─> SSE Stream ─> Frontend
                   │
                   └─> SimulationService.state$.next(state)
                       │
                       └─> Components update via subscription
```

---

## Summary

This project demonstrates a complete full-stack simulation application with:

1. **Backend** (Spring Boot):
   - RESTful API with 15+ endpoints
   - Server-Sent Events for real-time updates
   - Three design patterns: Observer, Concurrency, Memento
   - Thread-safe concurrent data structures
   - Clean separation of concerns (Controller → Service → Model)

2. **Frontend** (Angular):
   - Modern standalone components
   - RxJS for reactive state management
   - SVG-based connection visualization
   - Responsive dark-themed UI
   - Real-time SSE consumption with auto-reconnect

3. **Design Patterns**:
   - **Observer**: Queue-Machine notification system
   - **Concurrency**: Multi-threaded product processing
   - **Snapshot/Memento**: Simulation state recording and replay

---

*Documentation generated for CSE 223 Programming 2 Assignment*
*Alexandria University - Faculty of Engineering*
