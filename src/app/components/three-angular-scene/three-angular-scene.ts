import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, input, viewChild } from '@angular/core';
import { beforeRender, extend, NgtArgs } from 'angular-three';
import { BoxGeometry, Camera, Group, Mesh, MeshStandardMaterial, Raycaster, Vector3 } from 'three';
import { Hotspot } from '../../models/hotspot.interface';

extend({
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
  Group,
})

@Component({
  selector: 'app-three-angular-scene',
  imports: [NgtArgs],
  templateUrl: './three-angular-scene.html',
  styleUrl: './three-angular-scene.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThreeAngularScene {
  private readonly groupB = viewChild.required<ElementRef<Group>>('groupB');
  private readonly model = viewChild.required<ElementRef<Mesh>>('model');

  readonly green = 0x00ff00; // или можно прямо в шаблоне вместо 'green' использовать #00ff00
  readonly Math = Math;

  readonly hotspots = input.required<Hotspot[]>();
  readonly hotspotElements = input<ReadonlyMap<number, HTMLButtonElement>>(new Map());

  readonly cameraAngle = input(0);
  readonly cameraVerticalAngle = input(0);

  private readonly cameraTarget = new Vector3(0, 0, 0);
  private readonly hotspotWorldPosition = new Vector3();
  private readonly hotspotNdcPosition = new Vector3();
  private readonly cameraWorldPosition = new Vector3();
  private readonly raycaster = new Raycaster();
  private readonly rayDirection = new Vector3();

  private hotspotUpdateScheduled = false;

  constructor() {
    beforeRender(({ camera, size }) => {
      /**
       * работа с камерой
       */
      this.updateCamera(camera);

      /**
       * работа с указателем мыши на объект
       */
      this.scheduleHotspotUpdate(camera, size);
    })
  }

  private updateCamera(camera: Camera) {
    const radius = 5;
    const verticalAngle = this.cameraVerticalAngle();

    const horizontalRadius = this.Math.cos(verticalAngle) * radius;

    camera.position.x = this.Math.sin(this.cameraAngle()) * horizontalRadius;
    camera.position.y = this.Math.sin(verticalAngle) * radius;
    camera.position.z = this.Math.cos(this.cameraAngle()) * horizontalRadius;

    camera.lookAt(this.cameraTarget);
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

      const isOccluded = firstIntersection !== undefined && firstIntersection.distance < distanceToHotspot;

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
}
