import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseUserTransferComponent } from './course-user-transfer.component';

describe('CourseUserTransferComponent', () => {
  let component: CourseUserTransferComponent;
  let fixture: ComponentFixture<CourseUserTransferComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CourseUserTransferComponent]
    });
    fixture = TestBed.createComponent(CourseUserTransferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
