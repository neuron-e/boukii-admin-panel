import { CommonModule } from '@angular/common';
import { Injectable, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { WidgetClientsGroupModule } from 'src/@vex/components/widgets/widget-clients-group/widget-clients-group.module';
import { WidgetClientsSportsModule } from 'src/@vex/components/widgets/widget-clients-sports/widget-clients-sports.module';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MAT_DATE_FORMATS, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatListModule } from '@angular/material/list';
import { NgxMatDatetimePickerModule, NgxMatTimepickerModule } from '@angular-material-components/datetime-picker';
import { SecondaryToolbarModule } from 'src/@vex/components/secondary-toolbar/secondary-toolbar.module';
import { BreadcrumbsModule } from 'src/@vex/components/breadcrumbs/breadcrumbs.module';
import { MatStepperModule } from '@angular/material/stepper';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { BookingsCreateUpdateModalModule } from '../bookings-create-update-modal/bookings-create-update-modal.module';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DateAdapter } from 'angular-calendar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ClientsCreateUpdateModalModule } from '../../clients/client-create-update-modal/client-create-update-modal.module';
import { AddClientSportModalModule } from '../add-client-sport/add-client-sport.module';
import { TranslateModule } from '@ngx-translate/core';
import { BookingsCreateUpdateEditComponent, CustomDateAdapter } from './bookings-create-update-edit.component';
import { AddReductionModalModule } from '../bookings-create-update/add-reduction/add-reduction.module';
import { AddDiscountBonusModalModule } from '../bookings-create-update/add-discount-bonus/add-discount-bonus.module';
import { ConfirmModalEditBookingModule } from './confirm-dialog-edit-booking/confirm-dialog-edit-booking.component.module';
import { ComponentsCustomModule } from '../../../components/components-custom.module';
import { QRCodeModule } from 'angularx-qrcode';
import { IconComponent } from 'src/@vex/components/icon/app.component';

export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'YYYY-MM-DD',
  },
  display: {
    dateInput: 'YYYY-MM-DD',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};
@Injectable()
@NgModule({
  imports: [
    FormsModule,
    IconComponent,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatSelectModule,
    MatMenuModule,
    MatDividerModule,
    MatAutocompleteModule,
    WidgetClientsGroupModule,
    WidgetClientsSportsModule,
    MatCardModule,
    MatFormFieldModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatListModule,
    NgxMatDatetimePickerModule,
    NgxMatTimepickerModule,
    SecondaryToolbarModule,
    BreadcrumbsModule,
    MatStepperModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatDialogModule,
    BookingsCreateUpdateModalModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    AddReductionModalModule,
    AddDiscountBonusModalModule,
    ClientsCreateUpdateModalModule,
    AddClientSportModalModule,
    TranslateModule,
    ConfirmModalEditBookingModule,
    ComponentsCustomModule,
    QRCodeModule
  ],
  declarations: [BookingsCreateUpdateEditComponent],
  exports: [BookingsCreateUpdateEditComponent],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter }
  ],
})
export class BookingsCreateUpdateEditModule {
}
