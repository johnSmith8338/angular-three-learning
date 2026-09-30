import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { beforeRender, extend, NgtArgs, NgtThreeEvent } from 'angular-three';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';

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
  private readonly mesh = viewChild.required<ElementRef<Mesh>>('mesh');
  private readonly groupB = viewChild.required<ElementRef<Group>>('groupB');

  readonly green = 0x00ff00; // или можно прямо в шаблоне вместо 'green' использовать #00ff00
  readonly Math = Math;
  readonly rotationSpeed = signal(1); // скорость 1 радиан/секунду
  readonly groupRotationSpeed = signal(1);
  readonly hovered = signal<'left' | 'center' | 'right' | null>(null);
  readonly selected = signal(false);
  readonly markerPosition = signal<[number, number, number] | null>(null);
  readonly screenPosition = signal<[number, number] | null>(null);
  readonly cameraRotationSpeed = signal(0.5);
  private readonly cameraTarget = new Vector3(0, 0, 0);

  readonly cameraAngle = input(0);
  readonly cameraVerticalAngle = input(0);
  readonly screenPositionChange = output<[number, number] | null>();

  constructor() {
    // beforeRender(({ delta }) => {
    //   const group = this.group().nativeElement;
    //   const speed = this.groupRotationSpeed();

    //   group.rotation.y += speed * delta;
    //   /**
    //    * delta - это время, прошедшее с предыдущего кадра
    //    * 120 FPS → delta ≈ 0.0083
    //    * 60 FPS  → delta ≈ 0.0167
    //    * 30 FPS  → delta ≈ 0.0333
    //    * расчет скорости: 0.0167 × 60 FPS ≈ 1 и 0.0083 × 120 FPS ≈ 1
    //    */
    // })

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
      const position = this.markerPosition();
      if (!position) return;

      const group = this.groupB().nativeElement;
      const point = new Vector3(
        position[0],
        position[1],
        position[2]
      )

      // local groupB to world
      group.localToWorld(point);

      // world to ndc (normalized device coordinates)
      point.project(camera);

      // ndc to pixels
      const xSpot = (point.x + 1) / 2 * size.width;
      const ySpot = (1 - point.y) / 2 * size.height;
      const screenPosition: [number, number] = [
        xSpot, ySpot
      ]

      this.screenPosition.set(screenPosition);
      this.screenPositionChange.emit(screenPosition);
    })
  }

  onCubePointerMove(event: NgtThreeEvent<PointerEvent>) {
    const point = event.point.clone();

    const group = this.groupB().nativeElement;

    group.worldToLocal(point);

    this.markerPosition.set([
      point.x,
      point.y,
      point.z,
    ]);
  }
}
