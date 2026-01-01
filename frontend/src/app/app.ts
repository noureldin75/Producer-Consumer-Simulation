import { Component } from '@angular/core';
import { SimulationBoardComponent } from './components/simulation-board/simulation-board.component';
import { ToastContainerComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SimulationBoardComponent, ToastContainerComponent],
  template: `
    <app-simulation-board></app-simulation-board>
    <app-toast-container></app-toast-container>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }
  `]
})
export class App {
  title = 'Producer Consumer Simulation';
}
