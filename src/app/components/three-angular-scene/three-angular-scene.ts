import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { beforeRender, extend, injectStore, NgtArgs } from 'angular-three';
import { BoxGeometry, Camera, Group, Mesh, MeshStandardMaterial, Raycaster, Vector3 } from 'three';
import { Hotspot } from '../../models/hotspot.interface';
import { NgtsOrbitControls } from 'angular-three-soba/controls';
import { OrbitControls } from 'three-stdlib';

extend({
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
  Group,
})

@Component({
  selector: 'app-three-angular-scene',
  imports: [
    NgtArgs,
    NgtsOrbitControls
  ],
  templateUrl: './three-angular-scene.html',
  styleUrl: './three-angular-scene.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThreeAngularScene {
  private readonly store = injectStore();

  private readonly groupB = viewChild.required<ElementRef<Group>>('groupB');
  private readonly model = viewChild.required<ElementRef<Mesh>>('model');

  readonly green = 0x00ff00; // или можно прямо в шаблоне вместо 'green' использовать #00ff00
  readonly Math = Math;

  readonly selectedHotspotId = input<number | null>(null);
  readonly hotspots = input.required<Hotspot[]>();
  readonly hotspotElements = input<ReadonlyMap<number, HTMLButtonElement>>(new Map());
  readonly hotspotSelected = output<Hotspot>();
  readonly hotspotDeselected = output<void>();

  private readonly hotspotWorldPosition = new Vector3();
  private readonly hotspotNdcPosition = new Vector3();
  private readonly cameraWorldPosition = new Vector3();
  private readonly raycaster = new Raycaster();
  private readonly rayDirection = new Vector3();
  private readonly sceneCenter = new Vector3(0, 0, 0);

  private hotspotUpdateScheduled = false;

  // анимация переключения камеры с объекта на target
  private readonly targetStart = new Vector3();
  private readonly targetEnd = new Vector3();

  private targetAnimationProgress = 1;
  private targetAnimationDuration = 500;
  private targetAnimationStartTime = 0;

  constructor() {
    beforeRender(({ camera, size }) => {
      this.updateTargetAnimation();
      this.scheduleHotspotUpdate(camera, size);
    })
  }

  private updateHotspots(camera: Camera, size: { width: number; height: number }) {
    const group = this.groupB().nativeElement;
    const model = this.model().nativeElement;
    const elements = this.hotspotElements();

    camera.getWorldPosition(this.cameraWorldPosition);

    this.hotspots().forEach(hotspot => {
      const element = elements.get(hotspot.id);
      if (!element) return;

      this.hotspotWorldPosition.set(
        hotspot.position[0],
        hotspot.position[1],
        hotspot.position[2]
      )

      // local groupB to world
      group.localToWorld(this.hotspotWorldPosition);

      // world to ndc (normalized device coordinates)
      this.hotspotNdcPosition.copy(this.hotspotWorldPosition).project(camera);

      const isBehindCamera = this.hotspotNdcPosition.z < -1 || this.hotspotNdcPosition.z > 1;
      if (isBehindCamera) {
        element.style.opacity = '0';
        return;
      };

      this.rayDirection
        .copy(this.hotspotWorldPosition)
        .sub(this.cameraWorldPosition)
        .normalize()

      this.raycaster.set(this.cameraWorldPosition, this.rayDirection);

      const distanceToHotspot = this.cameraWorldPosition.distanceTo(this.hotspotWorldPosition);

      const firstIntersection = this.raycaster.intersectObject(model, true)[0];

      const occlusionEpsilon = 0.01;
      const isOccluded = firstIntersection !== undefined && firstIntersection.distance < distanceToHotspot - occlusionEpsilon;

      element.style.opacity = isOccluded ? '0' : '1';
      if (isOccluded) return;

      // ndc to pixels
      const x = (this.hotspotNdcPosition.x + 1) / 2 * size.width;
      const y = (1 - this.hotspotNdcPosition.y) / 2 * size.height;

      element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
    })
  }

  private scheduleHotspotUpdate(camera: Camera, size: { width: number; height: number }) {
    if (this.hotspotUpdateScheduled) return;

    this.hotspotUpdateScheduled = true;

    requestAnimationFrame(() => {
      this.hotspotUpdateScheduled = false;
      this.updateHotspots(camera, size);
    })
  }

  private getHotspotWorldPosition(hotspot: Hotspot): Vector3 {
    this.hotspotWorldPosition.set(
      hotspot.position[0],
      hotspot.position[1],
      hotspot.position[2],
    )

    this.groupB().nativeElement.localToWorld(this.hotspotWorldPosition);

    return this.hotspotWorldPosition;
  }

  onHotspotPointerDown(hotspot: Hotspot) {
    // снимаем выделение повторным кликом
    if (this.selectedHotspotId() === hotspot.id) {
      this.clearHotspotSelection();
      return;
    }

    const worldPosition = this.getHotspotWorldPosition(hotspot);

    this.animateTargetTo(worldPosition);

    this.hotspotSelected.emit(hotspot);
  }

  clearHotspotSelection() {
    this.animateTargetTo(this.sceneCenter);
    this.hotspotDeselected.emit();
  }

  private animateTargetTo(position: Vector3) {
    // получаем ссылку на наш OrbitControls
    const controls = this.store.controls() as OrbitControls | undefined;
    if (!controls) return;

    this.targetStart.copy(controls.target);
    this.targetEnd.copy(position);

    this.targetAnimationProgress = 0;
    this.targetAnimationStartTime = performance.now();
  }

  private updateTargetAnimation() {
    if (this.targetAnimationProgress >= 1) return;

    const controls = this.store.controls() as OrbitControls | undefined;
    if (!controls) return;

    const elapsed = performance.now() - this.targetAnimationStartTime;

    const progress = this.Math.min(elapsed / this.targetAnimationDuration, 1);
    const easedProgress = this.easeOutCubic(progress);

    this.targetAnimationProgress = progress;

    controls.target.lerpVectors(
      this.targetStart,
      this.targetEnd,
      easedProgress
    )

    controls.update();
  }

  private easeOutCubic(value: number): number {
    return 1 - Math.pow(1 - value, 3);
  }
}
