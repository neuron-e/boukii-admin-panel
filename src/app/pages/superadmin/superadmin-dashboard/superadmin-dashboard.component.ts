import { Component, OnInit } from '@angular/core';
import { SuperadminService } from 'src/app/services/superadmin.service';

interface MonthlyBooking {
  month: string;
  total: number;
}

@Component({
  selector: 'app-superadmin-dashboard',
  templateUrl: './superadmin-dashboard.component.html',
  styleUrls: ['./superadmin-dashboard.component.scss']
})
export class SuperadminDashboardComponent implements OnInit {
  loading = false;
  stats: any = null;
  Math = Math; // Expose Math to template

  constructor(private superadmin: SuperadminService) {}

  ngOnInit(): void {
    this.fetchStats();
  }

  fetchStats(): void {
    this.loading = true;
    this.superadmin.getDashboard().subscribe({
      next: ({ data }) => {
        this.stats = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  trackByMonth(_: number, item: MonthlyBooking) {
    return item.month;
  }
}
