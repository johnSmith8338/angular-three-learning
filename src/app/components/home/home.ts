import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeroScene } from '../hero-scene/hero-scene';

@Component({
  selector: 'app-home',
  imports: [HeroScene],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home { }
