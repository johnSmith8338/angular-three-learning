import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreeAngularScene } from './three-angular-scene';

describe('ThreeAngularScene', () => {
  let component: ThreeAngularScene;
  let fixture: ComponentFixture<ThreeAngularScene>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreeAngularScene],
    }).compileComponents();

    fixture = TestBed.createComponent(ThreeAngularScene);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
