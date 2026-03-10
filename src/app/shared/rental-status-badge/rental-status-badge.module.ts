import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RentalStatusBadgeComponent } from './rental-status-badge.component';

@NgModule({
  declarations: [RentalStatusBadgeComponent],
  imports: [CommonModule, TranslateModule],
  exports: [RentalStatusBadgeComponent]
})
export class RentalStatusBadgeModule {}
