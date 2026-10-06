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

  readonly selectedHotspotId = signal<number | null>(null);
  readonly hoveredHotspotId = signal<number | null>(null);
  readonly selectedMeshHotspot = signal<Hotspot | null>(null);
  readonly focusMode = signal(false);

  readonly hotspots: Hotspot[] = [
    {
      id: 1,
      title: 'Заголовок 1',
      description: 'Описание для заголовка 1',
      meshName: 'camera',
      anchor: 'top'
    },
    {
      id: 2,
      title: 'Заголовок 2',
      description: 'Описание для заголовка 2',
      meshName: 'tripod',
      anchor: 'right'
    },
  ]

  readonly isFocusMode = computed(() => this.selectedMeshHotspot() !== null);

  readonly hotspotElementMap = computed(() => {
    const elements = this.hotspotElements();

    return new Map(elements.map(element => {
      const id = Number(element.nativeElement.dataset['hotspotId'])
      return [id, element.nativeElement];
    }))
  })

  onHotspotPointerEnter(hotspot: Hotspot): void {
    this.hoveredHotspotId.set(hotspot.id);
  }

  onHotspotPointerLeave(): void {
    this.hoveredHotspotId.set(null);
  }

  onHotspotClick(hotspot: Hotspot) {
    if (this.selectedHotspotId() === hotspot.id) {
      this.selectedHotspotId.set(null);
      return;
    }

    this.selectedHotspotId.set(hotspot.id);
  }

  onMeshSelected(hotspot: Hotspot): void {
    this.selectedMeshHotspot.set(hotspot);
    this.focusMode.set(true);
  }

  onMeshDeselected(): void {
    this.selectedMeshHotspot.set(null);
    this.focusMode.set(false);
  }
}
