import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuperadminRoutingModule } from './superadmin-routing.module';
import { SuperadminLayoutComponent } from './superadmin-layout/superadmin-layout.component';
import { SuperadminDashboardComponent } from './superadmin-dashboard/superadmin-dashboard.component';
import { SuperadminSchoolsComponent } from './superadmin-schools/superadmin-schools.component';
import { SuperadminSchoolCreateComponent } from './superadmin-school-create/superadmin-school-create.component';
import { SuperadminRolesComponent } from './superadmin-roles/superadmin-roles.component';
import { SuperadminAdminsComponent } from './superadmin-admins/superadmin-admins.component';
import { SuperadminImpersonateComponent } from './superadmin-impersonate/superadmin-impersonate.component';
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

@NgModule({
  declarations: [
    SuperadminLayoutComponent,
    SuperadminDashboardComponent,
    SuperadminSchoolsComponent,
    SuperadminSchoolCreateComponent,
    SuperadminRolesComponent,
    SuperadminAdminsComponent,
    SuperadminImpersonateComponent
  ],
  imports: [
    CommonModule,
    SuperadminRoutingModule,
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
    MatSelectModule
  ]
})
export class SuperadminModule {}
