import { AfterViewInit, Component, createEnvironmentInjector, DestroyRef, effect, EnvironmentInjector, inject, signal, viewChild, ViewContainerRef } from '@angular/core';
import { ThreeAngular } from '../three-angular/three-angular';

@Component({
  selector: 'app-hero-scene',
  imports: [],
  templateUrl: './hero-scene.html',
  styleUrl: './hero-scene.scss',
})
export class HeroScene implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly parentInvironmentInjection = inject(EnvironmentInjector);

  readonly sceneHost = viewChild.required('sceneHost', { read: ViewContainerRef });

  private readonly sceneInctance = signal<ThreeAngular | null>(null);
  readonly sceneReady = signal(false);
  readonly loadFailed = signal(false);

  private sceneEnvironmentInjector: EnvironmentInjector | null = null;
  private readyFrame = 0;

  constructor() {
    effect(() => {
      const scene = this.sceneInctance();
      if (!scene) return;

      if (scene.modelError()) {
        this.loadFailed.set(true);
        return;
      }

      if (!scene.modelLoading() && !this.sceneReady()) {
        this.readyFrame = requestAnimationFrame(() => {
          this.readyFrame = requestAnimationFrame(() => {
            if (!this.destroyRef.destroyed) {
              this.sceneReady.set(true);
            }
          })
        })
      }
    })

    this.destroyRef.onDestroy(() => {
      cancelAnimationFrame(this.readyFrame);
      this.sceneEnvironmentInjector?.destroy();
    })
  }

  ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      void this.loadScene();
    })
  }

  private async loadScene(): Promise<void> {
    try {
      const [
        { provideNgtRenderer },
        { ThreeAngular }
      ] = await Promise.all([
        import('angular-three/dom'),
        import('../three-angular/three-angular')
      ])

      if (this.destroyRef.destroyed) return;

      this.sceneEnvironmentInjector = createEnvironmentInjector(
        [provideNgtRenderer()],
        this.parentInvironmentInjection
      )

      const componentRef = this.sceneHost().createComponent(
        ThreeAngular,
        { environmentInjector: this.sceneEnvironmentInjector }
      )

      this.sceneInctance.set(componentRef.instance);
    } catch (error) {
      console.error('Не удалось загрузить 3D-сцену', error);

      if (!this.destroyRef.destroyed) this.loadFailed.set(true);
    }
  }
}
