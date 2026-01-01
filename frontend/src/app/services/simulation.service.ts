import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
    SimulationState,
    CreateQueueRequest,
    CreateMachineRequest,
    ConnectionRequest,
    UpdateMachineSettingsRequest,
    SimulationConfig
} from '../models/simulation.models';
import { ToastService } from './toast.service';

@Injectable({
    providedIn: 'root'
})
export class SimulationService {
    private readonly API_URL = 'http://localhost:8080/api/simulation';

    private stateSubject = new BehaviorSubject<SimulationState | null>(null);
    public state$ = this.stateSubject.asObservable();

    private eventSource: EventSource | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 10;

    constructor(
        private http: HttpClient,
        private ngZone: NgZone,
        private toastService: ToastService
    ) {
        this.connectToStream();
    }

    /**
     * Handle HTTP errors and show toast
     */
    private handleError(operation: string) {
        return (error: HttpErrorResponse) => {
            let message = `${operation} failed`;
            
            if (error.error?.message) {
                message = error.error.message;
            } else if (error.status === 0) {
                message = 'Cannot connect to server. Is the backend running?';
            } else if (error.status === 404) {
                message = `${operation}: Resource not found`;
            } else if (error.status === 400) {
                message = `${operation}: Invalid request`;
            }
            
            this.toastService.error(message);
            return throwError(() => error);
        };
    }

    /**
     * Connect to the SSE stream for real-time updates
     */
    private connectToStream(): void {
        if (this.eventSource) {
            this.eventSource.close();
        }

        this.eventSource = new EventSource(`${this.API_URL}/stream`);

        this.eventSource.onmessage = (event) => {
            this.ngZone.run(() => {
                try {
                    const state: SimulationState = JSON.parse(event.data);
                    this.stateSubject.next(state);
                    this.reconnectAttempts = 0;
                } catch (e) {
                    console.error('Error parsing state:', e);
                }
            });
        };

        this.eventSource.onerror = () => {
            this.eventSource?.close();

            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                if (this.reconnectAttempts === 1) {
                    this.toastService.warning('Connection lost. Reconnecting...');
                }
                setTimeout(() => this.connectToStream(), 2000 * this.reconnectAttempts);
            } else {
                this.toastService.error('Failed to connect to server after multiple attempts');
            }
        };
    }

    /**
     * Get current state
     */
    getState(): Observable<SimulationState> {
        return this.http.get<SimulationState>(`${this.API_URL}/state`).pipe(
            catchError(this.handleError('Get state'))
        );
    }

    /**
     * Create a new queue
     */
    createQueue(request: CreateQueueRequest): Observable<any> {
        return this.http.post(`${this.API_URL}/queues`, request).pipe(
            tap(() => this.toastService.success('Queue created')),
            catchError(this.handleError('Create queue'))
        );
    }

    /**
     * Delete a queue
     */
    deleteQueue(id: string): Observable<any> {
        return this.http.delete(`${this.API_URL}/queues/${id}`).pipe(
            tap(() => this.toastService.success('Queue deleted')),
            catchError(this.handleError('Delete queue'))
        );
    }

    /**
     * Update queue position
     */
    updateQueuePosition(id: string, x: number, y: number): Observable<any> {
        return this.http.put(`${this.API_URL}/queues/${id}/position`, { x, y }).pipe(
            catchError(this.handleError('Update queue position'))
        );
    }

    /**
     * Set input queue
     */
    setInputQueue(id: string): Observable<any> {
        return this.http.put(`${this.API_URL}/queues/${id}/input`, {}).pipe(
            tap(() => this.toastService.success('Input queue set')),
            catchError(this.handleError('Set input queue'))
        );
    }

    /**
     * Create a new machine
     */
    createMachine(request: CreateMachineRequest): Observable<any> {
        return this.http.post(`${this.API_URL}/machines`, request).pipe(
            tap(() => this.toastService.success('Machine created')),
            catchError(this.handleError('Create machine'))
        );
    }

    /**
     * Delete a machine
     */
    deleteMachine(id: string): Observable<any> {
        return this.http.delete(`${this.API_URL}/machines/${id}`).pipe(
            tap(() => this.toastService.success('Machine deleted')),
            catchError(this.handleError('Delete machine'))
        );
    }

    /**
     * Update machine position
     */
    updateMachinePosition(id: string, x: number, y: number): Observable<any> {
        return this.http.put(`${this.API_URL}/machines/${id}/position`, { x, y }).pipe(
            catchError(this.handleError('Update machine position'))
        );
    }

    /**
     * Update machine settings (service times)
     */
    updateMachineSettings(id: string, settings: UpdateMachineSettingsRequest): Observable<any> {
        return this.http.put(`${this.API_URL}/machines/${id}/settings`, settings).pipe(
            tap(() => this.toastService.success('Machine settings updated')),
            catchError(this.handleError('Update machine settings'))
        );
    }

    /**
     * Create a connection
     */
    createConnection(request: ConnectionRequest): Observable<any> {
        return this.http.post(`${this.API_URL}/connections`, request).pipe(
            tap(() => this.toastService.success('Connection created')),
            catchError(this.handleError('Create connection'))
        );
    }

    /**
     * Delete a connection
     */
    deleteConnection(request: ConnectionRequest): Observable<any> {
        return this.http.request('delete', `${this.API_URL}/connections`, { body: request }).pipe(
            tap(() => this.toastService.success('Connection deleted')),
            catchError(this.handleError('Delete connection'))
        );
    }

    /**
     * Start simulation
     */
    startSimulation(): Observable<any> {
        return this.http.post(`${this.API_URL}/start`, {}).pipe(
            tap(() => this.toastService.success('Simulation started')),
            catchError(this.handleError('Start simulation'))
        );
    }

    /**
     * Stop simulation
     */
    stopSimulation(): Observable<any> {
        return this.http.post(`${this.API_URL}/stop`, {}).pipe(
            tap(() => this.toastService.info('Simulation stopped')),
            catchError(this.handleError('Stop simulation'))
        );
    }

    /**
     * Clear the board
     */
    clearBoard(): Observable<any> {
        return this.http.post(`${this.API_URL}/clear`, {}).pipe(
            tap(() => this.toastService.info('Board cleared')),
            catchError(this.handleError('Clear board'))
        );
    }

    /**
     * Reset simulation - restart without clearing configuration
     */
    resetSimulation(): Observable<any> {
        return this.http.post(`${this.API_URL}/reset`, {}).pipe(
            tap(() => this.toastService.success('Simulation reset')),
            catchError(this.handleError('Reset simulation'))
        );
    }

    /**
     * Start replay
     */
    startReplay(): Observable<any> {
        return this.http.post(`${this.API_URL}/replay/start`, {}).pipe(
            tap(() => this.toastService.info('Replay started')),
            catchError(this.handleError('Start replay'))
        );
    }

    /**
     * Stop replay
     */
    stopReplay(): Observable<any> {
        return this.http.post(`${this.API_URL}/replay/stop`, {}).pipe(
            catchError(this.handleError('Stop replay'))
        );
    }

    /**
     * Set input rate
     */
    setInputRate(min: number, max: number): Observable<any> {
        return this.http.put(`${this.API_URL}/config/input-rate`, { min, max }).pipe(
            tap(() => this.toastService.success('Input rate updated')),
            catchError(this.handleError('Set input rate'))
        );
    }

    /**
     * Load complex example configuration
     */
    loadExample(): Observable<any> {
        return this.http.post(`${this.API_URL}/load-example`, {}).pipe(
            tap(() => this.toastService.success('Example loaded')),
            catchError(this.handleError('Load example'))
        );
    }

    /**
     * Export configuration as JSON
     */
    exportConfig(): Observable<SimulationConfig> {
        return this.http.get<SimulationConfig>(`${this.API_URL}/export`).pipe(
            catchError(this.handleError('Export configuration'))
        );
    }

    /**
     * Import configuration from JSON
     */
    importConfig(config: SimulationConfig): Observable<any> {
        return this.http.post(`${this.API_URL}/import`, config).pipe(
            tap(() => this.toastService.success('Configuration imported')),
            catchError(this.handleError('Import configuration'))
        );
    }

    /**
     * Disconnect from stream
     */
    disconnect(): void {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }
}

