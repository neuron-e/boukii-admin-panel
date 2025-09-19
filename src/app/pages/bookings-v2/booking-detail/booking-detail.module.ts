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
import {FormsModule} from '@angular/forms';

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
    FormsModule
  ],
  exports: [
    BookingDetailV2Component
  ]
})
export class BookingDetailModule { }
