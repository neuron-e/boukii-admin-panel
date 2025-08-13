import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingDetailDialogComponent } from './booking-dialog.component';

describe('BookingDetailDialogComponent', () => {
  let component: BookingDetailDialogComponent;
  let fixture: ComponentFixture<BookingDetailDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BookingDetailDialogComponent]
    });
    fixture = TestBed.createComponent(BookingDetailDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
