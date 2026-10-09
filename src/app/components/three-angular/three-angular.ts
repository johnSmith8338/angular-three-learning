import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, signal, viewChild, viewChildren } from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import { ThreeAngularScene } from '../three-angular-scene/three-angular-scene';
import { Hotspot } from '../../models/hotspot.interface';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay'

type ZoomDirection = 'in' | 'out';

@Component({
  selector: 'app-three-angular',
  imports: [
    NgtCanvas,
    ThreeAngularScene,
    CdkConnectedOverlay,
    CdkOverlayOrigin
  ],
  templateUrl: './three-angular.html',
  styleUrl: './three-angular.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'onWindowKeydown($event)'
  }
})
export class ThreeAngular {
  private readonly destroyRef = inject(DestroyRef);

  readonly hotspotElements = viewChildren<ElementRef<HTMLButtonElement>>('hotspotElement');
  readonly scene = viewChild.required(ThreeAngularScene);
  readonly tooltipOverlays = viewChildren(CdkConnectedOverlay);

  readonly selectedHotspotId = signal<number | null>(null);
  readonly hoveredHotspotId = signal<number | null>(null);
  readonly selectedMeshHotspot = signal<Hotspot | null>(null);
  readonly focusMode = signal(false);

  private zoomTimer: ReturnType<typeof setInterval> | null = null;

  private tooltipPositionFrame: number | null = null;

  readonly isFocusMode = computed(() => this.selectedMeshHotspot() !== null);

  readonly hotspotElementMap = computed(() => {
    const elements = this.hotspotElements();

    return new Map(elements.map(element => {
      const id = Number(element.nativeElement.dataset['hotspotId'])
      return [id, element.nativeElement];
    }))
  })

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.stopZoom();
      this.stopTooltipPositionUpdates();
    })
  }

  onHotspotPointerEnter(hotspot: Hotspot): void {
    this.hoveredHotspotId.set(hotspot.id);
  }

  onHotspotPointerLeave(): void {
    this.hoveredHotspotId.set(null);
  }

  onHotspotClick(hotspot: Hotspot) {
    if (this.selectedHotspotId() === hotspot.id) {
      this.closeHotspotTooltip();
      return;
    }

    this.selectedHotspotId.set(hotspot.id);
    this.startTooltipPositionUpdates();
  }

  onMeshSelected(hotspot: Hotspot): void {
    this.closeHotspotTooltip();

    this.selectedMeshHotspot.set(hotspot);
    this.focusMode.set(true);
  }

  onMeshDeselected(): void {
    this.selectedMeshHotspot.set(null);
    this.focusMode.set(false);
    this.hoveredHotspotId.set(null);
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
    if (direction !== 'in') {
      this.scene().zoomIn();
    } else {
      this.scene().zoomOut();
    }
  }

  resetCamera() {
    this.scene().resetCamera();
  }

  onWindowKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    if (this.selectedMeshHotspot() !== null) {
      this.onMeshDeselected();
      return;
    }
    if (this.selectedHotspotId() !== null) this.closeHotspotTooltip();
  }

  private closeHotspotTooltip() {
    this.selectedHotspotId.set(null);
    this.stopTooltipPositionUpdates();
  }

  private readonly updateTooltipPosition = () => {
    if (this.selectedHotspotId() === null) {
      this.tooltipPositionFrame = null;
      return;
    }

    for (const overlay of this.tooltipOverlays()) {
      overlay.overlayRef?.updatePosition();
    }

    this.tooltipPositionFrame = requestAnimationFrame(this.updateTooltipPosition);
  }

  private startTooltipPositionUpdates() {
    if (this.tooltipPositionFrame !== null) return;
    this.tooltipPositionFrame = requestAnimationFrame(this.updateTooltipPosition);
  }

  private stopTooltipPositionUpdates() {
    if (this.tooltipPositionFrame === null) return;
    cancelAnimationFrame(this.tooltipPositionFrame);
    this.tooltipPositionFrame = null;
  }

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

  readonly tooltipPositions: ConnectedPosition[] = [
    {
      originX: 'center',
      originY: 'top',
      overlayX: 'center',
      overlayY: 'bottom',
      offsetY: -10
    },
    {
      originX: 'center',
      originY: 'bottom',
      overlayX: 'center',
      overlayY: 'top',
      offsetY: 10
    },
    {
      originX: 'end',
      originY: 'center',
      overlayX: 'start',
      overlayY: 'center',
      offsetX: 10
    },
    {
      originX: 'start',
      originY: 'center',
      overlayX: 'end',
      overlayY: 'center',
      offsetX: -10
    },
  ]
}
