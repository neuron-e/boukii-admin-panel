import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RentalService } from 'src/service/rental.service';

@Component({
  selector: 'vex-client-detail-v2',
  templateUrl: './client-detail-v2.component.html',
  styleUrls: ['./client-detail-v2.component.scss']
})
export class ClientDetailV2Component implements OnInit {
  user: any;
  id: any;
  mainId: any;

  // Rental history tab
  rentalEnabled = false;
  rentalReservations: any[] = [];
  rentalLoading = false;
  rentalPage = 1;
  rentalTotal = 0;
  rentalLastPage = 1;
  readonly rentalPerPage = 20;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private rentalService: RentalService
  ) {}

  ngOnInit(): void {
    this.user = JSON.parse(localStorage.getItem('boukiiUser') ?? 'null');
    this.id = this.activatedRoute.snapshot.params['id'];
    this.mainId = this.id;
    this.rentalService.getPolicy().subscribe({
      next: (res: any) => {
        this.rentalEnabled = !!(res?.data?.enabled);
        if (this.rentalEnabled) this.loadRentalHistory();
      },
      error: () => { this.rentalEnabled = false; }
    });
  }

  getInitialData() {
    // Placeholder for future data loading
  }

  loadRentalHistory(): void {
    if (!this.id) return;
    this.rentalLoading = true;
    this.rentalService.getClientRentals(Number(this.id), { page: this.rentalPage, per_page: this.rentalPerPage }).subscribe({
      next: (response: any) => {
        const payload = response?.data ?? response ?? {};
        this.rentalReservations = payload?.data ?? [];
        this.rentalTotal = payload?.meta?.total ?? this.rentalReservations.length;
        this.rentalLastPage = payload?.meta?.last_page ?? 1;
        this.rentalLoading = false;
      },
      error: () => {
        this.rentalReservations = [];
        this.rentalLoading = false;
      }
    });
  }

  openRentalDetail(reservation: any): void {
    this.router.navigate(['/rentals'], { queryParams: { reservation_id: reservation.id } });
  }

  rentalNextPage(): void {
    if (this.rentalPage < this.rentalLastPage) {
      this.rentalPage++;
      this.loadRentalHistory();
    }
  }

  rentalPrevPage(): void {
    if (this.rentalPage > 1) {
      this.rentalPage--;
      this.loadRentalHistory();
    }
  }
}
