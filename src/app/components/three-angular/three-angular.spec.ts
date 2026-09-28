import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreeAngular } from './three-angular';

describe('ThreeAngular', () => {
  let component: ThreeAngular;
  let fixture: ComponentFixture<ThreeAngular>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThreeAngular],
    }).compileComponents();

    fixture = TestBed.createComponent(ThreeAngular);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
