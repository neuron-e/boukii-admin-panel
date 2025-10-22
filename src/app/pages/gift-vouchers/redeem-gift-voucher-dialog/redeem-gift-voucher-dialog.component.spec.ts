import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RedeemGiftVoucherDialogComponent } from './redeem-gift-voucher-dialog.component';

describe('RedeemGiftVoucherDialogComponent', () => {
  let component: RedeemGiftVoucherDialogComponent;
  let fixture: ComponentFixture<RedeemGiftVoucherDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RedeemGiftVoucherDialogComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RedeemGiftVoucherDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
