import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import {
    SimulationState,
    CreateQueueRequest,
    CreateMachineRequest,
    ConnectionRequest,
    QueueState,
    MachineState
} from '../models/simulation.models';

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
        private ngZone: NgZone
    ) {
        this.connectToStream();
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
            console.error('SSE connection error');
            this.eventSource?.close();

            // Attempt to reconnect
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                setTimeout(() => this.connectToStream(), 2000 * this.reconnectAttempts);
            }
        };
    }

    /**
     * Get current state
     */
    getState(): Observable<SimulationState> {
        return this.http.get<SimulationState>(`${this.API_URL}/state`);
    }

    /**
     * Create a new queue
     */
    createQueue(request: CreateQueueRequest): Observable<any> {
        return this.http.post(`${this.API_URL}/queues`, request);
    }

    /**
     * Delete a queue
     */
    deleteQueue(id: string): Observable<any> {
        return this.http.delete(`${this.API_URL}/queues/${id}`);
    }

    /**
     * Update queue position
     */
    updateQueuePosition(id: string, x: number, y: number): Observable<any> {
        return this.http.put(`${this.API_URL}/queues/${id}/position`, { x, y });
    }

    /**
     * Set input queue
     */
    setInputQueue(id: string): Observable<any> {
        return this.http.put(`${this.API_URL}/queues/${id}/input`, {});
    }

    /**
     * Create a new machine
     */
    createMachine(request: CreateMachineRequest): Observable<any> {
        return this.http.post(`${this.API_URL}/machines`, request);
    }

    /**
     * Delete a machine
     */
    deleteMachine(id: string): Observable<any> {
        return this.http.delete(`${this.API_URL}/machines/${id}`);
    }

    /**
     * Update machine position
     */
    updateMachinePosition(id: string, x: number, y: number): Observable<any> {
        return this.http.put(`${this.API_URL}/machines/${id}/position`, { x, y });
    }

    /**
     * Create a connection
     */
    createConnection(request: ConnectionRequest): Observable<any> {
        return this.http.post(`${this.API_URL}/connections`, request);
    }

    /**
     * Delete a connection
     */
    deleteConnection(request: ConnectionRequest): Observable<any> {
        return this.http.request('delete', `${this.API_URL}/connections`, { body: request });
    }

    /**
     * Start simulation
     */
    startSimulation(): Observable<any> {
        return this.http.post(`${this.API_URL}/start`, {});
    }

    /**
     * Stop simulation
     */
    stopSimulation(): Observable<any> {
        return this.http.post(`${this.API_URL}/stop`, {});
    }

    /**
     * Clear the board
     */
    clearBoard(): Observable<any> {
        return this.http.post(`${this.API_URL}/clear`, {});
    }

    /**
     * Start replay
     */
    startReplay(): Observable<any> {
        return this.http.post(`${this.API_URL}/replay/start`, {});
    }

    /**
     * Stop replay
     */
    stopReplay(): Observable<any> {
        return this.http.post(`${this.API_URL}/replay/stop`, {});
    }

    /**
     * Set input rate
     */
    setInputRate(min: number, max: number): Observable<any> {
        return this.http.put(`${this.API_URL}/config/input-rate`, { min, max });
    }

    /**
     * Load complex example configuration
     */
    loadExample(): Observable<any> {
        return this.http.post(`${this.API_URL}/load-example`, {});
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
