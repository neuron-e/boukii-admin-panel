import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutModule } from '../../../@vex/layout/layout.module';
import { PageLayoutModule } from 'src/@vex/components/page-layout/page-layout.module';
import { BreadcrumbsModule } from 'src/@vex/components/breadcrumbs/breadcrumbs.module';
import { DashboardAnalyticsComponent } from './dashboard-analytics/dashboard-analytics.component';
import { RouterModule } from '@angular/router';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { SecondaryToolbarModule } from 'src/@vex/components/secondary-toolbar/secondary-toolbar.module';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { WidgetLargeGoalChartModule } from 'src/@vex/components/widgets/widget-large-goal-chart/widget-large-goal-chart.module';
import { WidgetQuickValueStartModule } from 'src/@vex/components/widgets/widget-quick-value-start/widget-quick-value-start.module';
import { WidgetQuickValueCenterModule } from 'src/@vex/components/widgets/widget-quick-value-center/widget-quick-value-center.module';
import { WidgetQuickLineChartModule } from 'src/@vex/components/widgets/widget-quick-line-chart/widget-quick-line-chart.module';
import { ChartModule } from 'src/@vex/components/chart/chart.module';
import { WidgetAssistantModule } from 'src/@vex/components/widgets/widget-assistant/widget-assistant.module';
import { WidgetLargeChartModule } from 'src/@vex/components/widgets/widget-large-chart/widget-large-chart.module';
import { WidgetTableModule } from 'src/@vex/components/widgets/widget-table/widget-table.module';
import { WidgetSummaryModule } from 'src/@vex/components/widgets/widget-summary/widget-summary.module';
import { WidgetSummaryChartsModule } from 'src/@vex/components/widgets/widget-summary-charts/widget-summary-charts.module';
import { WidgetSummaryMonitorsModule } from 'src/@vex/components/widgets/widget-summary-monitors/widget-summary-monitors.module';
import { WidgetSummaryTasksModule } from 'src/@vex/components/widgets/widget-summary-tasks/widget-summary-tasks.module';
import { ComponentsModule } from 'src/@vex/components/components.module';
import { TranslateModule } from '@ngx-translate/core';

// Importar el nuevo servicio
import { DashboardService } from '../../services/dashboard.service';

@NgModule({
  declarations: [DashboardAnalyticsComponent],
  imports: [
    CommonModule,
    LayoutModule,
    PageLayoutModule,
    BreadcrumbsModule,
    RouterModule,
    DashboardRoutingModule,
    SecondaryToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatCardModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    ChartModule,
    WidgetQuickLineChartModule,
    WidgetQuickValueCenterModule,
    WidgetQuickValueStartModule,
    WidgetLargeGoalChartModule,
    WidgetAssistantModule,
    WidgetLargeChartModule,
    WidgetTableModule,
    WidgetSummaryChartsModule,
    WidgetSummaryModule,
    WidgetSummaryMonitorsModule,
    WidgetSummaryTasksModule,
    ComponentsModule,
    TranslateModule
  ],
  providers: [
    DashboardService
  ]
})
export class DashboardModule {
}
