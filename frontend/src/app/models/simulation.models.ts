// Simulation state models matching backend DTOs

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

export interface ConnectionState {
  fromId: string;
  toId: string;
  type: 'queue-to-machine' | 'machine-to-queue';
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

export interface CreateQueueRequest {
  name: string;
  x: number;
  y: number;
}

export interface CreateMachineRequest {
  name: string;
  x: number;
  y: number;
  minServiceTime: number;
  maxServiceTime: number;
}

export interface ConnectionRequest {
  fromId: string;
  toId: string;
  type: 'queue-to-machine' | 'machine-to-queue';
}

export type NodeType = 'queue' | 'machine';

export interface DragState {
  isDragging: boolean;
  nodeId: string | null;
  nodeType: NodeType | null;
  offsetX: number;
  offsetY: number;
}

export interface ConnectionMode {
  active: boolean;
  fromId: string | null;
  fromType: NodeType | null;
}
