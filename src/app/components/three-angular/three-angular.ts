import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgtCanvas } from 'angular-three/dom';
import { ThreeAngularScene } from '../three-angular-scene/three-angular-scene';

@Component({
  selector: 'app-three-angular',
  imports: [
    NgtCanvas,
    ThreeAngularScene
  ],
  templateUrl: './three-angular.html',
  styleUrl: './three-angular.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThreeAngular { }
