import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuperadminRoutingModule } from './superadmin-routing.module';
import { SuperadminLayoutComponent } from './superadmin-layout/superadmin-layout.component';
import { SuperadminDashboardComponent } from './superadmin-dashboard/superadmin-dashboard.component';
import { SuperadminSchoolsComponent } from './superadmin-schools/superadmin-schools.component';
import { SuperadminAdminsComponent } from './superadmin-admins/superadmin-admins.component';
import { SuperadminNotificationsComponent } from './superadmin-notifications/superadmin-notifications.component';
import { SuperadminNotificationCreateComponent } from './superadmin-notification-create/superadmin-notification-create.component';
import { SuperadminAdminCreateComponent } from './superadmin-admin-create/superadmin-admin-create.component';
import { SuperadminAdminEditComponent } from './superadmin-admin-edit/superadmin-admin-edit.component';
import { SuperadminAdminPasswordComponent } from './superadmin-admin-password/superadmin-admin-password.component';
import { SuperadminSchoolCreateModalComponent } from './superadmin-school-create-modal/superadmin-school-create-modal.component';
import { SuperadminSchoolDetailComponent } from './superadmin-school-detail/superadmin-school-detail.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ComponentsModule } from 'src/@vex/components/components.module';
import { PageLayoutModule } from 'src/@vex/components/page-layout/page-layout.module';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [
    SuperadminLayoutComponent,
    SuperadminDashboardComponent,
    SuperadminSchoolsComponent,
    SuperadminAdminsComponent,
    SuperadminNotificationsComponent,
    SuperadminNotificationCreateComponent,
    SuperadminAdminCreateComponent,
    SuperadminAdminEditComponent,
    SuperadminAdminPasswordComponent,
    SuperadminSchoolCreateModalComponent,
    SuperadminSchoolDetailComponent
  ],
  imports: [
    CommonModule,
    SuperadminRoutingModule,
    ComponentsModule,
    PageLayoutModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatToolbarModule,
    MatListModule,
    MatTableModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatCheckboxModule,
    AngularEditorModule,
    TranslateModule
  ]
})
export class SuperadminModule {}
