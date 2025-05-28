import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewDeploymentPageComponent } from './new-deployment-page.component';

describe('NewDeploymentPageComponent', () => {
  let component: NewDeploymentPageComponent;
  let fixture: ComponentFixture<NewDeploymentPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewDeploymentPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewDeploymentPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
