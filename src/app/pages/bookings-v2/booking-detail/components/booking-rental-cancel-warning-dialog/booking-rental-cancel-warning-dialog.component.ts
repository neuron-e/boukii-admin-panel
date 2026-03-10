import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export type BookingRentalCancelAction = 'booking_only' | 'booking_and_rentals' | 'abort';

@Component({
  selector: 'app-booking-rental-cancel-warning-dialog',
  templateUrl: './booking-rental-cancel-warning-dialog.component.html',
  styleUrls: ['./booking-rental-cancel-warning-dialog.component.scss']
})
export class BookingRentalCancelWarningDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { rentals: any[] },
    private readonly dialogRef: MatDialogRef<BookingRentalCancelWarningDialogComponent>
  ) {}

  choose(action: BookingRentalCancelAction): void {
    this.dialogRef.close(action);
  }
}
