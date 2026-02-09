import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { SuperadminService } from 'src/app/services/superadmin.service';

interface MonthlyBooking {
  month: string;
  total: number;
}

@Component({
  selector: 'app-superadmin-dashboard',
  templateUrl: './superadmin-dashboard.component.html',
  styleUrls: ['./superadmin-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuperadminDashboardComponent implements OnInit {
  loading = false;
  stats: any = null;
  Math = Math; // Expose Math to template
  maxMonthly = 0;

  constructor(private superadmin: SuperadminService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.fetchStats();
  }

  fetchStats(): void {
    this.loading = true;
    this.superadmin.getDashboard().subscribe({
      next: ({ data }) => {
        this.stats = data;
        this.maxMonthly = this.getMaxMonthly(data?.monthly_bookings);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  trackByMonth(_: number, item: MonthlyBooking) {
    return item.month;
  }

  private getMaxMonthly(items: MonthlyBooking[] | null | undefined): number {
    if (!items?.length) {
      return 0;
    }
    return items.reduce((max, item) => Math.max(max, item?.total ?? 0), 0);
  }
}
