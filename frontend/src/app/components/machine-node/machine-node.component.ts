import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MachineState } from '../../models/simulation.models';

@Component({
    selector: 'app-machine-node',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div 
      class="machine-node"
      [class.selected]="selected"
      [class.processing]="machine.processing"
      [class.flashing]="machine.flashing"
      [class.connection-mode]="connectionModeActive"
      [style.left.px]="machine.x"
      [style.top.px]="machine.y"
      [style.--machine-color]="machine.currentColor"
      (mousedown)="onMouseDown($event)"
      (click)="onClick($event)"
      (dblclick)="onDoubleClick($event)"
    >
      <div class="machine-glow" [style.background]="machine.currentColor"></div>
      
      <div class="machine-body" [style.border-color]="machine.processing ? machine.currentColor : ''">
        <div class="machine-header">
          <span class="machine-icon">⚙️</span>
          <span class="machine-name">{{ machine.name }}</span>
        </div>
        
        <div class="machine-status">
          <div class="status-indicator" [class.active]="machine.processing">
            <div class="status-dot" [style.background-color]="machine.processing ? machine.currentColor : '#6b7280'"></div>
            <span class="status-text">{{ machine.processing ? 'Processing' : 'Ready' }}</span>
          </div>
        </div>
        
        <div class="machine-stats">
          <span class="stat-label">Processed:</span>
          <span class="stat-value">{{ machine.productsProcessed }}</span>
        </div>
        
        <!-- Gear animation -->
        <div class="gear-container" [class.spinning]="machine.processing">
          <div class="gear" [style.color]="machine.currentColor">⚙</div>
        </div>
      </div>
      
      <!-- Connection points -->
      <div class="connection-point input" (click)="onConnectionPointClick($event, 'input')"></div>
      <div class="connection-point output" (click)="onConnectionPointClick($event, 'output')"></div>
    </div>
  `,
    styles: [`
    .machine-node {
      position: absolute;
      min-width: 140px;
      cursor: move;
      user-select: none;
      z-index: 10;
    }
    
    .machine-glow {
      position: absolute;
      inset: -10px;
      border-radius: 20px;
      filter: blur(20px);
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: -1;
    }
    
    .machine-node.processing .machine-glow {
      opacity: 0.4;
    }
    
    .machine-node.flashing .machine-glow {
      opacity: 0.8;
      animation: flashGlow 0.3s ease-in-out;
    }
    
    @keyframes flashGlow {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 1; }
    }
    
    .machine-body {
      background: linear-gradient(145deg, #1e293b, #0f172a);
      border: 2px solid #475569;
      border-radius: 16px;
      padding: 14px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    
    .machine-node:hover .machine-body {
      transform: scale(1.02);
      box-shadow: 0 6px 25px rgba(0, 0, 0, 0.5);
    }
    
    .machine-node.selected .machine-body {
      border-color: #a855f7;
      box-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
    }
    
    .machine-node.processing .machine-body {
      border-width: 3px;
    }
    
    .machine-node.flashing .machine-body {
      animation: flashBorder 0.3s ease-in-out;
    }
    
    @keyframes flashBorder {
      0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.3); }
      50% { box-shadow: 0 0 40px var(--machine-color, #a855f7); }
    }
    
    .machine-node.connection-mode {
      cursor: crosshair;
    }
    
    .machine-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }
    
    .machine-icon {
      font-size: 20px;
    }
    
    .machine-name {
      color: #e2e8f0;
      font-weight: 600;
      font-size: 14px;
    }
    
    .machine-status {
      margin-bottom: 8px;
    }
    
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      transition: background-color 0.3s ease;
    }
    
    .status-indicator.active .status-dot {
      animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.7; }
    }
    
    .status-text {
      color: #94a3b8;
      font-size: 12px;
    }
    
    .machine-stats {
      display: flex;
      justify-content: space-between;
      padding: 6px 8px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 6px;
    }
    
    .stat-label {
      color: #64748b;
      font-size: 11px;
    }
    
    .stat-value {
      color: #22c55e;
      font-size: 12px;
      font-weight: bold;
    }
    
    .gear-container {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 24px;
      opacity: 0.3;
    }
    
    .gear-container.spinning .gear {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .connection-point {
      position: absolute;
      width: 16px;
      height: 16px;
      background: #a855f7;
      border: 2px solid #1e293b;
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.2s ease, background 0.2s ease;
      z-index: 20;
    }
    
    .connection-point:hover {
      transform: scale(1.3);
      background: #9333ea;
    }
    
    .connection-point.input {
      left: -8px;
      top: 50%;
      transform: translateY(-50%);
    }
    
    .connection-point.input:hover {
      transform: translateY(-50%) scale(1.3);
    }
    
    .connection-point.output {
      right: -8px;
      top: 50%;
      transform: translateY(-50%);
    }
    
    .connection-point.output:hover {
      transform: translateY(-50%) scale(1.3);
    }
  `]
})
export class MachineNodeComponent {
    @Input() machine!: MachineState;
    @Input() selected = false;
    @Input() connectionModeActive = false;

    @Output() dragStart = new EventEmitter<{ event: MouseEvent, machine: MachineState }>();
    @Output() nodeClick = new EventEmitter<MachineState>();
    @Output() nodeDoubleClick = new EventEmitter<MachineState>();
    @Output() connectionPointClicked = new EventEmitter<{ machine: MachineState, type: 'input' | 'output' }>();

    onMouseDown(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('connection-point')) {
            return;
        }
        event.stopPropagation();
        this.dragStart.emit({ event, machine: this.machine });
    }

    onClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('connection-point')) {
            return;
        }
        event.stopPropagation();
        this.nodeClick.emit(this.machine);
    }

    onDoubleClick(event: MouseEvent): void {
        event.stopPropagation();
        this.nodeDoubleClick.emit(this.machine);
    }

    onConnectionPointClick(event: MouseEvent, type: 'input' | 'output'): void {
        event.stopPropagation();
        this.connectionPointClicked.emit({ machine: this.machine, type });
    }
}
