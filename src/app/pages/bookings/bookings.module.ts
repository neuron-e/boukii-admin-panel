import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { BookingsComponent } from './bookings.component';
import { BookingsRoutingModule } from './bookings-routing.module';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsCustomModule } from '../../components/components-custom.module';
import { IconComponent } from 'src/@vex/components/icon/app.component';
import { DateUniqueByPipe } from '../../pipes/date-unique-by.pipe';
import { BookingsCreateUpdateV2Module } from './bookings-create-update-v2/bookings-create-update-v2.module';
import { BookingDetailV2Module } from './booking-detail-v2/booking-detail-v2.module';
import { BookingDetailModule } from './booking-detail/booking-detail.module';
import { BookingDetailModalModule } from './booking-detail-modal/booking-detail-modal.module';
import { BookingsCreateUpdateModule } from './bookings-create-update/bookings-create-update.module';
import { BookingsCreateUpdateEditModule } from './bookings-create-update-edit/bookings-create-update-edit.module';

@NgModule({
  declarations: [BookingsComponent, DateUniqueByPipe],
  imports: [
    CommonModule,
    LayoutModule,
    PageLayoutModule,
    BreadcrumbsModule,
    RouterModule,
    BookingsRoutingModule,
    SecondaryToolbarModule,
    MatIconModule,
    ChartModule,
    WidgetQuickLineChartModule,
    WidgetQuickValueCenterModule,
    WidgetQuickValueStartModule,
    WidgetLargeGoalChartModule,
    WidgetAssistantModule,
    WidgetLargeChartModule,
    WidgetTableModule,
    MatDialogModule,
    MatIconModule,
    ComponentsModule,
    MatCardModule,
    MatDividerModule,
    MatSlideToggleModule,
    TranslateModule,
    ComponentsCustomModule,
    IconComponent,
    BookingsCreateUpdateV2Module,
    BookingDetailV2Module,
    BookingDetailModule,
    BookingDetailModalModule,
    BookingsCreateUpdateModule,
    BookingsCreateUpdateEditModule
  ],
  exports: [DateUniqueByPipe]
})
export class BookingsModule {
}
