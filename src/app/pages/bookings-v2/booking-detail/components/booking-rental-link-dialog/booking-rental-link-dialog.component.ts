import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-booking-rental-link-dialog',
  templateUrl: './booking-rental-link-dialog.component.html',
  styleUrls: ['./booking-rental-link-dialog.component.scss']
})
export class BookingRentalLinkDialogComponent {
  selectedReservationId: number | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { rentals: any[] },
    private readonly dialogRef: MatDialogRef<BookingRentalLinkDialogComponent>
  ) {}

  selectReservation(reservationId: number): void {
    this.selectedReservationId = reservationId;
  }

  confirm(): void {
    this.dialogRef.close(this.selectedReservationId);
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
