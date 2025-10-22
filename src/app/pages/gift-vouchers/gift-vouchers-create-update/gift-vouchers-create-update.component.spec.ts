import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GiftVouchersCreateUpdateComponent } from './gift-vouchers-create-update.component';

describe('GiftVouchersCreateUpdateComponent', () => {
  let component: GiftVouchersCreateUpdateComponent;
  let fixture: ComponentFixture<GiftVouchersCreateUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GiftVouchersCreateUpdateComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GiftVouchersCreateUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
