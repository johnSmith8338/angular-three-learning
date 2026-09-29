import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import { ThreeAngularScene } from '../three-angular-scene/three-angular-scene';

@Component({
  selector: 'app-three-angular',
  imports: [
    NgtCanvas,
    ThreeAngularScene
  ],
  templateUrl: './three-angular.html',
  styleUrl: './three-angular.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThreeAngular {
  readonly screenPosition = signal<[number, number] | null>(null);
  readonly pointerX = signal(0);

  onScreenPositionChange(position: [number, number] | null) {
    this.screenPosition.set(position);
  }

  onPointerMove(event: PointerEvent) {
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointerX.set(x);
  }
}
