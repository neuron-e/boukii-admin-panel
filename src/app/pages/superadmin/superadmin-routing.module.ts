import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SuperadminLayoutComponent } from './superadmin-layout/superadmin-layout.component';
import { SuperadminDashboardComponent } from './superadmin-dashboard/superadmin-dashboard.component';
import { SuperadminSchoolsComponent } from './superadmin-schools/superadmin-schools.component';
import { SuperadminSchoolCreateComponent } from './superadmin-school-create/superadmin-school-create.component';
import { SuperadminRolesComponent } from './superadmin-roles/superadmin-roles.component';
import { SuperadminAdminsComponent } from './superadmin-admins/superadmin-admins.component';
import { SuperadminImpersonateComponent } from './superadmin-impersonate/superadmin-impersonate.component';

const routes: Routes = [
  {
    path: '',
    component: SuperadminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: SuperadminDashboardComponent },
      { path: 'schools', component: SuperadminSchoolsComponent },
      { path: 'schools/create', component: SuperadminSchoolCreateComponent },
      { path: 'roles', component: SuperadminRolesComponent },
      { path: 'admins', component: SuperadminAdminsComponent },
      { path: 'impersonate', component: SuperadminImpersonateComponent },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SuperadminRoutingModule {}
