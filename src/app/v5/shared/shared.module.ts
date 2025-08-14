import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SeasonSelectorComponent } from './components/season-selector/season-selector.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { ErrorMessageComponent } from './components/error-message/error-message.component';
import { DataTableComponent } from './components/data-table/data-table.component';
import { FormFieldComponent } from './forms/form-field.component';
import {NotificationBadgeComponent} from './components/notification-badge/notification-badge.component';
import { InsufficientPermissionsComponent } from './components/insufficient-permissions/insufficient-permissions.component';
import { ReservationsWidgetModule } from './components/reservations-widget/reservations-widget.module';
import { RevenueWidgetModule } from './components/revenue-widget/revenue-widget.module';

@NgModule({
  declarations: [
    SeasonSelectorComponent,
    LoadingSpinnerComponent,
    ErrorMessageComponent,
    DataTableComponent,
    FormFieldComponent,
    NotificationBadgeComponent,
    InsufficientPermissionsComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    ReservationsWidgetModule,
    RevenueWidgetModule
  ],
  exports: [
    SeasonSelectorComponent,
    LoadingSpinnerComponent,
    ErrorMessageComponent,
    DataTableComponent,
    FormFieldComponent,
    NotificationBadgeComponent,
    InsufficientPermissionsComponent,
    ReservationsWidgetModule,
    RevenueWidgetModule
  ]
})
export class SharedModule {}
