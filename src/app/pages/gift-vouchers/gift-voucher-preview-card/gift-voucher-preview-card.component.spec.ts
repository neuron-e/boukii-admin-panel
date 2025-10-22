import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GiftVoucherPreviewCardComponent } from './gift-voucher-preview-card.component';

describe('GiftVoucherPreviewCardComponent', () => {
  let component: GiftVoucherPreviewCardComponent;
  let fixture: ComponentFixture<GiftVoucherPreviewCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GiftVoucherPreviewCardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GiftVoucherPreviewCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
