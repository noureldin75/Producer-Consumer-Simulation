import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-control-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="control-panel">
      <div class="panel-header">
        <h2>🏭 Simulation Control</h2>
      </div>
      
      <div class="panel-section">
        <h3>Quick Start</h3>
        <button class="btn btn-example" (click)="onLoadExample()" [disabled]="isRunning">
          <span class="btn-icon">⚡</span>
          Load Example
        </button>
        <p class="hint">Creates a 2-stage parallel processing line</p>
      </div>
      
      <div class="panel-section">
        <h3>Add Components</h3>
        <div class="button-group">
          <button class="btn btn-primary" (click)="onAddQueue()">
            <span class="btn-icon">📦</span>
            Add Queue
          </button>
          <button class="btn btn-secondary" (click)="onAddMachine()">
            <span class="btn-icon">⚙️</span>
            Add Machine
          </button>
        </div>
      </div>
      
      <div class="panel-section">
        <h3>Connection Mode</h3>
        <button 
          class="btn btn-connect" 
          [class.active]="connectionMode"
          (click)="onToggleConnectionMode()"
        >
          <span class="btn-icon">🔗</span>
          {{ connectionMode ? 'Cancel Connection' : 'Connect Nodes' }}
        </button>
        <p class="hint" *ngIf="connectionMode">
          Click a connection point on a queue or machine, then click another to connect.
        </p>
      </div>
      
      <div class="panel-section">
        <h3>Simulation</h3>
        <div class="button-group">
          <button 
            class="btn btn-success" 
            *ngIf="!isRunning"
            [disabled]="!canStart"
            (click)="onStart()"
          >
            <span class="btn-icon">▶️</span>
            Start
          </button>
          <button 
            class="btn btn-danger" 
            *ngIf="isRunning"
            (click)="onStop()"
          >
            <span class="btn-icon">⏹️</span>
            Stop
          </button>
          <button 
            class="btn btn-reload" 
            (click)="onReset()"
            [disabled]="isRunning || !canStart"
            title="Reset simulation - restart without clearing machines"
          >
            <span class="btn-icon">🔄</span>
            Reload
          </button>
          <button 
            class="btn btn-warning" 
            (click)="onClear()"
            [disabled]="isRunning"
          >
            <span class="btn-icon">🗑️</span>
            Clear
          </button>
        </div>
      </div>
      
      <div class="panel-section">
        <h3>Replay</h3>
        <div class="button-group">
          <button 
            class="btn btn-replay" 
            *ngIf="!isReplaying"
            [disabled]="!hasSnapshots || isRunning"
            (click)="onStartReplay()"
          >
            <span class="btn-icon">🔄</span>
            Replay
          </button>
          <button 
            class="btn btn-danger" 
            *ngIf="isReplaying"
            (click)="onStopReplay()"
          >
            <span class="btn-icon">⏹️</span>
            Stop Replay
          </button>
        </div>
        <div class="replay-progress" *ngIf="isReplaying || hasSnapshots">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              [style.width.%]="totalSnapshots > 0 ? (replayIndex / totalSnapshots) * 100 : 0"
            ></div>
          </div>
          <span class="progress-text">{{ replayIndex }} / {{ totalSnapshots }} frames</span>
        </div>
      </div>
      
      <div class="panel-section">
        <h3>Settings</h3>
        <div class="setting-row">
          <label>Input Rate (ms):</label>
          <div class="input-group">
            <input 
              type="number" 
              [(ngModel)]="minInputRate" 
              min="100"
              max="10000"
              [disabled]="isRunning"
            />
            <span>-</span>
            <input 
              type="number" 
              [(ngModel)]="maxInputRate" 
              min="100"
              max="10000"
              [disabled]="isRunning"
            />
          </div>
          <button 
            class="btn btn-small" 
            (click)="onUpdateInputRate()"
            [disabled]="isRunning"
          >
            Apply
          </button>
        </div>
      </div>
      
      <div class="panel-section status-section">
        <h3>Status</h3>
        <div class="status-grid">
          <div class="status-item">
            <span class="status-label">Queues:</span>
            <span class="status-value">{{ queueCount }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Machines:</span>
            <span class="status-value">{{ machineCount }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Connections:</span>
            <span class="status-value">{{ connectionCount }}</span>
          </div>
          <div class="status-item">
            <span class="status-label">Status:</span>
            <span class="status-value" [class.running]="isRunning" [class.replaying]="isReplaying">
              {{ isReplaying ? 'Replaying' : (isRunning ? 'Running' : 'Stopped') }}
            </span>
          </div>
        </div>
      </div>
      
      <div class="panel-section">
        <h3>Save / Load</h3>
        <div class="button-group">
          <button 
            class="btn btn-save" 
            (click)="onSaveConfig()"
            [disabled]="isRunning || queueCount === 0"
          >
            <span class="btn-icon">💾</span>
            Save Config
          </button>
          <button 
            class="btn btn-load" 
            (click)="fileInput.click()"
            [disabled]="isRunning"
          >
            <span class="btn-icon">📂</span>
            Load Config
          </button>
          <input 
            type="file" 
            #fileInput 
            hidden 
            accept=".json"
            (change)="onLoadConfig($event)"
          />
        </div>
      </div>
      
      <div class="panel-section instructions">
        <h3>Instructions</h3>
        <ul>
          <li>Add queues and machines to the board</li>
          <li>Connect them using connection points</li>
          <li>First queue auto-becomes input queue</li>
          <li>Double-click a queue to set as input</li>
          <li>Double-click a machine to edit settings</li>
          <li>Products flow from input → machines → queues</li>
          <li>Press Delete to remove selected node</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .control-panel {
      width: 320px;
      height: 100%;
      background: linear-gradient(180deg, #0f172a, #1e293b);
      border-right: 1px solid #334155;
      overflow-y: auto;
      padding: 20px;
      color: #e2e8f0;
    }
    
    .panel-header {
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #334155;
    }
    
    .panel-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      background: linear-gradient(135deg, #60a5fa, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .panel-section {
      margin-bottom: 24px;
    }
    
    .panel-section h3 {
      margin: 0 0 12px 0;
      font-size: 13px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .button-group {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      flex: 1;
      justify-content: center;
    }
    
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .btn-icon {
      font-size: 16px;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #60a5fa, #3b82f6);
      transform: translateY(-1px);
    }
    
    .btn-secondary {
      background: linear-gradient(135deg, #a855f7, #7c3aed);
      color: white;
    }
    
    .btn-secondary:hover:not(:disabled) {
      background: linear-gradient(135deg, #c084fc, #a855f7);
      transform: translateY(-1px);
    }
    
    .btn-connect {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
      width: 100%;
    }
    
    .btn-connect:hover:not(:disabled) {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
    }
    
    .btn-connect.active {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      animation: pulse 1.5s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
    }
    
    .btn-success {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: white;
    }
    
    .btn-success:hover:not(:disabled) {
      background: linear-gradient(135deg, #4ade80, #22c55e);
    }
    
    .btn-danger {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
    }
    
    .btn-danger:hover:not(:disabled) {
      background: linear-gradient(135deg, #f87171, #ef4444);
    }
    
    .btn-warning {
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: white;
    }
    
    .btn-warning:hover:not(:disabled) {
      background: linear-gradient(135deg, #fb923c, #f97316);
    }
    
    .btn-reload {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }
    
    .btn-reload:hover:not(:disabled) {
      background: linear-gradient(135deg, #34d399, #10b981);
    }
    
    .btn-replay {
      background: linear-gradient(135deg, #06b6d4, #0891b2);
      color: white;
      width: 100%;
    }
    
    .btn-replay:hover:not(:disabled) {
      background: linear-gradient(135deg, #22d3ee, #06b6d4);
    }
    
    .btn-small {
      padding: 6px 12px;
      font-size: 12px;
      background: linear-gradient(135deg, #475569, #334155);
      color: #e2e8f0;
      flex: 0;
    }
    
    .btn-small:hover:not(:disabled) {
      background: linear-gradient(135deg, #64748b, #475569);
    }
    
    .btn-example {
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      color: white;
      width: 100%;
    }
    
    .btn-example:hover:not(:disabled) {
      background: linear-gradient(135deg, #a78bfa, #8b5cf6);
      transform: translateY(-1px);
    }
    
    .btn-save {
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      color: white;
    }
    
    .btn-save:hover:not(:disabled) {
      background: linear-gradient(135deg, #38bdf8, #0ea5e9);
    }
    
    .btn-load {
      background: linear-gradient(135deg, #f97316, #ea580c);
      color: white;
    }
    
    .btn-load:hover:not(:disabled) {
      background: linear-gradient(135deg, #fb923c, #f97316);
    }
    
    .hint {
      margin: 8px 0 0 0;
      font-size: 11px;
      color: #94a3b8;
      font-style: italic;
    }
    
    .replay-progress {
      margin-top: 12px;
    }
    
    .progress-bar {
      height: 8px;
      background: #334155;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #06b6d4, #22d3ee);
      transition: width 0.2s ease;
    }
    
    .progress-text {
      display: block;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 6px;
    }
    
    .setting-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .setting-row label {
      font-size: 12px;
      color: #94a3b8;
    }
    
    .input-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .input-group input {
      width: 80px;
      padding: 8px 10px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 13px;
    }
    
    .input-group input:focus {
      outline: none;
      border-color: #3b82f6;
    }
    
    .input-group span {
      color: #64748b;
    }
    
    .status-section {
      background: #0f172a;
      border-radius: 10px;
      padding: 16px;
      margin: 0 -20px;
      padding: 16px 20px;
    }
    
    .status-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    
    .status-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 10px;
      background: #1e293b;
      border-radius: 6px;
    }
    
    .status-label {
      color: #64748b;
      font-size: 12px;
    }
    
    .status-value {
      color: #e2e8f0;
      font-weight: 600;
      font-size: 12px;
    }
    
    .status-value.running {
      color: #22c55e;
    }
    
    .status-value.replaying {
      color: #06b6d4;
    }
    
    .instructions {
      border-top: 1px solid #334155;
      padding-top: 16px;
    }
    
    .instructions ul {
      margin: 0;
      padding-left: 20px;
    }
    
    .instructions li {
      font-size: 11px;
      color: #94a3b8;
      margin-bottom: 6px;
    }
  `]
})
export class ControlPanelComponent {
  @Input() isRunning = false;
  @Input() isReplaying = false;
  @Input() hasSnapshots = false;
  @Input() replayIndex = 0;
  @Input() totalSnapshots = 0;
  @Input() queueCount = 0;
  @Input() machineCount = 0;
  @Input() connectionCount = 0;
  @Input() connectionMode = false;
  @Input() canStart = false;

  @Output() addQueue = new EventEmitter<void>();
  @Output() addMachine = new EventEmitter<void>();
  @Output() toggleConnectionMode = new EventEmitter<void>();
  @Output() start = new EventEmitter<void>();
  @Output() stop = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();
  @Output() startReplay = new EventEmitter<void>();
  @Output() stopReplay = new EventEmitter<void>();
  @Output() updateInputRate = new EventEmitter<{ min: number, max: number }>();
  @Output() loadExample = new EventEmitter<void>();
  @Output() saveConfig = new EventEmitter<void>();
  @Output() loadConfig = new EventEmitter<any>();

  minInputRate = 500;
  maxInputRate = 2000;

  onAddQueue(): void {
    this.addQueue.emit();
  }

  onAddMachine(): void {
    this.addMachine.emit();
  }

  onToggleConnectionMode(): void {
    this.toggleConnectionMode.emit();
  }

  onStart(): void {
    this.start.emit();
  }

  onStop(): void {
    this.stop.emit();
  }

  onReset(): void {
    this.reset.emit();
  }

  onClear(): void {
    this.clear.emit();
  }

  onStartReplay(): void {
    this.startReplay.emit();
  }

  onStopReplay(): void {
    this.stopReplay.emit();
  }

  onUpdateInputRate(): void {
    this.updateInputRate.emit({ min: this.minInputRate, max: this.maxInputRate });
  }

  onLoadExample(): void {
    this.loadExample.emit();
  }

  onSaveConfig(): void {
    this.saveConfig.emit();
  }

  onLoadConfig(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target?.result as string);
          this.loadConfig.emit(config);
        } catch (err) {
          console.error('Invalid JSON file');
        }
      };
      reader.readAsText(file);
      // Reset file input so the same file can be loaded again
      input.value = '';
    }
  }
}

