import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { TimelineComponent } from './timeline.component';
import { TimelineRoutingModule } from './timeline-routing.module';
import { ComponentsCustomModule } from '../../components/components-custom.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BookingDetailModule } from '../bookings-v2/booking-detail/booking-detail.module';
import { CourseUserTransferTimelineModalModule } from './course-user-transfer-timeline/course-user-transfer-timeline.module';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { TranslateModule } from '@ngx-translate/core';
import { ConfirmUnmatchMonitorModule } from './confirm-unmatch-monitor/confirm-unmatch-monitor.module';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IconComponent } from 'src/@vex/components/icon/app.component';
import { EditDateComponent } from './edit-date/edit-date.component';
import { MonitorAssignmentDialogModule } from './monitor-assignment-dialog/monitor-assignment-dialog.module';
import { MonitorPartialAvailabilityDialogModule } from 'src/app/shared/dialogs/monitor-partial-availability/monitor-partial-availability-dialog.module';
import { GroupedBlockDeleteDialogComponent } from './grouped-block-delete-dialog/grouped-block-delete-dialog.component';

@NgModule({
  declarations: [TimelineComponent, EditDateComponent, GroupedBlockDeleteDialogComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LayoutModule,
    PageLayoutModule,
    BreadcrumbsModule,
    RouterModule,
    TimelineRoutingModule,
    SecondaryToolbarModule,
    MatIconModule,
    ChartModule,
    IconComponent,
    WidgetQuickLineChartModule,
    WidgetQuickValueCenterModule,
    WidgetQuickValueStartModule,
    WidgetLargeGoalChartModule,
    WidgetAssistantModule,
    WidgetLargeChartModule,
    WidgetTableModule,
    MatDialogModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatInputModule,
    ComponentsModule,
    ComponentsCustomModule,
    MatProgressSpinnerModule,
    BookingDetailModule,
    CourseUserTransferTimelineModalModule,
    TranslateModule,
    MatDatepickerModule,
    ConfirmUnmatchMonitorModule,
    MatAutocompleteModule,
    MatTooltipModule,
    MonitorAssignmentDialogModule,
    MonitorPartialAvailabilityDialogModule
  ],
  exports: [TimelineComponent]
})
export class TimelineModule {
}
