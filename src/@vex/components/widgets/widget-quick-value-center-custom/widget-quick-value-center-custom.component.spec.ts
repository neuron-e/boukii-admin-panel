import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { WidgetQuickValueCenterCustomComponent } from './widget-quick-value-center-custom.component';

describe('WidgetQuickValueCenterCustomComponent', () => {
  let component: WidgetQuickValueCenterCustomComponent;
  let fixture: ComponentFixture<WidgetQuickValueCenterCustomComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [WidgetQuickValueCenterCustomComponent]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WidgetQuickValueCenterCustomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
