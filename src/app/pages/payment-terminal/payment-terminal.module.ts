import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentTerminalRoutingModule } from './payment-terminal-routing.module';
import { PaymentTerminalComponent } from './payment-terminal.component';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

@NgModule({
  declarations: [
    PaymentTerminalComponent
  ],
  imports: [
    CommonModule,
    PaymentTerminalRoutingModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    TranslateModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ]
})
export class PaymentTerminalModule { }
