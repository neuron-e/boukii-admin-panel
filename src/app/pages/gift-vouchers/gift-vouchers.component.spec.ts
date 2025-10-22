import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GiftVouchersComponent } from './gift-vouchers.component';

describe('GiftVouchersComponent', () => {
  let component: GiftVouchersComponent;
  let fixture: ComponentFixture<GiftVouchersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GiftVouchersComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GiftVouchersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
