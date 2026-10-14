import { Component, signal } from '@angular/core';
// import { ThreeScene } from './components/three-scene/three-scene';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [
    // ThreeScene,
    RouterOutlet
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('angular-three-learning');
}
