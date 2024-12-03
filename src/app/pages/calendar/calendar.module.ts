import { NgModule } from '@angular/core';
import { CommonModule, NgSwitch, NgSwitchCase } from '@angular/common';
import { LayoutModule } from '../../../@vex/layout/layout.module';
import { PageLayoutModule } from 'src/@vex/components/page-layout/page-layout.module';
import { BreadcrumbsModule } from 'src/@vex/components/breadcrumbs/breadcrumbs.module';
import { RouterModule } from '@angular/router';
import { SecondaryToolbarModule } from 'src/@vex/components/secondary-toolbar/secondary-toolbar.module';
import { MatIconModule } from '@angular/material/icon';
import { WidgetLargeGoalChartModule } from 'src/@vex/components/widgets/widget-large-goal-chart/widget-large-goal-chart.module';
import { WidgetQuickValueStartModule } from 'src/@vex/components/widgets/widget-quick-value-start/widget-quick-value-start.module';
import { WidgetQuickValueCenterModule } from 'src/@vex/components/widgets/widget-quick-value-center/widget-quick-value-center.module';
import { WidgetQuickLineChartModule } from 'src/@vex/components/widgets/widget-quick-line-chart/widget-quick-line-chart.module';
import { ChartModule } from 'src/@vex/components/chart/chart.module';
import { WidgetAssistantModule } from 'src/@vex/components/widgets/widget-assistant/widget-assistant.module';
import { WidgetLargeChartModule } from 'src/@vex/components/widgets/widget-large-chart/widget-large-chart.module';
import { WidgetTableModule } from 'src/@vex/components/widgets/widget-table/widget-table.module';
import { ComponentsModule } from 'src/@vex/components/components.module';
import { MatDialogModule } from '@angular/material/dialog';
import { CalendarRoutingModule } from './calendar-routing.module';
import { CalendarComponent } from './calendar.component';
import { VexScrollbarComponent } from 'src/@vex/components/vex-scrollbar/vex-scrollbar.component';
import { CalendarA11y, CalendarCommonModule, CalendarDateFormatter, CalendarDayModule, CalendarEventTitleFormatter, CalendarModule, CalendarMonthModule, CalendarUtils, CalendarWeekModule, DateAdapter } from 'angular-calendar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';
import { TranslateModule } from '@ngx-translate/core';
import { CalendarEditComponent } from './calendar-edit/calendar-edit.component';

@NgModule({
  declarations: [CalendarComponent,],
  imports: [
    CalendarEditComponent,
    CommonModule,
    LayoutModule,
    PageLayoutModule,
    BreadcrumbsModule,
    RouterModule,
    CalendarRoutingModule,
    SecondaryToolbarModule,
    MatIconModule,
    ChartModule,
    WidgetQuickLineChartModule,
    TranslateModule,
    WidgetQuickValueCenterModule,
    WidgetQuickValueStartModule,
    WidgetLargeGoalChartModule,
    WidgetAssistantModule,
    WidgetLargeChartModule,
    WidgetTableModule,
    MatButtonModule,
    CalendarCommonModule,
    VexScrollbarComponent,
    NgSwitch,
    NgSwitchCase,
    CalendarMonthModule,
    CalendarWeekModule,
    CalendarDayModule,
    CalendarModule,
    MatSnackBarModule,
    MatDialogModule,
    ComponentsModule,
    TranslateModule,
  ], providers: [
    {
      provide: DateAdapter,
      useFactory: adapterFactory,
    },
    CalendarEventTitleFormatter,
    CalendarDateFormatter,
    CalendarUtils,
    CalendarA11y
  ]
})
export class CalendarMonitorModule {
}
