import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, effect, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { beforeRender, extend, injectStore, NgtArgs, NgtThreeEvent } from 'angular-three';
import { Box3, Camera, Color, Group, Mesh, MeshStandardMaterial, Object3D, PerspectiveCamera, Raycaster, Sphere, Vector2, Vector3 } from 'three';
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
  Vector3,
  Object3D
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
  private readonly orbitControls = viewChild.required('orbitControls');

  readonly Math = Math;

  readonly hotspots = input.required<Hotspot[]>();
  readonly hotspotElements = input<ReadonlyMap<number, HTMLButtonElement>>(new Map());

  readonly focusMode = input(false);

  readonly meshSelected = output<Hotspot>();
  readonly meshDeselected = output<void>();

  private readonly hotspotWorldPosition = new Vector3();
  private readonly hotspotNdcPosition = new Vector3();
  private readonly hotspotMeshSize = new Vector3();
  private readonly cameraWorldPosition = new Vector3();

  private readonly raycaster = new Raycaster();
  private readonly rayDirection = new Vector3();

  private readonly modelSize = new Vector3();
  private readonly modelSphere = new Sphere();

  private readonly meshBounds = new Box3();
  private readonly meshCenter = new Vector3();
  private readonly meshSphere = new Sphere();

  // анимация переключения камеры с объекта на target
  private readonly targetStart = new Vector3();
  private readonly targetEnd = new Vector3();

  private readonly cameraStart = new Vector3();
  private readonly cameraEnd = new Vector3();

  private readonly defaultCameraPosition = new Vector3();
  private readonly defaultCameraTarget = new Vector3();

  private defaultCameraSaved = false;

  readonly modelPrepared = signal(false);

  private cameraFramed = false;
  private hotspotUpdateScheduled = false;

  private targetAnimationProgress = 1;
  private targetAnimationDuration = 500;
  private targetAnimationStartTime = 0;

  private cameraAnimationProgress = 1;
  private cameraAnimationDuration = 600;
  private cameraAnimationStartTime = 0;

  readonly gltf = gltfResource(
    () => 'models/antique-camera.glb'
  );

  private hoveredMesh: Mesh | null = null;
  private selectedMesh: Mesh | null = null;

  private isFocusMode = false;

  private readonly originalMeshAppearance = new Map<Mesh, {
    emissive: Color;
    emissiveIntensity: number,
    opacity: number,
    transparent: boolean
  }>

  private readonly pointerDownPosition = new Vector2();
  private pointerDownMesh: Mesh | null = null;
  private pointerDownHotspot: Hotspot | null = null;
  private isDragging = false;
  private readonly clickThreshold = 5;

  private hoverTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingHoveredMesh: Mesh | null = null;
  private readonly hoverDelay = 250;

  private readonly modelCenterNdc = new Vector3();

  private readonly cameraRight = new Vector3();
  private readonly cameraUp = new Vector3();
  private readonly cameraForward = new Vector3();

  private readonly panCorrection = new Vector3();

  constructor() {
    beforeRender(({ camera, size }) => {
      this.updateTargetAnimation();
      this.updateCameraAnimation();

      if (!this.cameraFramed && this.modelPrepared()) {
        this.frameCamera(camera);
        this.saveDefaultCameraState(camera);
        this.cameraFramed = true;
      }

      this.scheduleHotspotUpdate(camera, size);

      this.clampPan(camera);
    })

    effect(() => {
      const model = this.gltf.value()?.scene;
      if (!model || this.modelPrepared()) return;

      this.prepareModel(model);
    });

    effect(() => {
      const focusMode = this.focusMode();
      if (!focusMode && this.isFocusMode) this.exitFocusMode();
    })

    beforeRender((state) => {
      const mesh = this.isFocusMode ?
        this.getFocusedMesh(state.pointer, state.camera) :
        this.getHoveredMesh(state.pointer, state.camera)

      if (!mesh) {
        this.clearHoverTimer();
        this.clearMeshHighlight();
        return;
      }

      this.highlightMesh(mesh);
    });
  }

  private updateHotspots(camera: Camera, size: { width: number; height: number }) {
    const elements = this.hotspotElements();
    const model = this.gltf.value()?.scene;
    if (!model) return;

    camera.getWorldPosition(this.cameraWorldPosition);

    this.hotspots().forEach(hotspot => {
      const element = elements.get(hotspot.id);
      if (!element) return;

      const mesh = this.getMeshForHotspot(hotspot);
      if (!mesh || !this.isMeshVisible(mesh)) {
        element.style.opacity = '0';
        return;
      }

      this.getHotspotWorldPosition(hotspot);

      // world to ndc (normalized device coordinates)
      this.hotspotNdcPosition.copy(this.hotspotWorldPosition).project(camera);

      const isBehindCamera = this.hotspotNdcPosition.z < -1 || this.hotspotNdcPosition.z > 1;
      if (isBehindCamera) {
        element.style.opacity = '0';
        return;
      };

      this.rayDirection.copy(this.hotspotWorldPosition).sub(this.cameraWorldPosition).normalize();

      this.raycaster.set(this.cameraWorldPosition, this.rayDirection);

      const distanceToHotspot = this.cameraWorldPosition.distanceTo(this.hotspotWorldPosition);

      const intersections = this.raycaster.intersectObject(model, true);
      const firstIntersection = intersections.find(intersection => {
        const object = intersection.object;
        if (!(object instanceof Mesh)) return false;
        if (!this.isMeshVisible(object)) return false;

        const materials = Array.isArray(object.material) ? object.material : [object.material];
        const materialIndex = intersection.face?.materialIndex ?? 0;
        const material = materials[materialIndex];

        return !!material && material.visible && material.opacity > 0.001;
      })

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
    const mesh = this.getMeshForHotspot(hotspot);
    if (!mesh) return this.hotspotWorldPosition.set(0, 0, 0);

    this.meshBounds.setFromObject(mesh);
    this.meshBounds.getCenter(this.meshCenter);
    this.meshBounds.getSize(this.hotspotMeshSize);

    const offset = this.hotspotMeshSize.length() * 0.05;

    switch (hotspot.anchor) {
      case 'top':
        this.meshCenter.y += this.hotspotMeshSize.y / 2 + offset;
        break;
      case 'bottom':
        this.meshCenter.y -= this.hotspotMeshSize.y / 2 + offset;
        break;
      case 'left':
        this.meshCenter.x -= this.hotspotMeshSize.x / 2 + offset;
        break;
      case 'right':
        this.meshCenter.x += this.hotspotMeshSize.x / 2 + offset;
        break;
      case 'front':
        this.meshCenter.z += this.hotspotMeshSize.z / 2 + offset;
        break;
      case 'back':
        this.meshCenter.z -= this.hotspotMeshSize.z / 2 + offset;
        break;
    }

    this.hotspotWorldPosition.copy(this.meshCenter);

    return this.hotspotWorldPosition;
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

    this.modelPrepared.set(true);
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
    if (this.pendingHoveredMesh === mesh) return;

    this.clearHoverTimer();

    this.pendingHoveredMesh = mesh;

    this.hoverTimer = setTimeout(() => {
      if (this.pendingHoveredMesh !== mesh) return;

      this.pendingHoveredMesh = null;
      this.hoverTimer = null;

      if (this.isFocusMode) return;

      this.clearMeshHighlight();

      if (!(mesh.material instanceof MeshStandardMaterial)) return;

      this.rememberOriginalAppearance(mesh);

      this.hoveredMesh = mesh;

      this.applyMeshAppearance(mesh);
    }, this.hoverDelay)
  }

  private clearHoverTimer() {
    if (this.hoverTimer !== null) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }

    this.pendingHoveredMesh = null;
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

    if (this.hoveredMesh === mesh && !this.isFocusMode) {
      mesh.material.emissive.set('#ffff00');
      mesh.material.emissiveIntensity = 1;
      return;
    }

    const original = this.originalMeshAppearance.get(mesh);
    if (!original) return;

    mesh.material.emissive.copy(original.emissive);
    mesh.material.emissiveIntensity = original.emissiveIntensity;
  }

  private rememberOriginalAppearance(mesh: Mesh) {
    if (this.originalMeshAppearance.has(mesh)) return;
    if (!(mesh.material instanceof MeshStandardMaterial)) return;

    this.originalMeshAppearance.set(mesh, {
      emissive: mesh.material.emissive.clone(),
      emissiveIntensity: mesh.material.emissiveIntensity,
      opacity: mesh.material.opacity,
      transparent: mesh.material.transparent
    })
  }

  private selectMesh(mesh: Mesh) {
    if (this.isFocusMode) {
      if (this.selectedMesh === mesh) {
        this.exitFocusMode();
        this.meshDeselected.emit();
      }
      return;
    }

    const hotspot = this.getHotspotForMesh(mesh);
    if (!hotspot) {
      this.enterFocusMode(mesh);
      return;
    }

    this.enterFocusMode(mesh);
    this.meshSelected.emit(hotspot);
  }

  private enterFocusMode(mesh: Mesh) {
    this.selectedMesh = mesh;
    this.isFocusMode = true;

    this.hideOtherMeshes(mesh);
    this.applyMeshAppearance(mesh);

    const center = this.getMeshWorldCenter(mesh);
    this.animateTargetTo(center);
    this.focusCamera(mesh);
  }

  private hideOtherMeshes(selected: Mesh) {
    const model = this.gltf.value()?.scene;
    if (!model) return;

    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (!(object.material instanceof MeshStandardMaterial)) return;

      this.rememberOriginalAppearance(object);

      object.material.transparent = true;
      object.material.opacity = object === selected ? 1 : 0;
      object.material.needsUpdate = true;
    })
  }

  private restoreAllMeshes() {
    const model = this.gltf.value()?.scene;
    if (!model) return;

    model.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (!(object.material instanceof MeshStandardMaterial)) return;

      const original = this.originalMeshAppearance.get(object);
      if (!original) return;

      object.material.opacity = original.opacity;
      object.material.transparent = original.transparent;
      object.material.emissive.copy(original.emissive);
      object.material.emissiveIntensity = original.emissiveIntensity;
      object.material.needsUpdate = true;
    })
  }

  private exitFocusMode() {
    this.isFocusMode = false;

    this.restoreAllMeshes();

    this.selectedMesh = null;

    this.animateTargetTo(this.defaultCameraTarget);

    this.restoreCamera();

    if (this.hoveredMesh) this.applyMeshAppearance(this.hoveredMesh);
  }

  private getHoveredMesh(pointer: Vector2, camera: Camera): Mesh | null {
    const model = this.gltf.value()?.scene;
    if (!model) return null;

    this.raycaster.setFromCamera(pointer, camera);

    const intersection = this.raycaster.intersectObject(model, true)[0];
    if (!intersection) return null;

    return intersection.object instanceof Mesh ? intersection.object : null;
  }

  private getFocusedMesh(pointer: Vector2, camera: Camera): Mesh | null {
    if (!this.selectedMesh) return null;

    this.raycaster.setFromCamera(pointer, camera);

    const intersection = this.raycaster.intersectObject(this.selectedMesh, true)[0];
    if (!intersection) return null;

    return intersection.object instanceof Mesh ? intersection.object : null;
  }

  onModelPointerDown(event: NgtThreeEvent<PointerEvent>) {
    const object = event.object;
    if (!(object instanceof Mesh)) return;

    this.pointerDownPosition.set(
      event.nativeEvent.clientX,
      event.nativeEvent.clientY
    )

    this.pointerDownMesh = object;
    this.isDragging = false;
  }

  onModelPointerMove(event: NgtThreeEvent<PointerEvent>) {
    this.updateDragState(event);
  }

  onModelPointerUp(event: NgtThreeEvent<PointerEvent>) {
    if (!this.pointerDownMesh) return;
    if (!this.isDragging) this.selectMesh(this.pointerDownMesh);

    this.pointerDownMesh = null;
    this.isDragging = false;
  }

  private updateDragState(event: NgtThreeEvent<PointerEvent>) {
    if (!this.pointerDownMesh && !this.pointerDownHotspot) return;

    const dx = event.nativeEvent.clientX - this.pointerDownPosition.x;
    const dy = event.nativeEvent.clientY - this.pointerDownPosition.y;

    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared > this.clickThreshold ** 2) this.isDragging = true;
  }

  private getMeshWorldCenter(mesh: Mesh): Vector3 {
    this.meshBounds.setFromObject(mesh);
    this.meshBounds.getCenter(this.meshCenter);

    return this.meshCenter;
  }

  private focusCamera(mesh: Mesh) {
    const controls = this.store.controls() as OrbitControls | undefined;
    if (!controls) return;

    const camera = controls.object;

    this.meshBounds.setFromObject(mesh);
    this.meshBounds.getBoundingSphere(this.meshSphere);

    const center = this.meshSphere.center;

    this.cameraStart.copy(camera.position);

    const direction = new Vector3().copy(camera.position).sub(controls.target).normalize();

    if (!(camera instanceof PerspectiveCamera)) return;

    const verticalFov = camera.fov * Math.PI / 180;
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    const verticalDistance = this.meshSphere.radius / Math.sin(verticalFov / 2);
    const horizontalDistance = this.meshSphere.radius / Math.sin(horizontalFov / 2);

    const padding = 1.4;

    const distance = Math.max(verticalDistance, horizontalDistance) * padding;

    this.cameraEnd.copy(center).add(direction.multiplyScalar(distance));

    this.cameraAnimationProgress = 0;
    this.cameraAnimationStartTime = performance.now();
  }

  private updateCameraAnimation() {
    if (this.cameraAnimationProgress >= 1) return;

    const controls = this.store.controls() as OrbitControls | undefined;
    if (!controls) return;

    const camera = controls.object;
    const elapsed = performance.now() - this.cameraAnimationStartTime;
    const progress = Math.min(elapsed / this.cameraAnimationDuration, 1);

    const easedProgress = this.easeOutCubic(progress);

    this.cameraAnimationProgress = progress;

    camera.position.lerpVectors(this.cameraStart, this.cameraEnd, easedProgress);

    controls.update();
  }

  private saveDefaultCameraState(camera: Camera) {
    const controls = this.store.controls() as OrbitControls | undefined;
    if (!controls) return;

    this.defaultCameraPosition.copy(camera.position);
    this.defaultCameraTarget.copy(controls.target);

    this.defaultCameraSaved = true;
  }

  private restoreCamera() {
    const controls = this.store.controls() as OrbitControls | undefined;
    if (!controls || !this.defaultCameraSaved) return;

    const camera = controls.object;

    this.cameraStart.copy(camera.position);
    this.cameraEnd.copy(this.defaultCameraPosition);

    this.cameraAnimationProgress = 0;
    this.cameraAnimationStartTime = performance.now();
  }

  private getHotspotForMesh(mesh: Mesh): Hotspot | null {
    return this.hotspots().find(hotspot => hotspot.meshName === mesh.name) ?? null;
  }

  private getMeshForHotspot(hotspot: Hotspot): Mesh | null {
    const model = this.gltf.value()?.scene;
    if (!model) return null;

    const object = model.getObjectByName(hotspot.meshName);

    return object instanceof Mesh ? object : null;
  }

  zoomIn() {
    const controls = this.store.controls() as OrbitControls | undefined;
    if (!controls) return;

    controls.dollyOut(1.05);
    controls.update();
  }

  zoomOut() {
    const controls = this.store.controls() as OrbitControls | undefined;
    if (!controls) return;

    controls.dollyIn(1.05);
    controls.update();
  }

  private clampPan(camera: Camera) {
    if (this.isFocusMode) return;
    if (this.targetAnimationProgress < 1 || this.cameraAnimationProgress < 1) return;

    const controls = this.store.controls() as OrbitControls | null;
    if (!controls || !(camera instanceof PerspectiveCamera)) return;

    this.modelCenterNdc.set(0, 0, 0).project(camera);

    let correctionX = 0;
    let correctionY = 0;

    if (this.modelCenterNdc.x > 1) {
      correctionX = this.modelCenterNdc.x - 1;
    } else if (this.modelCenterNdc.x < -1) {
      correctionX = this.modelCenterNdc.x + 1;
    }

    if (this.modelCenterNdc.y > 1) {
      correctionY = this.modelCenterNdc.y - 1;
    } else if (this.modelCenterNdc.y < -1) {
      correctionY = this.modelCenterNdc.y + 1;
    }

    if (correctionX === 0 && correctionY === 0) return;

    // Размер видимой области на расстоянии controls.target
    const distance = camera.position.distanceTo(controls.target);
    const halfHeight = distance * Math.tan(camera.fov * Math.PI / 360);
    const halfWidth = halfHeight * camera.aspect;

    // Направления локальных осей камеры в мировых координатах
    camera.updateMatrixWorld();
    camera.matrixWorld.extractBasis(
      this.cameraRight,
      this.cameraUp,
      this.cameraForward
    )

    // Переводим коррекцию из NDC в мировое смещение
    this.panCorrection.copy(this.cameraRight)
      .multiplyScalar(correctionX * halfWidth)
      .addScaledVector(this.cameraUp, correctionY * halfHeight)

    // Перемещаем камеру и её target вместе
    camera.position.add(this.panCorrection);
    controls.target.add(this.panCorrection);

    controls.update();
  }

  resetCamera() {
    if (this.isFocusMode) {
      this.exitFocusMode();
      this.meshDeselected.emit();
      return;
    }

    this.animateTargetTo(this.defaultCameraTarget);
    this.restoreCamera();
  }

  private isMeshVisible(mesh: Mesh): boolean {
    let current: Object3D | null = mesh;

    // проверяем меш и его родителей
    while (current) {
      if (!current.visible) return false;
      current = current.parent;
    }

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    // меш считается видимым, если у него есть хотябы один видимый материал с ненулевой прозрачностью
    return materials.some(material => material.visible && material.opacity > 0.001);
  }
}
