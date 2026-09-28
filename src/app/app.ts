import { Component, signal } from '@angular/core';
// import { ThreeScene } from './components/three-scene/three-scene';
import { ThreeAngular } from './components/three-angular/three-angular';

@Component({
  selector: 'app-root',
  imports: [
    // ThreeScene, 
    ThreeAngular
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('angular-three-learning');
}
