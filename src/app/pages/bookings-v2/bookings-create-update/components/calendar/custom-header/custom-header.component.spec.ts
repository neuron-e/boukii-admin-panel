import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomHeader } from './custom-header.component';

describe('CustomHeader', () => {
  let component: CustomHeader;
  let fixture: ComponentFixture<CustomHeader>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CustomHeader]
    });
    fixture = TestBed.createComponent(CustomHeader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
