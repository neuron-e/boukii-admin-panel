import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourseDetailNewComponent } from './course-detail-new.component';

describe('CourseDetailNewComponent', () => {
  let component: CourseDetailNewComponent;
  let fixture: ComponentFixture<CourseDetailNewComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CourseDetailNewComponent]
    });
    fixture = TestBed.createComponent(CourseDetailNewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
