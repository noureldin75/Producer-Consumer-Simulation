import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MachineState } from '../../models/simulation.models';

@Component({
  selector: 'app-machine-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onCancel()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>⚙️ Edit Machine Settings</h2>
          <button class="close-btn" (click)="onCancel()">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>Machine Name</label>
            <input type="text" [(ngModel)]="name" placeholder="Machine name" />
          </div>
          
          <div class="form-group">
            <label>Min Service Time (ms)</label>
            <input 
              type="number" 
              [(ngModel)]="minServiceTime" 
              min="100" 
              max="60000"
              [class.error]="!isValidMin()"
            />
            <span class="hint" *ngIf="!isValidMin()">Must be between 100-60000ms</span>
          </div>
          
          <div class="form-group">
            <label>Max Service Time (ms)</label>
            <input 
              type="number" 
              [(ngModel)]="maxServiceTime" 
              min="100" 
              max="60000"
              [class.error]="!isValidMax()"
            />
            <span class="hint" *ngIf="!isValidMax()">Must be >= min time and <= 60000ms</span>
          </div>
          
          <div class="form-group info">
            <span class="label">Products Processed:</span>
            <span class="value">{{ machine.productsProcessed }}</span>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="onCancel()">Cancel</button>
          <button class="btn btn-primary" (click)="onSave()" [disabled]="!isValid()">Save Changes</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .modal-content {
      background: linear-gradient(145deg, #1e293b, #0f172a);
      border: 1px solid #475569;
      border-radius: 16px;
      width: 400px;
      max-width: 90vw;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.3s ease;
    }
    
    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(20px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid #334155;
    }
    
    .modal-header h2 {
      margin: 0;
      font-size: 18px;
      color: #e2e8f0;
      font-weight: 600;
    }
    
    .close-btn {
      background: none;
      border: none;
      color: #64748b;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      transition: color 0.2s;
    }
    
    .close-btn:hover {
      color: #ef4444;
    }
    
    .modal-body {
      padding: 24px;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: #94a3b8;
      font-size: 13px;
      font-weight: 500;
    }
    
    .form-group input {
      width: 100%;
      padding: 12px 16px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #e2e8f0;
      font-size: 14px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    
    .form-group input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }
    
    .form-group input.error {
      border-color: #ef4444;
    }
    
    .form-group .hint {
      display: block;
      margin-top: 6px;
      font-size: 11px;
      color: #ef4444;
    }
    
    .form-group.info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #0f172a;
      border-radius: 8px;
    }
    
    .form-group.info .label {
      color: #64748b;
      font-size: 13px;
    }
    
    .form-group.info .value {
      color: #22c55e;
      font-size: 14px;
      font-weight: 600;
    }
    
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid #334155;
    }
    
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .btn-secondary {
      background: #334155;
      color: #e2e8f0;
    }
    
    .btn-secondary:hover:not(:disabled) {
      background: #475569;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
      background: linear-gradient(135deg, #60a5fa, #3b82f6);
    }
  `]
})
export class MachineEditorComponent implements OnInit {
  @Input() machine!: MachineState;
  @Output() save = new EventEmitter<{ minServiceTime: number; maxServiceTime: number; name: string }>();
  @Output() cancel = new EventEmitter<void>();

  name: string = '';
  minServiceTime: number = 1000;
  maxServiceTime: number = 3000;

  ngOnInit(): void {
    this.name = this.machine.name;
    this.minServiceTime = this.machine.minServiceTime || 1000;
    this.maxServiceTime = this.machine.maxServiceTime || 3000;
  }

  isValidMin(): boolean {
    return this.minServiceTime >= 100 && this.minServiceTime <= 60000;
  }

  isValidMax(): boolean {
    return this.maxServiceTime >= this.minServiceTime && this.maxServiceTime <= 60000;
  }

  isValid(): boolean {
    return this.isValidMin() && this.isValidMax() && this.name.trim().length > 0;
  }

  onSave(): void {
    if (this.isValid()) {
      this.save.emit({
        minServiceTime: this.minServiceTime,
        maxServiceTime: this.maxServiceTime,
        name: this.name.trim()
      });
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
