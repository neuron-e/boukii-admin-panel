import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LayoutModule } from '../../../@vex/layout/layout.module';
import { PageLayoutModule } from 'src/@vex/components/page-layout/page-layout.module';
import { BreadcrumbsModule } from 'src/@vex/components/breadcrumbs/breadcrumbs.module';
import { RouterModule } from '@angular/router';
import { SecondaryToolbarModule } from 'src/@vex/components/secondary-toolbar/secondary-toolbar.module';
import { MatIconModule } from '@angular/material/icon';
import { ChartModule } from 'src/@vex/components/chart/chart.module';
import { ComponentsModule } from 'src/@vex/components/components.module';
import { MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';

import { GiftVouchersComponent } from './gift-vouchers.component';
import { GiftVouchersRoutingModule } from './gift-vouchers-routing.module';
import { GiftVouchersCreateUpdateComponent } from './gift-vouchers-create-update/gift-vouchers-create-update.component';
import { GiftVouchersCreateUpdateModule } from './gift-vouchers-create-update/gift-vouchers-create-update.module';
import { RedeemGiftVoucherDialogComponent } from './redeem-gift-voucher-dialog/redeem-gift-voucher-dialog.component';
import { GiftVoucherPreviewCardComponent } from './gift-voucher-preview-card/gift-voucher-preview-card.component';

@NgModule({
  declarations: [
    GiftVouchersComponent,
    RedeemGiftVoucherDialogComponent,
    GiftVoucherPreviewCardComponent
  ],
  imports: [
    CommonModule,
    LayoutModule,
    PageLayoutModule,
    BreadcrumbsModule,
    RouterModule,
    GiftVouchersRoutingModule,
    SecondaryToolbarModule,
    MatIconModule,
    ChartModule,
    MatDialogModule,
    ComponentsModule,
    GiftVouchersCreateUpdateModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatCardModule,
    MatTooltipModule,
    MatBadgeModule
  ]
})
export class GiftVouchersModule {
}
