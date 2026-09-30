import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, input, viewChild } from '@angular/core';
import { beforeRender, extend, NgtArgs } from 'angular-three';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
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

  readonly green = 0x00ff00; // или можно прямо в шаблоне вместо 'green' использовать #00ff00
  readonly Math = Math;

  readonly hotspots = input.required<Hotspot[]>();
  readonly hotspotElements = input<readonly ElementRef<HTMLButtonElement>[]>([]);

  readonly cameraAngle = input(0);
  readonly cameraVerticalAngle = input(0);

  private readonly cameraTarget = new Vector3(0, 0, 0);

  constructor() {
    beforeRender(({ camera, size }) => {
      /**
       * работа с камерой
       */
      const radius = 5;
      const verticalAngle = this.cameraVerticalAngle();

      const horizontalRadius = this.Math.cos(verticalAngle) * radius;

      camera.position.x = this.Math.sin(this.cameraAngle()) * horizontalRadius;
      camera.position.y = this.Math.sin(verticalAngle) * radius;
      camera.position.z = this.Math.cos(this.cameraAngle()) * horizontalRadius;

      camera.lookAt(this.cameraTarget);

      /**
       * работа с указателем мыши на объект
       */
      const group = this.groupB().nativeElement;

      const elements = this.hotspotElements();

      this.hotspots().forEach((hotspot, index) => {
        const element = elements[index]?.nativeElement;
        if (!element) return;

        const point = new Vector3(
          hotspot.position[0],
          hotspot.position[1],
          hotspot.position[2]
        )

        // local groupB to world
        group.localToWorld(point);

        // world to ndc (normalized device coordinates)
        point.project(camera);

        // ndc to pixels
        const x = (point.x + 1) / 2 * size.width;
        const y = (1 - point.y) / 2 * size.height;

        element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%,-50%)`;
      })
    })
  }
}
