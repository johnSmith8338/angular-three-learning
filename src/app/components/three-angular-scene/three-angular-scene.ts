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

  private cameraAngle = 0;
  private targetCameraAngle = 0;

  readonly pointerX = input(0);
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

    beforeRender(({ camera, size, delta }) => {
      // camera.lookAt(0, 0, 0);

      // const position = this.markerPosition();
      // if (!position) return;

      // const group = this.groupB().nativeElement;
      // const point = new Vector3(
      //   position[0],
      //   position[1],
      //   position[2]
      // )

      // // local groupB to world
      // group.localToWorld(point);

      // // world to ndc (normalized device coordinates)
      // point.project(camera);

      // // ndc to pixels
      // const x = (point.x + 1) / 2 * size.width;
      // const y = (1 - point.y) / 2 * size.height;

      // this.screenPosition.set([x, y]);
      // this.screenPositionChange.emit([x, y]);

      const x = this.pointerX();

      this.targetCameraAngle = x * this.Math.PI / 2;

      this.cameraAngle += (this.targetCameraAngle - this.cameraAngle) * 0.08;

      const radius = 5;
      const height = 2;

      camera.position.x = this.Math.sin(this.cameraAngle) * radius;
      camera.position.z = this.Math.cos(this.cameraAngle) * radius;
      camera.position.y = height;

      camera.lookAt(this.cameraTarget);
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
