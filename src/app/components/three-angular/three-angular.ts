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

  private previousPointerX = 0;
  private previousPointerY = 0;

  readonly hotspotElementMap = computed(() => {
    const elements = this.hotspotElements();

    return new Map(elements.map(element => {
      const id = Number(element.nativeElement.dataset['hotspotId'])
      return [id, element.nativeElement];
    }))
  })
}
