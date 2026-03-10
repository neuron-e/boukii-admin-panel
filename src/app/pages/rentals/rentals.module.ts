import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { QRCodeModule } from 'angularx-qrcode';
import { TranslateModule } from '@ngx-translate/core';
import { PageLayoutModule } from 'src/@vex/components/page-layout/page-layout.module';
import { SecondaryToolbarModule } from 'src/@vex/components/secondary-toolbar/secondary-toolbar.module';
import { BreadcrumbsModule } from 'src/@vex/components/breadcrumbs/breadcrumbs.module';
import { ConfirmDialogModule } from 'src/@vex/components/confirm-dialog/confirm-dialog.module';
import { RentalStatusBadgeModule } from 'src/app/shared/rental-status-badge/rental-status-badge.module';
import { RentalsRoutingModule } from './rentals-routing.module';
import { RentalsComponent } from './rentals.component';
import { RentalsItemDetailComponent } from './rentals-item-detail.component';
import { RentalsItemDialogComponent } from './rentals-item-dialog.component';
import { RentalsV2Component } from './rentals-v2.component';
import { RentalsReservationEditDialogComponent } from './rentals-reservation-edit-dialog.component';
import { RentalsReservationReturnDialogComponent } from './rentals-reservation-return-dialog.component';
import { RentalsDamageDialogComponent } from './rentals-damage-dialog.component';
import { RentalsPaymentDialogComponent } from './rentals-payment-dialog.component';

@NgModule({
  declarations: [
    RentalsComponent,
    RentalsV2Component,
    RentalsItemDetailComponent,
    RentalsItemDialogComponent,
    RentalsReservationEditDialogComponent,
    RentalsReservationReturnDialogComponent,
    RentalsDamageDialogComponent,
    RentalsPaymentDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatTableModule,
    QRCodeModule,
    TranslateModule,
    PageLayoutModule,
    SecondaryToolbarModule,
    BreadcrumbsModule,
    ConfirmDialogModule,
    RentalStatusBadgeModule,
    RentalsRoutingModule
  ],
  providers: [DatePipe]
})
export class RentalsModule {}
