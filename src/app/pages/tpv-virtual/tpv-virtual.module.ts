import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TpvVirtualRoutingModule } from './tpv-virtual-routing.module';
import { TpvVirtualComponent } from './tpv-virtual.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [
    TpvVirtualComponent
  ],
  imports: [
    CommonModule,
    TpvVirtualRoutingModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    TranslateModule
  ]
})
export class TpvVirtualModule { }
