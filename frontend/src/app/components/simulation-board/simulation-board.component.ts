import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SimulationService } from '../../services/simulation.service';
import {
    SimulationState,
    QueueState,
    MachineState,
    ConnectionState,
    DragState,
    ConnectionMode,
    NodeType
} from '../../models/simulation.models';
import { QueueNodeComponent } from '../queue-node/queue-node.component';
import { MachineNodeComponent } from '../machine-node/machine-node.component';
import { ControlPanelComponent } from '../control-panel/control-panel.component';
import { MachineEditorComponent } from '../machine-editor/machine-editor.component';

@Component({
    selector: 'app-simulation-board',
    standalone: true,
    imports: [CommonModule, QueueNodeComponent, MachineNodeComponent, ControlPanelComponent, MachineEditorComponent],
    template: `
    <div class="simulation-container">
      <app-control-panel
        [isRunning]="state?.running || false"
        [isReplaying]="state?.replayMode || false"
        [hasSnapshots]="(state?.totalSnapshots || 0) > 0"
        [replayIndex]="state?.replayIndex || 0"
        [totalSnapshots]="state?.totalSnapshots || 0"
        [queueCount]="state?.queues?.length || 0"
        [machineCount]="state?.machines?.length || 0"
        [connectionCount]="state?.connections?.length || 0"
        [connectionMode]="connectionMode.active"
        [canStart]="canStartSimulation()"
        (addQueue)="addQueue()"
        (addMachine)="addMachine()"
        (toggleConnectionMode)="toggleConnectionMode()"
        (start)="startSimulation()"
        (stop)="stopSimulation()"
        (reset)="resetSimulation()"
        (clear)="clearBoard()"
        (startReplay)="startReplay()"
        (stopReplay)="stopReplay()"
        (updateInputRate)="updateInputRate($event)"
        (loadExample)="loadExample()"
        (saveConfig)="saveConfiguration()"
        (loadConfig)="loadConfiguration($event)"
      ></app-control-panel>
      
      <div 
        class="board"
        #board
        (mousedown)="onBoardMouseDown($event)"
        (mousemove)="onBoardMouseMove($event)"
        (mouseup)="onBoardMouseUp($event)"
        (mouseleave)="onBoardMouseUp($event)"
      >
        <!-- Grid background -->
        <div class="grid-background"></div>
        
        <!-- SVG for connections -->
        <svg class="connections-layer" [attr.width]="boardWidth" [attr.height]="boardHeight">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
            </marker>
            <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
            </marker>
          </defs>
          
          <!-- Existing connections -->
          <g *ngFor="let conn of state?.connections">
            <path 
              [attr.d]="getConnectionPath(conn)"
              [class.active]="isConnectionActive(conn)"
              class="connection-line"
              [attr.marker-end]="isConnectionActive(conn) ? 'url(#arrowhead-active)' : 'url(#arrowhead)'"
            />
          </g>
          
          <!-- Temporary connection line -->
          <line 
            *ngIf="connectionMode.active && connectionMode.fromId && tempConnectionEnd"
            [attr.x1]="getTempConnectionStart().x"
            [attr.y1]="getTempConnectionStart().y"
            [attr.x2]="tempConnectionEnd.x"
            [attr.y2]="tempConnectionEnd.y"
            class="temp-connection-line"
          />
        </svg>
        
        <!-- Queues -->
        <app-queue-node
          *ngFor="let queue of state?.queues"
          [queue]="queue"
          [selected]="selectedNodeId === queue.id"
          [isInputQueue]="isInputQueue(queue.id)"
          [connectionModeActive]="connectionMode.active"
          (dragStart)="onQueueDragStart($event)"
          (nodeClick)="onQueueClick($event)"
          (nodeDoubleClick)="onQueueDoubleClick($event)"
          (connectionPointClicked)="onQueueConnectionPoint($event)"
        ></app-queue-node>
        
        <!-- Machines -->
        <app-machine-node
          *ngFor="let machine of state?.machines"
          [machine]="machine"
          [selected]="selectedNodeId === machine.id"
          [connectionModeActive]="connectionMode.active"
          (dragStart)="onMachineDragStart($event)"
          (nodeClick)="onMachineClick($event)"
          (nodeDoubleClick)="onMachineDoubleClick($event)"
          (connectionPointClicked)="onMachineConnectionPoint($event)"
        ></app-machine-node>
        
        <!-- Empty state message -->
        <div class="empty-state" *ngIf="!state?.queues?.length && !state?.machines?.length">
          <div class="empty-icon">🏭</div>
          <h3>Assembly Line Simulator</h3>
          <p>Add queues and machines to build your production line</p>
          <p class="hint">Use the control panel on the left to get started</p>
        </div>
      </div>
      
      <!-- Machine Editor Modal -->
      <app-machine-editor
        *ngIf="editingMachine"
        [machine]="editingMachine"
        (save)="onMachineEditorSave($event)"
        (cancel)="onMachineEditorCancel()"
      ></app-machine-editor>
    </div>
  `,
    styles: [`
    .simulation-container {
      display: flex;
      height: 100vh;
      background: #0a0f1a;
      font-family: 'Inter', 'Segoe UI', sans-serif;
    }
    
    .board {
      flex: 1;
      position: relative;
      overflow: hidden;
      background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
    }
    
    .grid-background {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px);
      background-size: 40px 40px;
      pointer-events: none;
    }
    
    .connections-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 5;
    }
    
    .connection-line {
      fill: none;
      stroke: #475569;
      stroke-width: 2;
      transition: stroke 0.3s ease, stroke-width 0.3s ease;
    }
    
    .connection-line.active {
      stroke: #22c55e;
      stroke-width: 3;
      filter: drop-shadow(0 0 6px rgba(34, 197, 94, 0.5));
    }
    
    .temp-connection-line {
      stroke: #f59e0b;
      stroke-width: 2;
      stroke-dasharray: 8 4;
      animation: dash 0.5s linear infinite;
    }
    
    @keyframes dash {
      to {
        stroke-dashoffset: -12;
      }
    }
    
    .empty-state {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #64748b;
    }
    
    .empty-icon {
      font-size: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }
    
    .empty-state h3 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #94a3b8;
    }
    
    .empty-state p {
      margin: 0 0 8px 0;
      font-size: 14px;
    }
    
    .empty-state .hint {
      font-size: 12px;
      font-style: italic;
    }
  `]
})
export class SimulationBoardComponent implements OnInit, OnDestroy {
    @ViewChild('board', { static: true }) boardRef!: ElementRef<HTMLDivElement>;

    state: SimulationState | null = null;

    // Drag state
    dragState: DragState = {
        isDragging: false,
        nodeId: null,
        nodeType: null,
        offsetX: 0,
        offsetY: 0
    };

    // Connection mode
    connectionMode: ConnectionMode = {
        active: false,
        fromId: null,
        fromType: null
    };

    // Temp connection end point for drawing
    tempConnectionEnd: { x: number, y: number } | null = null;

    // Selected node
    selectedNodeId: string | null = null;
    
    // Machine being edited
    editingMachine: MachineState | null = null;

    // Input queue tracking
    private inputQueueId: string | null = null;

    // Board dimensions
    boardWidth = 2000;
    boardHeight = 2000;

    // Queue counter for positioning
    private queueCounter = 0;
    private machineCounter = 0;

    private stateSubscription?: Subscription;

    constructor(private simulationService: SimulationService) { }

    ngOnInit(): void {
        this.stateSubscription = this.simulationService.state$.subscribe(state => {
            if (state) {
                this.state = state;

                // Track input queue (first queue)
                if (state.queues.length > 0 && !this.inputQueueId) {
                    this.inputQueueId = state.queues[0].id;
                }
            }
        });
    }

    ngOnDestroy(): void {
        this.stateSubscription?.unsubscribe();
        this.simulationService.disconnect();
    }

    // ==================== Keyboard Events ====================

    @HostListener('window:keydown', ['$event'])
    onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Delete' && this.selectedNodeId) {
            this.deleteSelectedNode();
        } else if (event.key === 'Escape') {
            this.cancelConnectionMode();
            this.selectedNodeId = null;
        }
    }

    // ==================== Board Events ====================

    onBoardMouseDown(event: MouseEvent): void {
        if (this.connectionMode.active) {
            // Cancel connection mode if clicking on empty board
            this.cancelConnectionMode();
        }
        this.selectedNodeId = null;
    }

    onBoardMouseMove(event: MouseEvent): void {
        if (this.dragState.isDragging && this.dragState.nodeId) {
            const rect = this.boardRef.nativeElement.getBoundingClientRect();
            const x = event.clientX - rect.left - this.dragState.offsetX;
            const y = event.clientY - rect.top - this.dragState.offsetY;

            if (this.dragState.nodeType === 'queue') {
                this.simulationService.updateQueuePosition(this.dragState.nodeId, x, y).subscribe();
            } else if (this.dragState.nodeType === 'machine') {
                this.simulationService.updateMachinePosition(this.dragState.nodeId, x, y).subscribe();
            }
        }

        // Update temp connection end point
        if (this.connectionMode.active && this.connectionMode.fromId) {
            const rect = this.boardRef.nativeElement.getBoundingClientRect();
            this.tempConnectionEnd = {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
        }
    }

    onBoardMouseUp(event: MouseEvent): void {
        this.dragState = {
            isDragging: false,
            nodeId: null,
            nodeType: null,
            offsetX: 0,
            offsetY: 0
        };
    }

    // ==================== Queue Events ====================

    onQueueDragStart(event: { event: MouseEvent, queue: QueueState }): void {
        if (this.state?.running) return;

        this.dragState = {
            isDragging: true,
            nodeId: event.queue.id,
            nodeType: 'queue',
            offsetX: event.event.offsetX,
            offsetY: event.event.offsetY
        };
    }

    onQueueClick(queue: QueueState): void {
        if (this.connectionMode.active) {
            // In connection mode, clicking a node completes or starts a connection
            this.handleConnectionPoint(queue.id, 'queue', 'output');
        } else {
            this.selectedNodeId = queue.id;
        }
    }

    onQueueDoubleClick(queue: QueueState): void {
        // Set as input queue
        this.inputQueueId = queue.id;
        this.simulationService.setInputQueue(queue.id).subscribe();
    }

    onQueueConnectionPoint(event: { queue: QueueState, type: 'input' | 'output' }): void {
        this.handleConnectionPoint(event.queue.id, 'queue', event.type);
    }

    // ==================== Machine Events ====================

    onMachineDragStart(event: { event: MouseEvent, machine: MachineState }): void {
        if (this.state?.running) return;

        this.dragState = {
            isDragging: true,
            nodeId: event.machine.id,
            nodeType: 'machine',
            offsetX: event.event.offsetX,
            offsetY: event.event.offsetY
        };
    }

    onMachineClick(machine: MachineState): void {
        if (this.connectionMode.active) {
            // In connection mode, clicking a node completes or starts a connection
            this.handleConnectionPoint(machine.id, 'machine', 'input');
        } else {
            this.selectedNodeId = machine.id;
        }
    }

    onMachineDoubleClick(machine: MachineState): void {
        if (!this.state?.running) {
            this.editingMachine = machine;
        }
    }

    onMachineEditorSave(settings: { minServiceTime: number; maxServiceTime: number; name: string }): void {
        if (this.editingMachine) {
            this.simulationService.updateMachineSettings(this.editingMachine.id, settings).subscribe();
            this.editingMachine = null;
        }
    }

    onMachineEditorCancel(): void {
        this.editingMachine = null;
    }

    onMachineConnectionPoint(event: { machine: MachineState, type: 'input' | 'output' }): void {
        this.handleConnectionPoint(event.machine.id, 'machine', event.type);
    }

    // ==================== Connection Handling ====================

    handleConnectionPoint(nodeId: string, nodeType: NodeType, pointType: 'input' | 'output'): void {
        if (!this.connectionMode.active) {
            // Start connection
            this.connectionMode = {
                active: true,
                fromId: nodeId,
                fromType: nodeType
            };
        } else {
            // Complete connection
            if (this.connectionMode.fromId && this.connectionMode.fromType) {
                this.createConnection(
                    this.connectionMode.fromId,
                    this.connectionMode.fromType,
                    nodeId,
                    nodeType
                );
            }
            this.cancelConnectionMode();
        }
    }

    createConnection(fromId: string, fromType: NodeType, toId: string, toType: NodeType): void {
        // Determine connection type
        let type: 'queue-to-machine' | 'machine-to-queue';
        let actualFromId = fromId;
        let actualToId = toId;

        if (fromType === 'queue' && toType === 'machine') {
            type = 'queue-to-machine';
        } else if (fromType === 'machine' && toType === 'queue') {
            type = 'machine-to-queue';
        } else if (fromType === 'machine' && toType === 'machine') {
            // Can't connect machine to machine directly
            return;
        } else if (fromType === 'queue' && toType === 'queue') {
            // Can't connect queue to queue directly
            return;
        } else {
            return;
        }

        this.simulationService.createConnection({
            fromId: actualFromId,
            toId: actualToId,
            type
        }).subscribe();
    }

    cancelConnectionMode(): void {
        this.connectionMode = {
            active: false,
            fromId: null,
            fromType: null
        };
        this.tempConnectionEnd = null;
    }

    toggleConnectionMode(): void {
        if (this.connectionMode.active) {
            this.cancelConnectionMode();
        } else {
            this.connectionMode.active = true;
        }
    }

    // ==================== Control Panel Actions ====================

    addQueue(): void {
        const x = 100 + (this.queueCounter % 4) * 200;
        const y = 100 + Math.floor(this.queueCounter / 4) * 150;
        this.queueCounter++;

        this.simulationService.createQueue({
            name: `Queue ${this.state?.queues?.length || 0}`,
            x,
            y
        }).subscribe();
    }

    addMachine(): void {
        const x = 200 + (this.machineCounter % 4) * 200;
        const y = 200 + Math.floor(this.machineCounter / 4) * 150;
        this.machineCounter++;

        this.simulationService.createMachine({
            name: `Machine ${this.state?.machines?.length || 0}`,
            x,
            y,
            minServiceTime: 1000,
            maxServiceTime: 3000
        }).subscribe();
    }

    deleteSelectedNode(): void {
        if (!this.selectedNodeId || this.state?.running) return;

        const isQueue = this.state?.queues.some(q => q.id === this.selectedNodeId);

        if (isQueue) {
            this.simulationService.deleteQueue(this.selectedNodeId).subscribe();
        } else {
            this.simulationService.deleteMachine(this.selectedNodeId).subscribe();
        }

        this.selectedNodeId = null;
    }

    startSimulation(): void {
        this.simulationService.startSimulation().subscribe();
    }

    stopSimulation(): void {
        this.simulationService.stopSimulation().subscribe();
    }

    resetSimulation(): void {
        this.simulationService.resetSimulation().subscribe();
    }

    clearBoard(): void {
        this.simulationService.clearBoard().subscribe();
        this.queueCounter = 0;
        this.machineCounter = 0;
        this.inputQueueId = null;
    }

    startReplay(): void {
        this.simulationService.startReplay().subscribe();
    }

    stopReplay(): void {
        this.simulationService.stopReplay().subscribe();
    }

    updateInputRate(event: { min: number, max: number }): void {
        this.simulationService.setInputRate(event.min, event.max).subscribe();
    }

    loadExample(): void {
        this.simulationService.loadExample().subscribe();
    }

    saveConfiguration(): void {
        this.simulationService.exportConfig().subscribe(config => {
            const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `simulation-config-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    loadConfiguration(config: any): void {
        this.simulationService.importConfig(config).subscribe(() => {
            this.queueCounter = 0;
            this.machineCounter = 0;
        });
    }

    // ==================== Helpers ====================

    isInputQueue(queueId: string): boolean {
        // Use inputQueueId from backend state
        if (this.state?.inputQueueId) {
            return queueId === this.state.inputQueueId;
        }
        // Fallback to first queue
        return this.state?.queues?.[0]?.id === queueId;
    }

    canStartSimulation(): boolean {
        return (this.state?.queues?.length || 0) > 0 &&
            (this.state?.machines?.length || 0) > 0 &&
            (this.state?.connections?.length || 0) > 0;
    }

    getConnectionPath(conn: ConnectionState): string {
        let fromNode: QueueState | MachineState | undefined;
        let toNode: QueueState | MachineState | undefined;

        if (conn.type === 'queue-to-machine') {
            fromNode = this.state?.queues.find(q => q.id === conn.fromId);
            toNode = this.state?.machines.find(m => m.id === conn.toId);
        } else {
            fromNode = this.state?.machines.find(m => m.id === conn.fromId);
            toNode = this.state?.queues.find(q => q.id === conn.toId);
        }

        if (!fromNode || !toNode) return '';

        // Calculate connection points (right side of from, left side of to)
        const fromX = fromNode.x + 140; // Right edge
        const fromY = fromNode.y + 50;  // Center
        const toX = toNode.x;           // Left edge
        const toY = toNode.y + 50;      // Center

        // Create a curved path
        const midX = (fromX + toX) / 2;
        const controlOffset = Math.min(Math.abs(toX - fromX) / 2, 100);

        return `M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`;
    }

    isConnectionActive(conn: ConnectionState): boolean {
        if (!this.state?.running) return false;

        // Check if there's flow through this connection
        if (conn.type === 'queue-to-machine') {
            const machine = this.state?.machines.find(m => m.id === conn.toId);
            return machine?.processing || false;
        } else {
            const queue = this.state?.queues.find(q => q.id === conn.toId);
            return (queue?.size || 0) > 0;
        }
    }

    getTempConnectionStart(): { x: number, y: number } {
        if (!this.connectionMode.fromId || !this.connectionMode.fromType) {
            return { x: 0, y: 0 };
        }

        let node: QueueState | MachineState | undefined;
        if (this.connectionMode.fromType === 'queue') {
            node = this.state?.queues.find(q => q.id === this.connectionMode.fromId);
        } else {
            node = this.state?.machines.find(m => m.id === this.connectionMode.fromId);
        }

        if (!node) return { x: 0, y: 0 };

        return {
            x: node.x + 70,
            y: node.y + 50
        };
    }
}
