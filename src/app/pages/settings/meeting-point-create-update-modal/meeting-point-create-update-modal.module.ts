import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetingPointCreateUpdateModalComponent } from './meeting-point-create-update-modal.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [MeetingPointCreateUpdateModalComponent],
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatButtonModule,
    ReactiveFormsModule,
    TranslateModule
  ],
  exports: [MeetingPointCreateUpdateModalComponent]
})
export class MeetingPointCreateUpdateModalModule {}
