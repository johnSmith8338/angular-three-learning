import { ChangeDetectionStrategy, Component, computed, ElementRef, signal, viewChildren } from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import { ThreeAngularScene } from '../three-angular-scene/three-angular-scene';
import { Hotspot } from '../../models/hotspot.interface';

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
  readonly hotspotElements = viewChildren<ElementRef<HTMLButtonElement>>('hotspotElement');

  readonly cameraAngle = signal(0);
  readonly cameraVerticalAngle = signal(0);

  readonly hotspots: Hotspot[] = [
    {
      id: 1,
      position: [-0.5, 0.5, 0.5],
      title: 'Заголовок 1',
      description: 'Описание для заголовка 1'
    },
    {
      id: 2,
      position: [0.5, 0.2, 0.5],
      title: 'Заголовок 2',
      description: 'Описание для заголовка 2'
    },
    {
      id: 3,
      position: [0, -0.5, 0.5],
      title: 'Заголовок 3',
      description: 'Описание для заголовка 3'
    },
  ]

  readonly dragging = signal(false);

  private previousPointerX = 0;
  private previousPointerY = 0;

  readonly hotspotElementMap = computed(() => {
    const elements = this.hotspotElements();

    return new Map(elements.map(element => {
      const id = Number(element.nativeElement.dataset['hotspotId'])
      return [id, element.nativeElement];
    }))
  })

  onPointerDown(event: PointerEvent) {
    this.dragging.set(true);

    this.previousPointerX = event.clientX;
    this.previousPointerY = event.clientY;

    // на случай если курсор уйдет за пределы контейнера
    const element = event.currentTarget as HTMLElement;
    element.setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent) {
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
