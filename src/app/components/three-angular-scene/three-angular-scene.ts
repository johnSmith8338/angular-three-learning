import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, effect, ElementRef, input, output, viewChild } from '@angular/core';
import { beforeRender, extend, injectStore, NgtArgs, NgtThreeEvent } from 'angular-three';
import { Box3, Camera, Color, Group, Mesh, MeshStandardMaterial, PerspectiveCamera, Raycaster, Sphere, Vector2, Vector3 } from 'three';
import { Hotspot } from '../../models/hotspot.interface';
import { NgtsOrbitControls } from 'angular-three-soba/controls';
import { OrbitControls } from 'three-stdlib';
import { gltfResource } from 'angular-three-soba/loaders';

extend({
  Box3,
  Camera,
  Group,
  PerspectiveCamera,
  Raycaster,
  Sphere,
  Vector3
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

  private readonly modelRoot = viewChild.required<ElementRef<Group>>('modelRoot');

  readonly Math = Math;

  readonly hotspots = input.required<Hotspot[]>();
  readonly hotspotElements = input<ReadonlyMap<number, HTMLButtonElement>>(new Map());

  readonly selectedHotspotId = input<number | null>(null);
  readonly hoveredHotspotId = input<number | null>(null);

  readonly hotspotSelected = output<Hotspot>();
  readonly hotspotDeselected = output<void>();

  readonly hotspotPointerEnter = output<Hotspot>();
  readonly hotspotPointerLeave = output<void>();

  private readonly hotspotWorldPosition = new Vector3();
  private readonly hotspotNdcPosition = new Vector3();
  private readonly cameraWorldPosition = new Vector3();

  private readonly raycaster = new Raycaster();
  private readonly rayDirection = new Vector3();

  private readonly modelSize = new Vector3();
  private readonly modelSphere = new Sphere();

  private readonly sceneCenter = new Vector3(0, 0, 0);

  // анимация переключения камеры с объекта на target
  private readonly targetStart = new Vector3();
  private readonly targetEnd = new Vector3();

  private modelPrepared = false;
  private cameraFramed = false;
  private hotspotUpdateScheduled = false;

  private targetAnimationProgress = 1;
  private targetAnimationDuration = 500;
  private targetAnimationStartTime = 0;

  readonly gltf = gltfResource(
    () => '/models/antique-camera.glb'
  );

  private hoveredMesh: Mesh | null = null;
  private selectedMesh: Mesh | null = null;
  private pointerDownMesh: Mesh | null = null;

  private readonly originalMeshAppearence = new Map<Mesh, {
    emissive: Color;
    emissiveIntensity: number
  }>

  constructor() {
    beforeRender(({ camera, size }) => {
      this.updateTargetAnimation();

      if (!this.cameraFramed && this.modelPrepared) {
        this.frameCamera(camera);
        this.cameraFramed = true;
      }

      this.scheduleHotspotUpdate(camera, size);
    })

    effect(() => {
      const model = this.gltf.value()?.scene;
      if (!model || this.modelPrepared) return;

      this.prepareModel(model);
    });

    beforeRender((state) => {
      const model = this.gltf.value()?.scene;
      if (!model) return;

      state.raycaster.setFromCamera(
        state.pointer,
        state.camera,
      );

      const intersection = state.raycaster.intersectObject(model, true,)[0];

      if (!intersection) {
        this.clearMeshHighlight();
        return;
      }

      const object = intersection.object;

      if (!(object instanceof Mesh)) {
        this.clearMeshHighlight();
        return;
      }

      this.highlightMesh(object);
    });
  }

  private updateHotspots(camera: Camera, size: { width: number; height: number }) {
    const modelRoot = this.modelRoot().nativeElement;
    const elements = this.hotspotElements();
    const model = this.gltf.value()?.scene;
    if (!model) return;

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
      modelRoot.localToWorld(this.hotspotWorldPosition);

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

    this.modelRoot().nativeElement.localToWorld(this.hotspotWorldPosition);

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

  onHotspotPointerEnter(hotspot: Hotspot): void {
    this.hotspotPointerEnter.emit(hotspot);
  }

  onHotspotPointerLeave(): void {
    this.hotspotPointerLeave.emit();
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

  private prepareModel(model: Group) {
    const root = this.modelRoot().nativeElement;

    // определяем исходный размер
    const box = new Box3().setFromObject(model);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());

    const targetHeight = 2;
    const scale = targetHeight / size.y;

    root.scale.setScalar(scale);

    // пересчитываем центр с учетом масштаба
    root.position.set(
      -center.x * scale,
      -center.y * scale,
      -center.z * scale,
    );

    this.modelSize.copy(size).multiplyScalar(scale);

    const modelRadius = this.modelSize.length() / 2;

    this.modelSphere.radius = modelRadius;
    this.modelSphere.center.set(0, 0, 0);

    this.modelPrepared = true;
  }

  private frameCamera(camera: Camera) {
    if (!(camera instanceof PerspectiveCamera)) return;

    const radius = this.modelSphere.radius;

    const verticalFov = camera.fov * Math.PI / 180;
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);

    const verticalDistance = radius / Math.sin(verticalFov / 2);
    const horizontalDistance = radius / Math.sin(horizontalFov / 2);
    const distance = Math.max(verticalDistance, horizontalDistance);

    const padding = 1.2;

    const finalDistance = distance * padding;

    camera.position.set(0, 0, finalDistance);
    camera.near = finalDistance / 100;
    camera.far = finalDistance * 100;

    camera.updateProjectionMatrix();

    const controls = this.store.controls() as OrbitControls | undefined;

    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    } else {
      camera.lookAt(0, 0, 0);
    }
  }

  private highlightMesh(mesh: Mesh): void {
    if (this.hoveredMesh === mesh) return;

    this.clearMeshHighlight();

    if (!(mesh.material instanceof MeshStandardMaterial)) return;

    this.rememberOriginalAppearance(mesh);

    this.hoveredMesh = mesh;

    this.applyMeshAppearance(mesh);
  }

  private clearMeshHighlight(): void {
    if (!this.hoveredMesh) return;

    const mesh = this.hoveredMesh;

    this.hoveredMesh = null;

    this.applyMeshAppearance(mesh);
  }

  private applyMeshAppearance(mesh: Mesh) {
    if (!(mesh.material instanceof MeshStandardMaterial)) return;

    this.rememberOriginalAppearance(mesh);

    if (this.selectedMesh === mesh) {
      mesh.material.emissive.set('#00ff00');
      mesh.material.emissiveIntensity = 1;
      return;
    }

    if (this.hoveredMesh === mesh) {
      mesh.material.emissive.set('#ffff00');
      mesh.material.emissiveIntensity = 1;
      return;
    }

    const original = this.originalMeshAppearence.get(mesh);
    if (!original) return;

    mesh.material.emissive.copy(original.emissive);
    mesh.material.emissiveIntensity = original.emissiveIntensity;
  }

  private rememberOriginalAppearance(mesh: Mesh) {
    if (this.originalMeshAppearence.has(mesh)) return;
    if (!(mesh.material instanceof MeshStandardMaterial)) return;

    this.originalMeshAppearence.set(mesh, {
      emissive: mesh.material.emissive.clone(),
      emissiveIntensity: mesh.material.emissiveIntensity
    })
  }

  private selectMesh(mesh: Mesh) {
    if (this.selectedMesh === mesh) {
      this.deselectMesh();
      return;
    }

    if (this.selectedMesh) {
      const previousMesh = this.selectedMesh;
      this.selectedMesh = null;
      this.applyMeshAppearance(previousMesh);
    }

    this.rememberOriginalAppearance(mesh);
    this.selectedMesh = mesh;
    this.applyMeshAppearance(mesh);
  }

  private deselectMesh() {
    if (!this.selectedMesh) return;

    const mesh = this.selectedMesh;
    this.selectedMesh = null;
    this.applyMeshAppearance(mesh);
  }

  private getMeshUnderPoint(pointer: Vector2, camera: Camera, model: Group): Mesh | null {
    this.raycaster.setFromCamera(pointer, camera);

    const intersection = this.raycaster.intersectObject(model, true)[0];
    if (!intersection) return null;
    if (!(intersection.object instanceof Mesh)) return null;

    return intersection.object;
  }

  onModelPointerDown(event: NgtThreeEvent<PointerEvent>) {
    const object = event.object;
    if (!(object instanceof Mesh)) return;

    this.selectMesh(object);
  }
}
