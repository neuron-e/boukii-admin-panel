import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingDetailV2Component } from './booking-detail.component';
import { FluxModalModule } from '../../../../@vex/components/flux-component/flux-modal/app.module';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentsModule } from './components/components.module';
import { BookingComponentsModule } from '../bookings-create-update/components/components.module';
import { SecondaryToolbarModule } from '../../../../@vex/components/secondary-toolbar/secondary-toolbar.module';
import { BreadcrumbsModule } from '../../../../@vex/components/breadcrumbs/breadcrumbs.module';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatOptionModule} from '@angular/material/core';
import {MatRadioModule} from '@angular/material/radio';
import {MatSelectModule} from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import {FormsModule} from '@angular/forms';
import { CancelBookginModalModule } from '../cancel-booking/cancel-booking.module';
import { CancelPartialBookginModalModule } from '../cancel-partial-booking/cancel-partial-booking.module';
import { RentalStatusBadgeModule } from 'src/app/shared/rental-status-badge/rental-status-badge.module';
import { MatListModule } from '@angular/material/list';
import { BookingRentalLinkDialogComponent } from './components/booking-rental-link-dialog/booking-rental-link-dialog.component';
import { BookingRentalCancelWarningDialogComponent } from './components/booking-rental-cancel-warning-dialog/booking-rental-cancel-warning-dialog.component';

@NgModule({
  declarations: [
    BookingDetailV2Component,
    BookingRentalLinkDialogComponent,
    BookingRentalCancelWarningDialogComponent
  ],
  imports: [
    CommonModule,
    ComponentsModule,
    FluxModalModule,
    MatButtonModule,
    TranslateModule,
    SecondaryToolbarModule,
    BreadcrumbsModule,
    BookingComponentsModule,
    MatFormFieldModule,
    MatOptionModule,
    MatRadioModule,
    MatSelectModule,
    MatCardModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    RentalStatusBadgeModule,
    MatListModule,
    FormsModule,
    CancelBookginModalModule,
    CancelPartialBookginModalModule
  ],
  exports: [
    BookingDetailV2Component
  ]
})
export class BookingDetailModule { }
