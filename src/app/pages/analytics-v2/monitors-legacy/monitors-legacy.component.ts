// =============== MONITORS LEGACY COMPONENT ===============
// Archivo: src/app/components/analytics/monitors-legacy/monitors-legacy.component.ts

import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ApiCrudService } from '../../../../service/crud.service';
import { TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import Plotly from 'plotly.js-dist-min';

interface MonitorLegacyData {
  monitor: string;
  sport: string;
  hours_collective: number;
  hours_private: number;
  hours_activities: number;
  hours_nwd_payed: number;
  hour_price: number;
  total_hours: number;
  total_cost: number;
  monitor_id?: number; // Añadido para el detalle
}

interface MonitorDetailData {
  id: number;
  date: string;
  first_name: string;
  hours_collective: string;
  hours_private: string;
  hours_activities: string;
  hours_nwd: string;
  hours_nwd_payed: string;
  cost_collective: number;
  cost_private: number;
  cost_activities: number;
  cost_nwd: number;
  total_cost: number;
  total_hours: string;
  hour_price: number;
  sport: {
    id: number;
    name: string;
    icon_prive: string;
  };
  image?: string;
  currency: string;
}

interface MonitorKPIs {
  totalWorkedHours: number;
  totalNwdHours: number;
  totalBookingHours: number;
  totalMonitorHours: number;
  busy: number;
  total: number;
  totalPriceSell: number;
}

@Component({
  selector: 'app-monitors-legacy',
  template: `
    <!-- ==================== LOADING STATE ==================== -->
    <div *ngIf="loading" class="loading-container">
      <mat-card class="loading-card">
        <mat-card-content class="loading-content">
          <mat-spinner diameter="40"></mat-spinner>
          <h3>{{ 'loading_monitor_analysis' | translate }}</h3>
          <p>{{ 'processing_work_hours_data' | translate }}</p>
        </mat-card-content>
      </mat-card>
    </div>

    <!-- ==================== MAIN CONTENT ==================== -->
    <div *ngIf="!loading" class="monitors-legacy-container">

      <!-- ==================== KPIs SUMMARY ==================== -->
      <div class="kpis-grid">

        <!-- Monitores Activos -->
        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-content">
              <div class="kpi-info">
                <div class="kpi-value">{{ kpis.busy }}/{{ kpis.total }}</div>
                <div class="kpi-label">{{ 'active_monitors' | translate }}</div>
                <div class="kpi-change">
                  <span>{{ getOccupancyPercentage() }}% {{ 'occupancy' | translate }}</span>
                </div>
              </div>
              <mat-icon class="kpi-icon">people</mat-icon>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Total Horas Trabajadas -->
        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-content">
              <div class="kpi-info">
                <div class="kpi-value">{{ kpis.totalWorkedHours | number:'1.0-2' }}h</div>
                <div class="kpi-label">{{ 'worked_hours' | translate }}</div>
                <div class="kpi-change">
                  <span>{{ getEfficiencyPercentage() }}% {{ 'efficiency' | translate }}</span>
                </div>
              </div>
              <mat-icon class="kpi-icon">schedule</mat-icon>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Ingresos por Monitores -->
        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-content">
              <div class="kpi-info">
                <div class="kpi-value">{{ formatCurrency(getTotalFilteredCost()) }}</div>
                <div class="kpi-label">{{ 'monitor_income' | translate }}</div>
                <div class="kpi-change">
                  <span>{{ getAverageHourlyRate() }} {{ currency }}/{{ 'average_hour' | translate }}</span>
                </div>
              </div>
              <mat-icon class="kpi-icon">monetization_on</mat-icon>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Distribución de Horas -->
        <mat-card class="kpi-card">
          <mat-card-content>
            <div class="kpi-content">
              <div class="kpi-info">
                <div class="kpi-value">{{ getTotalBookingHours() }}h</div>
                <div class="kpi-label">{{ 'course_hours' | translate }}</div>
                <div class="kpi-change">
                  <span>+{{ kpis.totalNwdHours | number:'1.0-2'}}h {{ 'blockages' | translate }}</span>
                </div>
              </div>
              <mat-icon class="kpi-icon">school</mat-icon>
            </div>
          </mat-card-content>
        </mat-card>

      </div>

      <!-- ==================== CHARTS SECTION ==================== -->
      <div class="charts-grid">

        <!-- Distribución de Horas por Tipo -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>{{ 'hours_distribution_by_type' | translate }}</mat-card-title>
            <mat-card-subtitle>{{ 'temporal_activities_analysis' | translate }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div id="hoursTypeChart" class="chart-container"></div>
          </mat-card-content>
        </mat-card>

        <!-- Horas por Deporte -->
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>{{ 'hours_by_sport' | translate }}</mat-card-title>
            <mat-card-subtitle>{{ 'trends_by_specialty' | translate }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div id="hoursSportChart" class="chart-container"></div>
          </mat-card-content>
        </mat-card>

      </div>

      <!-- ==================== DETAILED TABLE ==================== -->
      <mat-card class="table-card">
        <mat-card-header>
          <mat-card-title>{{ 'detailed_monitor_analysis' | translate }}</mat-card-title>
          <mat-card-subtitle>{{ monitorsData.length }} {{ 'monitors_analyzed' | translate }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>

          <!-- Table Filters -->
          <div class="table-filters">
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>{{ 'search_monitor' | translate }}</mat-label>
              <input matInput [(ngModel)]="searchFilter" (input)="applyTableFilter()">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>{{ 'filter_by_sport' | translate }}</mat-label>
              <mat-select [(ngModel)]="sportFilter" (selectionChange)="applyTableFilter()">
                <mat-option value="">{{ 'all_sports' | translate }}</mat-option>
                <mat-option *ngFor="let sport of availableSports" [value]="sport">
                  {{ sport }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Data Table -->
          <table mat-table [dataSource]="filteredMonitorsData" class="monitors-table" matSort *ngIf="!selectedMonitor">

            <!-- Monitor Column -->
            <ng-container matColumnDef="monitor">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'monitor' | translate }}</th>
              <td mat-cell *matCellDef="let row" class="monitor-cell">
                <div class="monitor-info">
                  <span class="monitor-name">{{ row.monitor }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Sport Column -->
            <ng-container matColumnDef="sport">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'sport' | translate }}</th>
              <td mat-cell *matCellDef="let row">
                <mat-chip class="sport-chip">{{ row.sport }}</mat-chip>
              </td>
            </ng-container>

            <!-- Hours Collective -->
            <ng-container matColumnDef="hours_collective">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'collective_hours_abbr' | translate }}</th>
              <td mat-cell *matCellDef="let row">{{ row.hours_collective }}h</td>
            </ng-container>

            <!-- Hours Private -->
            <ng-container matColumnDef="hours_private">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'private_hours_abbr' | translate }}</th>
              <td mat-cell *matCellDef="let row">{{ row.hours_private }}h</td>
            </ng-container>

            <!-- Hours Activities -->
            <ng-container matColumnDef="hours_activities">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'activities_hours_abbr' | translate }}</th>
              <td mat-cell *matCellDef="let row">{{ row.hours_activities }}h</td>
            </ng-container>

            <!-- Hours NWD -->
            <ng-container matColumnDef="hours_nwd_payed">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'nwd_hours_abbr' | translate }}</th>
              <td mat-cell *matCellDef="let row">{{ row.hours_nwd_payed }}h</td>
            </ng-container>

            <!-- Hour Price -->
            <ng-container matColumnDef="hour_price">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'price_per_hour' | translate }}</th>
              <td mat-cell *matCellDef="let row">{{ formatCurrency(row.hour_price) }}</td>
            </ng-container>

            <!-- Total Hours -->
            <ng-container matColumnDef="total_hours">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'total_hours' | translate }}</th>
              <td mat-cell *matCellDef="let row" class="total-hours-cell">
                <strong>{{ row.total_hours }}h</strong>
              </td>
            </ng-container>

            <!-- Total Cost -->
            <ng-container matColumnDef="total_cost">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'total_cost' | translate }}</th>
              <td mat-cell *matCellDef="let row" class="total-cost-cell">
                <strong>{{ formatCurrency(row.total_cost) }}</strong>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr (click)="selectMonitor(row)" mat-row *matRowDef="let row; columns: displayedColumns;" class="monitor-row"></tr>

          </table>

          <!-- Table Footer -->
          <div class="table-footer" *ngIf="filteredMonitorsData.length > 0">
            <div class="footer-stats">
              <span>{{ filteredMonitorsData.length }} {{ 'monitors' | translate }}</span>
              <span>•</span>
              <span>{{ getTotalFilteredHours() }}h {{ 'total_lowercase' | translate }}</span>
              <span>•</span>
              <span>{{ formatCurrency(getTotalFilteredCost()) }} {{ 'total_cost_lowercase' | translate }}</span>
            </div>
          </div>

        </mat-card-content>
      </mat-card>

      <!-- ==================== MONITOR DETAIL SECTION ==================== -->
      <mat-card *ngIf="selectedMonitor" class="detail-card">
        <mat-card-header>
          <div class="detail-header">
            <div class="detail-title-section">
              <mat-card-title>
                <mat-icon>person</mat-icon>
                {{ 'detail_of' | translate }} {{ selectedMonitor.monitor }}
              </mat-card-title>
              <mat-card-subtitle>
                {{ monitorDetailData.length }} {{ 'days_worked' | translate }}
              </mat-card-subtitle>
            </div>
            <div class="detail-actions">
              <button mat-raised-button color="primary" (click)="exportMonitorDetail()" class="export-button" [disabled]="monitorDetailData.length === 0">
                <mat-icon>download</mat-icon>
                {{ 'export_monitor' | translate }}
              </button>
              <button mat-icon-button (click)="closeDetail()" class="close-button">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>
        </mat-card-header>
        <mat-card-content>

          <!-- Loading Detail -->
          <div *ngIf="loadingDetail" class="detail-loading">
            <mat-spinner diameter="30"></mat-spinner>
            <span>{{ 'loading_monitor_detail' | translate }}</span>
          </div>

          <!-- Empty State -->
          <div *ngIf="!loadingDetail && monitorDetailData.length === 0" class="empty-state">
            <mat-icon>event_busy</mat-icon>
            <p>{{ 'no_hours_recorded' | translate }}</p>
            <small>{{ 'monitor_no_data_message' | translate }}</small>
          </div>

          <!-- Detail Content -->
          <div *ngIf="!loadingDetail && monitorDetailData.length > 0" class="detail-content">

            <!-- Detail KPIs -->
            <div class="detail-kpis">
              <div class="detail-kpi">
                <div class="detail-kpi-value">{{ getDetailTotalHours() }}</div>
                <div class="detail-kpi-label">{{ 'total_hours' | translate }}</div>
              </div>
              <div class="detail-kpi">
                <div class="detail-kpi-value">{{ formatCurrency(getDetailTotalCost()) }}</div>
                <div class="detail-kpi-label">{{ 'total_income' | translate }}</div>
              </div>
              <div class="detail-kpi">
                <div class="detail-kpi-value">{{ getDetailAverageHourlyRate() }} {{ currency }}/h</div>
                <div class="detail-kpi-label">{{ 'average_rate' | translate }}</div>
              </div>
              <div class="detail-kpi">
                <div class="detail-kpi-value">{{ monitorDetailData.length }}</div>
                <div class="detail-kpi-label">{{ 'active_days' | translate }}</div>
              </div>
            </div>

            <!-- Detail Table -->
            <table mat-table [dataSource]="monitorDetailData" class="detail-table" matSort>

              <!-- Date Column -->
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'date' | translate }}</th>
                <td mat-cell *matCellDef="let row">
                  {{ formatDate(row.date) }}
                </td>
              </ng-container>

              <!-- Sport Column -->
              <ng-container matColumnDef="sport">
                <th mat-header-cell *matHeaderCellDef>{{ 'sport' | translate }}</th>
                <td mat-cell *matCellDef="let row">
                  <div class="sport-info">
                    <img [src]="row.sport?.icon_prive" [alt]="row.sport?.name" class="sport-icon">
                    <span>{{ row.sport?.name }}</span>
                  </div>
                </td>
              </ng-container>

              <!-- Collective Hours -->
              <ng-container matColumnDef="hours_collective">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'collective_hours_abbr' | translate }}</th>
                <td mat-cell *matCellDef="let row">{{ row.hours_collective }}</td>
              </ng-container>

              <!-- Private Hours -->
              <ng-container matColumnDef="hours_private">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'private_hours_abbr' | translate }}</th>
                <td mat-cell *matCellDef="let row">{{ row.hours_private }}</td>
              </ng-container>

              <!-- Activities Hours -->
              <ng-container matColumnDef="hours_activities">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'activities_hours_abbr' | translate }}</th>
                <td mat-cell *matCellDef="let row">{{ row.hours_activities }}</td>
              </ng-container>

              <!-- NWD Hours -->
              <ng-container matColumnDef="hours_nwd_payed">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'nwd_hours_abbr' | translate }}</th>
                <td mat-cell *matCellDef="let row">{{ row.hours_nwd_payed }}</td>
              </ng-container>

              <!-- Total Hours -->
              <ng-container matColumnDef="total_hours">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'total_hours' | translate }}</th>
                <td mat-cell *matCellDef="let row" class="total-hours-cell">
                  <strong>{{ row.total_hours }}</strong>
                </td>
              </ng-container>

              <!-- Hour Price -->
              <ng-container matColumnDef="hour_price">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'price_per_hour' | translate }}</th>
                <td mat-cell *matCellDef="let row">
                  {{ formatCurrency(row.hour_price) }}
                </td>
              </ng-container>

              <!-- Total Cost -->
              <ng-container matColumnDef="total_cost">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ 'total' | translate }}</th>
                <td mat-cell *matCellDef="let row" class="total-cost-cell">
                  <strong>{{ formatCurrency(row.total_cost) }}</strong>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="detailColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: detailColumns;" class="detail-row"></tr>

            </table>

          </div>

        </mat-card-content>
      </mat-card>

    </div>
  `,
  styleUrls: ['./monitors-legacy.component.scss']
})
export class MonitorsLegacyComponent implements OnInit, OnDestroy {

  // ==================== INPUTS ====================
  @Input() filterForm!: FormGroup;
  @Input() user: any;
  @Input() currency: string = 'CHF';

  // ==================== COMPONENT STATE ====================
  loading = false;
  loadingDetail = false;
  private destroy$ = new Subject<void>();

  // ==================== DATA PROPERTIES ====================
  monitorsData: MonitorLegacyData[] = [];
  selectedMonitor: MonitorLegacyData | null = null;
  monitorDetailData: MonitorDetailData[] = [];

  // Nuevas propiedades para almacenar las respuestas de los endpoints
  private monitorBookingsResponse: any[] = [];
  private monitorHoursResponse: any = {};
  private monitorActiveResponse: any = {};
  private monitorTotalPriceResponse: any = {};
  filteredMonitorsData: MonitorLegacyData[] = [];
  kpis: MonitorKPIs = {
    totalWorkedHours: 0,
    totalNwdHours: 0,
    totalBookingHours: 0,
    totalMonitorHours: 0,
    busy: 0,
    total: 0,
    totalPriceSell: 0
  };

  // ==================== COURSE TYPE COLORS CONFIGURATION ====================

  private readonly courseTypeColors = {
    1: '#FAC710', // Colectivo - Amarillo/Dorado
    2: '#8FD14F', // Privado - Verde
    3: '#00beff'  // Actividad - Azul
  };

  // ==================== TABLE CONFIGURATION ====================
  displayedColumns: string[] = [
    'monitor', 'sport', 'hours_collective', 'hours_private',
    'hours_activities', 'hours_nwd_payed', 'hour_price',
    'total_hours', 'total_cost'
  ];

  detailColumns: string[] = [
    'date', 'sport', 'hours_collective', 'hours_private',
    'hours_activities', 'hours_nwd_payed', 'total_hours',
    'hour_price', 'total_cost'
  ];

  // ==================== FILTERS ====================
  searchFilter = '';
  sportFilter = '';
  availableSports: string[] = [];

  // ==================== CHART DATA ====================
  hoursTypeData: any = {};
  hoursSportData: any = {};

  constructor(
    private crudService: ApiCrudService,
    private translateService: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
    this.subscribeToFilterChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== INITIALIZATION ====================

  private initializeComponent(): void {
    this.loadAllMonitorData();
  }

  // ==================== MONITOR SELECTION & DETAIL ====================

  async selectMonitor(monitor: MonitorLegacyData): Promise<void> {
    this.selectedMonitor = monitor;
    this.loadingDetail = true;
    this.monitorDetailData = [];

    try {
      await this.loadMonitorDetail(monitor.monitor_id!);
    } catch (error) {
      console.error('Error loading monitor detail:', error);
    } finally {
      this.loadingDetail = false;
      this.cdr.detectChanges();
    }
  }

  closeDetail(): void {
    this.selectedMonitor = null;
    this.monitorDetailData = [];
  }

  /**
   * Export individual monitor detail to CSV
   */
  exportMonitorDetail(): void {
    if (!this.selectedMonitor || !this.monitorDetailData || this.monitorDetailData.length === 0) {
      console.warn('⚠️ No monitor detail data available for export');
      return;
    }

    // Generate CSV content
    const csvContent = this.generateMonitorDetailCsv();
    const fileName = `monitor_${this.selectedMonitor.monitor.replace(/\s+/g, '_')}_${this.getCurrentDateString()}.csv`;

    // Download
    this.downloadCsv(csvContent, fileName);
  }

  /**
   * Generate CSV content from monitor detail data
   */
  private generateMonitorDetailCsv(): string {
    let csv = '\uFEFF'; // UTF-8 BOM for Excel compatibility

    // Get current language for date formatting
    const currentLang = this.translateService.currentLang || 'es';

    // Header info
    csv += `"${this.translateService.instant('monitor_detail_title')}"\n`;
    csv += `"${this.translateService.instant('monitor')}: ${this.selectedMonitor?.monitor || ''}"\n`;
    csv += `"${this.translateService.instant('sport')}: ${this.selectedMonitor?.sport || ''}"\n`;
    csv += `"${this.translateService.instant('export_date')}: ${new Date().toLocaleString(currentLang)}"\n`;
    csv += `"${this.translateService.instant('period')}: ${this.filterForm?.value.startDate || ''} - ${this.filterForm?.value.endDate || ''}"\n`;
    csv += `"${this.translateService.instant('total_days_worked')}: ${this.monitorDetailData.length}"\n\n`;

    // Summary KPIs
    csv += `"${this.translateService.instant('summary_uppercase')}"\n`;
    csv += `"${this.translateService.instant('total_hours')}","${this.getDetailTotalHours()}"\n`;
    csv += `"${this.translateService.instant('total_income')}","${this.formatCurrency(this.getDetailTotalCost())}"\n`;
    csv += `"${this.translateService.instant('average_rate')}","${this.getDetailAverageHourlyRate()} ${this.currency}/h"\n`;
    csv += `"${this.translateService.instant('active_days')}","${this.monitorDetailData.length}"\n\n`;

    // Column headers
    csv += `"${this.translateService.instant('date')}",`;
    csv += `"${this.translateService.instant('sport')}",`;
    csv += `"${this.translateService.instant('collective_hours_abbr')}",`;
    csv += `"${this.translateService.instant('private_hours_abbr')}",`;
    csv += `"${this.translateService.instant('activities_hours_abbr')}",`;
    csv += `"${this.translateService.instant('nwd_hours_abbr')}",`;
    csv += `"${this.translateService.instant('total_hours')}",`;
    csv += `"${this.translateService.instant('price_per_hour')}",`;
    csv += `"${this.translateService.instant('total')}"\n`;

    // Data rows
    this.monitorDetailData.forEach(row => {
      csv += `"${this.formatDate(row.date)}",`;
      csv += `"${row.sport?.name || ''}",`;
      csv += `"${row.hours_collective}",`;
      csv += `"${row.hours_private}",`;
      csv += `"${row.hours_activities}",`;
      csv += `"${row.hours_nwd_payed}",`;
      csv += `"${row.total_hours}",`;
      csv += `"${this.formatNumberForCsv(row.hour_price)}",`;
      csv += `"${this.formatNumberForCsv(row.total_cost)}"\n`;
    });

    // Totals row
    csv += '\n';
    csv += `"${this.translateService.instant('total').toUpperCase()}","","","","","","${this.getDetailTotalHours()}","","${this.formatCurrency(this.getDetailTotalCost())}"\n`;

    return csv;
  }

  /**
   * Download CSV file
   */
  private downloadCsv(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Get current date string for filename
   */
  private getCurrentDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Format number for CSV export
   */
  private formatNumberForCsv(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.00';
    }
    return value.toFixed(2);
  }

  private async loadMonitorDetail(monitorId: number): Promise<void> {
    const params = this.buildDetailQueryParams(monitorId);

    try {
      const response = await this.crudService.list(
        `/admin/statistics/bookings/monitors/${monitorId}`,
        1, 99999, 'desc', 'id',
        params
      ).toPromise();

      if (response.success && response.data) {
        this.monitorDetailData = response.data;
      }
    } catch (error) {
      console.error('Error loading monitor detail:', error);
      this.monitorDetailData = [];
    }
  }

  private buildDetailQueryParams(monitorId: number): string {
    const formValue = this.filterForm?.value || {};
    let params = `&finished=1&school_active=1&school_id=${this.user?.schools?.[0]?.id || 1}&monitor_id=${monitorId}`;

    if (formValue.startDate) {
      params += `&start_date=${formValue.startDate}`;
    }
    if (formValue.endDate) {
      params += `&end_date=${formValue.endDate}`;
    }

    // Añadir los with parameters
    params += '&with[]=sports&with[]=monitorsSchools&with[]=monitorsSchools&with[]=monitorSportsDegrees.monitorSportAuthorizedDegrees.degree';
    params += '&exclude=';

    return params;
  }

  private subscribeToFilterChanges(): void {
    this.filterForm?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadAllMonitorData();
        // Si hay un monitor seleccionado, recargar su detalle
        if (this.selectedMonitor && this.selectedMonitor.monitor_id) {
          this.selectMonitor(this.selectedMonitor);
        }
      });
  }

  /**
   * Formatear fechas con nombres de meses traducidos
   */
  private formatDateWithMonthName(dateString: string): string {
    const date = new Date(dateString);
    const month = date.toLocaleString('default', { month: 'long' }).toLowerCase();
    const year = date.getFullYear();

    // Traducir el nombre del mes
    const translatedMonth = this.translateService.instant(`months.${month}`);

    return `${translatedMonth} ${year}`;
  }

  /**
   * Procesar fechas para mostrar nombres de meses
   */
  private processDateLabels(dates: string[]): string[] {
    return dates.map(date => this.formatDateWithMonthName(date));
  }

  /**
   * Crear configuración de eje X con fechas traducidas
   */
  private createTranslatedXAxisConfig(dates: string[]) {
    const translatedLabels = this.processDateLabels(dates);

    return {
      title: this.translateService.instant('dates'),
      tickmode: 'array',
      tickvals: dates,
      ticktext: translatedLabels,
      tickangle: -45,
    };
  }

  // ==================== DATA LOADING (USING LEGACY ENDPOINTS) ====================

  private async loadAllMonitorData(): Promise<void> {
    this.loading = true;

    try {
      const coreResults = await Promise.allSettled([
        this.loadMonitorsBookings(),
        this.loadActiveMonitors(),
        this.loadTotalHours(),
        this.loadBookingsByDate(),
        this.loadHoursByDate(),
        this.loadHoursBySport()
      ]);

      const [bookings, active, hours, byDate, byCourseType, bySport] = coreResults;

      if (bookings.status === 'fulfilled') {
        this.monitorBookingsResponse = bookings.value.data;
      } else {
        console.error('Error loading monitor bookings:', bookings.reason);
        this.monitorBookingsResponse = [];
      }

      if (active.status === 'fulfilled') {
        this.monitorActiveResponse = active.value.data;
      } else {
        console.error('Error loading active monitors:', active.reason);
        this.monitorActiveResponse = {};
      }

      if (hours.status === 'fulfilled') {
        this.monitorHoursResponse = hours.value.data;
      } else {
        console.error('Error loading monitor hours:', hours.reason);
        this.monitorHoursResponse = {};
      }

      if (byCourseType.status === 'fulfilled') {
        this.hoursTypeData = byCourseType.value.data;
      } else if (byDate.status === 'fulfilled') {
        this.hoursTypeData = byDate.value.data;
      } else {
        console.error('Error loading hours by date:', byCourseType.status === 'rejected' ? byCourseType.reason : byDate.reason);
        this.hoursTypeData = {};
      }

      if (bySport.status === 'fulfilled') {
        this.hoursSportData = this.transformSportData(bySport.value.data);
      } else {
        console.error('Error loading hours by sport:', bySport.reason);
        this.hoursSportData = {};
      }

      this.processAllData();
      this.createCharts();
    } catch (error) {
      console.error('Error loading monitor data:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }

    this.loadBookingsTotal()
      .then((total) => {
        this.monitorTotalPriceResponse = total.data;
        this.processKPIs();
        this.cdr.detectChanges();
      })
      .catch((error) => {
        console.error('Error loading monitor totals:', error);
      });
  }

  private processMonitorsData(): void {
    this.monitorsData = this.monitorBookingsResponse.map(m => ({
      monitor: `${m.first_name}`,
      sport: m.sport_name || this.translateService.instant('all_sports'),
      hours_collective: m.hours_collective || 0,
      hours_private: m.hours_private || 0,
      hours_activities: m.hours_activities || 0,
      hours_nwd_payed: m.hours_nwd_payed || 0,
      hour_price: m.hour_price || 0,
      total_hours: m.total_hours || 0,
      total_cost: m.total_cost || 0,
      monitor_id: m.id // Importante: guardamos el ID para el detalle
    }));
  }

  private processKPIs(): void {
    this.kpis = {
      totalWorkedHours: this.monitorHoursResponse.totalWorkedHours || 0,
      totalNwdHours: this.monitorHoursResponse.totalNwdHours || 0,
      totalBookingHours: this.monitorHoursResponse.totalBookingHours || 0,
      totalMonitorHours: this.monitorHoursResponse.totalMonitorHours || 0,
      busy: this.monitorActiveResponse.busy || 0,
      total: this.monitorActiveResponse.total || 0,
      totalPriceSell: this.monitorTotalPriceResponse || 0
    };
  }

  private transformSportData(data: any): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    Object.values(data).forEach((entry: any) => {
      const sport = entry.sport?.name || this.translateService.instant('other_label');
      const date = entry.date || this.translateService.instant('no_date');
      const hours = entry.hours || 0;

      if (!result[date]) result[date] = {};
      result[date][sport] = hours;
    });
    return result;
  }

  private loadMonitorsBookings(): Promise<any> {
    return this.crudService.list(
      '/admin/statistics/bookings/monitors',
      1, 10000, 'desc', 'id',
      this.buildQueryParams()
    ).toPromise();
  }

  private loadActiveMonitors(): Promise<any> {
    return this.crudService.list(
      '/admin/statistics/bookings/monitors/active',
      1, 10000, 'desc', 'id',
      this.buildQueryParams()
    ).toPromise();
  }

  private loadTotalHours(): Promise<any> {
    return this.crudService.list(
      '/admin/statistics/bookings/monitors/hours',
      1, 10000, 'desc', 'id',
      this.buildQueryParams()
    ).toPromise();
  }

  private loadBookingsTotal(): Promise<any> {
    return this.crudService.list(
      '/admin/statistics/total',
      1, 10000, 'desc', 'id',
      this.buildQueryParams()
    ).toPromise();
  }

  private loadBookingsByDate(): Promise<any> {
    return this.crudService.list(
      '/admin/statistics/bookings/dates',
      1, 10000, 'desc', 'id',
      this.buildQueryParams()
    ).toPromise();
  }

  private loadHoursByDate(): Promise<any> {
    return this.crudService.list(
      '/admin/statistics/bookings/dates',
      1, 10000, 'desc', 'id',
      this.buildQueryParams() + '&group_by=course_type'
    ).toPromise();
  }

  private loadHoursBySport(): Promise<any> {
    return this.crudService.list(
      '/admin/statistics/bookings/monitors/sports',
      1, 10000, 'desc', 'id',
      this.buildQueryParams()
    ).toPromise();
  }

  // ==================== DATA PROCESSING ====================

  private processAllData(): void {
    // Procesar datos de la tabla de monitores
    this.processMonitorsData();

    // Procesar KPIs
    this.processKPIs();

    // Procesar datos de deportes disponibles
    this.processAvailableSports();

    // Aplicar filtros iniciales
    this.applyTableFilter();
  }

  private processAvailableSports(): void {
    this.availableSports = [...new Set(this.monitorsData.map(m => m.sport))];
  }

  /**
   * 🎨 Obtener color por tipo de curso
   */
  private getCourseTypeColor(courseType: number): string {
    return this.courseTypeColors[courseType] || '#3A57A7';
  }

  // ==================== UTILITY METHODS ====================

  private buildQueryParams(): string {
    const formValue = this.filterForm?.value || {};
    let params = `&school_id=${this.user?.schools?.[0]?.id || 1}`;

    if (formValue.startDate) {
      params += `&start_date=${formValue.startDate}`;
    }
    if (formValue.endDate) {
      params += `&end_date=${formValue.endDate}`;
    }
    if (formValue.sportId) {
      params += `&sport_id=${formValue.sportId}`;
    }

    return params;
  }

  // ==================== CALCULATIONS ====================

  getOccupancyPercentage(): number {
    return this.kpis.total > 0 ? Math.round((this.kpis.busy / this.kpis.total) * 100) : 0;
  }

  getEfficiencyPercentage(): number {
    return this.kpis.totalMonitorHours > 0 ?
      Math.round((this.kpis.totalWorkedHours / this.kpis.totalMonitorHours) * 100) : 0;
  }

/*  getAverageHourlyRate(): number {
    return this.kpis.totalWorkedHours > 0 ?
      Math.round(this.getTotalFilteredCost() / this.kpis.totalWorkedHours) : 0;
  }*/

  getAverageHourlyRate(): string {
    let totalMinutes = 0;
    let totalCost = 0;

    for (const monitor of this.filteredMonitorsData) {
      totalMinutes += this.parseHoursToMinutes(monitor.total_hours?.toString() ?? '0h 00m');
      totalCost += monitor.total_cost || 0;
    }

    const totalHours = totalMinutes / 60;
    const rate = totalHours > 0 ? totalCost / totalHours : 0;

    return `${rate.toFixed(2)}`;
  }

  getTotalBookingHours(): string {
    const totalMinutes = this.monitorsData.reduce((sum, m) => {
      const collective = this.parseHoursToMinutes(m.hours_collective?.toString() ?? '0h 00m');
      const privateH = this.parseHoursToMinutes(m.hours_private?.toString() ?? '0h 00m');
      const activities = this.parseHoursToMinutes(m.hours_activities?.toString() ?? '0h 00m');
      return sum + collective + privateH + activities;
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  getTotalFilteredHours(): string {
    const totalMinutes = this.filteredMonitorsData.reduce((sum, m) => {
      return sum + this.parseHoursToMinutes(m.total_hours?.toString() ?? '0h 00m');
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  getTotalFilteredCost(): number {
    return this.filteredMonitorsData.reduce((sum, m) => sum + m.total_cost, 0);
  }

  // ==================== DETAIL CALCULATIONS ====================

  getDetailTotalHours(): string {
    const totalMinutes = this.monitorDetailData.reduce((sum, day) => {
      return sum + this.parseHoursToMinutes(day.total_hours);
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  getDetailTotalCost(): number {
    return this.monitorDetailData.reduce((sum, day) => sum + day.total_cost, 0);
  }

  getDetailAverageHourlyRate(): number {
    const totalCost = this.getDetailTotalCost();
    const totalMinutes = this.monitorDetailData.reduce((sum, day) => {
      return sum + this.parseHoursToMinutes(day.total_hours);
    }, 0);

    if (totalMinutes === 0) return 0;

    const totalHours = totalMinutes / 60;
    return Math.round(totalCost / totalHours);
  }

  private parseHoursToMinutes(hoursString: string): number {
    if (!hoursString) return 0;

    const match = hoursString.match(/(\d+)h\s*(\d+)m/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      return hours * 60 + minutes;
    }

    return 0;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat(this.getLocale(), {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(this.getLocale(), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private getLocale(): string {
    const lang = this.translateService.currentLang || 'en';
    const localeMap: { [key: string]: string } = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT'
    };

    return localeMap[lang] || lang;
  }

  // ==================== TABLE FILTERING ====================

  applyTableFilter(): void {
    this.filteredMonitorsData = this.monitorsData.filter(monitor => {
      const matchesSearch = !this.searchFilter ||
        monitor.monitor.toLowerCase().includes(this.searchFilter.toLowerCase());

      const matchesSport = !this.sportFilter ||
        monitor.sport === this.sportFilter;

      return matchesSearch && matchesSport;
    });
  }

  // ==================== CHART CREATION ====================

  private createCharts(): void {
    setTimeout(() => {
      this.createHoursTypeChart();
      this.createHoursSportChart();
    }, 100);
  }

  private createHoursTypeChart(): void {
    const dates = Object.keys(this.hoursTypeData);

    const traces = [
      {
        x: dates,
        y: dates.map(date => this.hoursTypeData[date]?.[1] || 0),
        mode: 'lines+markers',
        name: this.translateService.instant('collective'),
        line: { color: this.courseTypeColors[1] } // ✅ COLOR CONSISTENTE
      },
      {
        x: dates,
        y: dates.map(date => this.hoursTypeData[date]?.[2] || 0),
        mode: 'lines+markers',
        name: this.translateService.instant('private'),
        line: { color: this.courseTypeColors[2] } // ✅ COLOR CONSISTENTE
      },
      {
        x: dates,
        y: dates.map(date => this.hoursTypeData[date]?.[3] || 0),
        mode: 'lines+markers',
        name: this.translateService.instant('activity'),
        line: { color: this.courseTypeColors[3] } // ✅ COLOR CONSISTENTE
      }
    ];

    const layout = {
      title: this.translateService.instant('hours_distribution_by_type'),
      xaxis: this.createTranslatedXAxisConfig(dates),
      yaxis: { title: this.translateService.instant('hours_label') },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      showlegend: true,
      height: 300
    };

    Plotly.newPlot('hoursTypeChart', traces, layout, { displayModeBar: false });
  }

  private createHoursSportChart(): void {
    const dates = Object.keys(this.hoursSportData);
    const sports: Record<string, number[]> = {};

    // Organizar datos por deporte
    dates.forEach(date => {
      const dayData = this.hoursSportData[date];
      Object.keys(dayData).forEach(sport => {
        if (!sports[sport]) {
          sports[sport] = [];
        }
        sports[sport].push(dayData[sport]);
      });
    });

    const traces = Object.keys(sports).map(sport => ({
      x: dates,
      y: sports[sport],
      mode: 'lines+markers',
      name: sport
    }));

    const layout = {
      title: this.translateService.instant('hours_by_sport'),
      xaxis: this.createTranslatedXAxisConfig(dates), // ✅ CAMBIO PRINCIPAL
      yaxis: { title: this.translateService.instant('hours_label') },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      showlegend: true,
      height: 300
    };

    Plotly.newPlot('hoursSportChart', traces, layout, { displayModeBar: false });
  }
}
