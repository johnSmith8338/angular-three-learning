import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, signal, viewChild } from '@angular/core';
import { beforeRender, extend, NgtThreeEvent } from 'angular-three';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';

extend({
  Mesh,
  BoxGeometry,
  MeshStandardMaterial,
  Group,
  Vector3
})

@Component({
  selector: 'app-three-angular-scene',
  imports: [],
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

    beforeRender(({ camera }) => {
      camera.lookAt(0, 0, 0)
    })
  }

  onPointerOver() {
    console.log('cube!');
  }

  onPointerMove(event: unknown) {
    console.log(event);
  }

  onClick(event: unknown) {
    // this.selected.update(v => !v);
    console.log(event);
  }

  onCubeClick(event: any) {
    const point = event.point;

    this.markerPosition.set([
      point.x,
      point.y,
      point.z
    ])
  }

  onCubePointerMove(event: NgtThreeEvent<PointerEvent>) {
    const point = event.point.clone();

    const group = this.groupB().nativeElement;

    console.log('WORLD:', point.clone());

    group.worldToLocal(point);

    console.log('LOCAL GROUP B:', point);

    this.markerPosition.set([
      point.x,
      point.y,
      point.z,
    ]);
  }

  logPositions(): void {
    const mesh = this.mesh().nativeElement;
    const group = this.groupB().nativeElement;

    const worldPosition = new Vector3();

    mesh.getWorldPosition(worldPosition);

    console.log('Cube local:', mesh.position);
    console.log('Cube world:', worldPosition);

    const testPoint = mesh.position.clone();

    group.localToWorld(testPoint);

    console.log('Group local → world:', testPoint);
  }
}
