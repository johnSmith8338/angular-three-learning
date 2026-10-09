import { ChangeDetectionStrategy, Component, computed, ElementRef, signal, viewChild, viewChildren } from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import { ThreeAngularScene } from '../three-angular-scene/three-angular-scene';
import { Hotspot } from '../../models/hotspot.interface';

type ZoomDirection = 'in' | 'out';

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
  readonly scene = viewChild.required(ThreeAngularScene);

  readonly selectedHotspotId = signal<number | null>(null);
  readonly hoveredHotspotId = signal<number | null>(null);
  readonly selectedMeshHotspot = signal<Hotspot | null>(null);
  readonly focusMode = signal(false);

  private zoomTimer: ReturnType<typeof setInterval> | null = null;

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

  startZoom(direction: ZoomDirection, event: PointerEvent) {
    const button = event.currentTarget;
    if (button instanceof HTMLElement) button.setPointerCapture(event.pointerId);

    this.stopZoom();

    this.zoomOnce(direction);

    this.zoomTimer = setInterval(() => {
      this.zoomOnce(direction);
    }, 80)
  }

  stopZoom(event?: PointerEvent) {
    if (event) {
      const button = event.currentTarget;
      if (button instanceof HTMLElement && button.hasPointerCapture(event.pointerId)) {
        button.releasePointerCapture(event.pointerId)
      }
    }

    if (this.zoomTimer === null) return;

    clearInterval(this.zoomTimer);
    this.zoomTimer = null;
  }

  private zoomOnce(direction: ZoomDirection) {
    if (direction === 'in') {
      this.scene().zoomIn();
    } else {
      this.scene().zoomOut();
    }
  }
}
