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
  readonly cameraAngle = signal(0);
  readonly cameraVerticalAngle = signal(0);

  readonly dragging = signal(false);

  private previousPointerX = 0;
  private previousPointerY = 0;

  onScreenPositionChange(position: [number, number] | null) {
    this.screenPosition.set(position);
  }

  onPointerDown(event: PointerEvent) {
    this.dragging.set(true);

    this.previousPointerX = event.clientX;
    this.previousPointerY = event.clientY;

    // на случай если курсор уйдет за пределы контейнера
    const element = event.currentTarget as HTMLElement;
    element.setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent) {
    // без зажатой кнопки мыши - управление камерой
    // const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    // const x = (event.clientX - rect.left) / rect.width;
    // const y = (event.clientY - rect.top) / rect.height;

    // this.pointerX.set(x * 2 - 1);
    // this.pointerY.set(y * 2 - 1);

    if (!this.dragging()) return;

    const deltaX = event.clientX - this.previousPointerX;
    const deltaY = event.clientY - this.previousPointerY;

    this.previousPointerX = event.clientX;
    this.previousPointerY = event.clientY;

    this.cameraAngle.update(angle => angle - deltaX * 0.01);
    // ограничиваем вертикаль в диапозоне от 45deg до -45deg
    this.cameraVerticalAngle.update(angle =>
      Math.max(-Math.PI / 4, Math.min(Math.PI / 4, angle + deltaY * 0.01))
    );
  }

  onPointerUp(event: PointerEvent) {
    this.dragging.set(false);

    // на случай если курсор уйдет за пределы контейнера
    const element = event.currentTarget as HTMLElement;
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
  }
}
