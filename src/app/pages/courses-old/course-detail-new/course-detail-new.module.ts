import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CourseDetailNewComponent } from './course-detail-new.component';
import { BreadcrumbsModule } from '../../../../@vex/components/breadcrumbs/breadcrumbs.module';
import { SecondaryToolbarModule } from '../../../../@vex/components/secondary-toolbar/secondary-toolbar.module';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslateModule } from '@ngx-translate/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CoursesDetailCardModule } from 'src/@vex/components/flux-component/course-card/app.module';
import { MatIconModule } from '@angular/material/icon';
import { FluxModalModule } from 'src/@vex/components/flux-component/flux-modal/app.module';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { MatButtonModule } from '@angular/material/button';
import { CoursesDetailCardNivelModule } from 'src/@vex/components/flux-component/course-nivel/app.module';



@NgModule({
  declarations: [
    CourseDetailNewComponent
  ],
  imports: [
    CommonModule,
    BreadcrumbsModule,
    SecondaryToolbarModule,
    MatTabsModule,
    TranslateModule,
    MatProgressSpinnerModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    CoursesDetailCardModule,
    MatIconModule, FluxModalModule, MatCheckboxModule, MatDatepickerModule, AngularEditorModule, MatButtonModule, CoursesDetailCardNivelModule,
    FluxModalModule
  ]
})
export class CourseDetailNewModule { }
