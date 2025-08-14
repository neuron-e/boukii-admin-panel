import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { ReservationsWidgetComponent } from './reservations-widget.component';

@NgModule({
  declarations: [
    ReservationsWidgetComponent
  ],
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatProgressBarModule,
    MatTooltipModule,
    TranslateModule
  ],
  exports: [
    ReservationsWidgetComponent
  ]
})
export class ReservationsWidgetModule { }