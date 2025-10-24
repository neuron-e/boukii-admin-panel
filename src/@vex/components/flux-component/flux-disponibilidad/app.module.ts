import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SecondaryToolbarModule } from '../../secondary-toolbar/secondary-toolbar.module';
import { TranslateModule } from '@ngx-translate/core';
import { FluxDisponibilidadComponent } from './app.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FluxModalModule } from '../flux-modal/app.module';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CoursesDetailCardNivelModule } from '../course-nivel/app.module';
import { ComponenteSelectModule } from '../../form/select/app.module';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';


@NgModule({
  declarations: [FluxDisponibilidadComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule, FormsModule, MatListModule,
    SecondaryToolbarModule,
    TranslateModule, MatFormFieldModule, MatAutocompleteModule, MatSelectModule, MatFormFieldModule,
    MatFormFieldModule,
    MatInputModule, FluxModalModule, MatCheckboxModule, CoursesDetailCardNivelModule, MatButtonModule,
    MatTooltipModule, ComponenteSelectModule
  ],
  exports: [FluxDisponibilidadComponent]
})
export class FluxDisponibilidadModule { }
