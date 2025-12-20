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
import {FormsModule} from '@angular/forms';
import { CancelBookginModalModule } from '../cancel-booking/cancel-booking.module';
import { CancelPartialBookginModalModule } from '../cancel-partial-booking/cancel-partial-booking.module';

@NgModule({
  declarations: [
    BookingDetailV2Component
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
    FormsModule,
    CancelBookginModalModule,
    CancelPartialBookginModalModule
  ],
  exports: [
    BookingDetailV2Component
  ]
})
export class BookingDetailModule { }
