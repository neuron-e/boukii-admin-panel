import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RevenueWidgetComponent } from './revenue-widget.component';

// Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';

// Vex Chart
import { ChartModule } from '../../../../../@vex/components/chart/chart.module';

// Translation
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [
    RevenueWidgetComponent
  ],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatTabsModule,
    ChartModule,
    TranslateModule
  ],
  exports: [
    RevenueWidgetComponent
  ]
})
export class RevenueWidgetModule { }