import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuperadminRoutingModule } from './superadmin-routing.module';
import { SuperadminLayoutComponent } from './superadmin-layout/superadmin-layout.component';
import { SuperadminDashboardComponent } from './superadmin-dashboard/superadmin-dashboard.component';
import { SuperadminSchoolsComponent } from './superadmin-schools/superadmin-schools.component';
import { SuperadminRolesComponent } from './superadmin-roles/superadmin-roles.component';
import { SuperadminAdminsComponent } from './superadmin-admins/superadmin-admins.component';
import { SuperadminImpersonateComponent } from './superadmin-impersonate/superadmin-impersonate.component';
import { SuperadminAdminCreateComponent } from './superadmin-admin-create/superadmin-admin-create.component';
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
import { MatTabsModule } from '@angular/material/tabs';
import { ComponentsModule } from 'src/@vex/components/components.module';
import { PageLayoutModule } from 'src/@vex/components/page-layout/page-layout.module';

@NgModule({
  declarations: [
    SuperadminLayoutComponent,
    SuperadminDashboardComponent,
    SuperadminSchoolsComponent,
    SuperadminRolesComponent,
    SuperadminAdminsComponent,
    SuperadminImpersonateComponent,
    SuperadminAdminCreateComponent,
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
    MatTabsModule
  ]
})
export class SuperadminModule {}
