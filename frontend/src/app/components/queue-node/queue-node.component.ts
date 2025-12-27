import { Component, Input, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QueueState, Product } from '../../models/simulation.models';

@Component({
    selector: 'app-queue-node',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div 
      class="queue-node"
      [class.selected]="selected"
      [class.input-queue]="isInputQueue"
      [class.connection-mode]="connectionModeActive"
      [style.left.px]="queue.x"
      [style.top.px]="queue.y"
      (mousedown)="onMouseDown($event)"
      (click)="onClick($event)"
      (dblclick)="onDoubleClick($event)"
    >
      <div class="queue-header">
        <span class="queue-icon">📦</span>
        <span class="queue-name">{{ queue.name }}</span>
        <span class="queue-count">{{ queue.size }}</span>
      </div>
      
      <div class="queue-products">
        <div 
          *ngFor="let product of queue.products; let i = index"
          class="product-dot"
          [style.background-color]="product.color"
          [style.animation-delay]="i * 0.05 + 's'"
          [title]="'Product: ' + product.id"
        ></div>
      </div>
      
      <div class="queue-footer" *ngIf="isInputQueue">
        <span class="input-badge">INPUT</span>
      </div>
      
      <!-- Connection points -->
      <div class="connection-point input" (click)="onConnectionPointClick($event, 'input')"></div>
      <div class="connection-point output" (click)="onConnectionPointClick($event, 'output')"></div>
    </div>
  `,
    styles: [`
    .queue-node {
      position: absolute;
      min-width: 120px;
      background: linear-gradient(145deg, #1e293b, #334155);
      border: 2px solid #475569;
      border-radius: 12px;
      padding: 12px;
      cursor: move;
      user-select: none;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      z-index: 10;
    }
    
    .queue-node:hover {
      transform: scale(1.02);
      box-shadow: 0 6px 25px rgba(0, 0, 0, 0.5);
      border-color: #60a5fa;
    }
    
    .queue-node.selected {
      border-color: #3b82f6;
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
    }
    
    .queue-node.input-queue {
      border-color: #22c55e;
    }
    
    .queue-node.connection-mode {
      cursor: crosshair;
    }
    
    .queue-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    
    .queue-icon {
      font-size: 18px;
    }
    
    .queue-name {
      color: #e2e8f0;
      font-weight: 600;
      font-size: 14px;
      flex: 1;
    }
    
    .queue-count {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
      min-width: 24px;
      text-align: center;
    }
    
    .queue-products {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      min-height: 24px;
      padding: 6px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 6px;
    }
    
    .product-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      animation: popIn 0.3s ease forwards;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    
    @keyframes popIn {
      0% {
        transform: scale(0);
        opacity: 0;
      }
      50% {
        transform: scale(1.2);
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    .queue-footer {
      margin-top: 8px;
      text-align: center;
    }
    
    .input-badge {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: white;
      padding: 2px 10px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: bold;
      letter-spacing: 1px;
    }
    
    .connection-point {
      position: absolute;
      width: 16px;
      height: 16px;
      background: #60a5fa;
      border: 2px solid #1e293b;
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.2s ease, background 0.2s ease;
      z-index: 20;
    }
    
    .connection-point:hover {
      transform: scale(1.3);
      background: #3b82f6;
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
export class QueueNodeComponent {
    @Input() queue!: QueueState;
    @Input() selected = false;
    @Input() isInputQueue = false;
    @Input() connectionModeActive = false;

    @Output() dragStart = new EventEmitter<{ event: MouseEvent, queue: QueueState }>();
    @Output() nodeClick = new EventEmitter<QueueState>();
    @Output() nodeDoubleClick = new EventEmitter<QueueState>();
    @Output() connectionPointClicked = new EventEmitter<{ queue: QueueState, type: 'input' | 'output' }>();

    onMouseDown(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('connection-point')) {
            return;
        }
        event.stopPropagation();
        this.dragStart.emit({ event, queue: this.queue });
    }

    onClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('connection-point')) {
            return;
        }
        event.stopPropagation();
        this.nodeClick.emit(this.queue);
    }

    onDoubleClick(event: MouseEvent): void {
        event.stopPropagation();
        this.nodeDoubleClick.emit(this.queue);
    }

    onConnectionPointClick(event: MouseEvent, type: 'input' | 'output'): void {
        event.stopPropagation();
        this.connectionPointClicked.emit({ queue: this.queue, type });
    }
}
