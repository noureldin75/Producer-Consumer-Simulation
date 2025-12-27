import { Component } from '@angular/core';
import { SimulationBoardComponent } from './components/simulation-board/simulation-board.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SimulationBoardComponent],
  template: `<app-simulation-board></app-simulation-board>`,
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
