import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { MonitorPartialAvailabilityDialogComponent } from './monitor-partial-availability-dialog.component';
import { MonitorAssignmentLoadingDialogComponent } from './monitor-assignment-loading-dialog.component';

@NgModule({
  declarations: [
    MonitorPartialAvailabilityDialogComponent,
    MonitorAssignmentLoadingDialogComponent
  ],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    TranslateModule
  ],
  exports: [
    MonitorPartialAvailabilityDialogComponent,
    MonitorAssignmentLoadingDialogComponent
  ]
})
export class MonitorPartialAvailabilityDialogModule {}
