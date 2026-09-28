import { AfterViewInit, Component, ElementRef, viewChild } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-three-scene',
  imports: [],
  templateUrl: './three-scene.html',
  styleUrl: './three-scene.scss',
})
export class ThreeScene implements AfterViewInit {
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  ngAfterViewInit(): void {
    const canvas = this.canvas().nativeElement;

    const renderer = new THREE.WebGLRenderer({
      canvas,
    })

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    )

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )

    camera.position.set(3, 2, 5);
    camera.lookAt(0, 0, 0);

    const geometry = new THREE.BoxGeometry();

    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      roughness: 0.3,
      metalness: 0.2
    })

    const cube = new THREE.Mesh(
      geometry,
      material
    )

    cube.position.set(0, 0, 0);

    scene.add(cube);

    /** for triangle */
    // const geometry = new THREE.BufferGeometry();

    // const vertices = new Float32Array([
    //   -1, -1, 0,
    //   1, -1, 0,
    //   0, 1, 0
    // ])

    // const normals = new Float32Array([
    //   0, 0, 1,
    //   0, 0, 1,
    //   0, 0, 1
    // ])

    // geometry.setAttribute(
    //   'position',
    //   new THREE.BufferAttribute(
    //     vertices,
    //     3
    //   )
    // )

    // geometry.setAttribute(
    //   'normal',
    //   new THREE.BufferAttribute(
    //     normals,
    //     3
    //   )
    // )

    // const material = new THREE.MeshBasicMaterial({
    //   color: 0x00ff00,
    //   side: THREE.DoubleSide
    // })

    // const triangle = new THREE.Mesh(
    //   geometry,
    //   material
    // )

    // scene.add(triangle);

    // renderer.render(scene, camera);

    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      2
    )

    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      0.2
    )

    directionalLight.position.set(2, 3, 5);

    scene.add(
      ambientLight,
      directionalLight
    );

    function animate(): void {
      requestAnimationFrame(animate);

      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;

      renderer.render(scene, camera);
    }

    animate();
  }
}
