import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SuperadminLayoutComponent } from './superadmin-layout/superadmin-layout.component';
import { SuperadminDashboardComponent } from './superadmin-dashboard/superadmin-dashboard.component';
import { SuperadminSchoolsComponent } from './superadmin-schools/superadmin-schools.component';
import { SuperadminSchoolDetailComponent } from './superadmin-school-detail/superadmin-school-detail.component';
import { SuperadminAdminsComponent } from './superadmin-admins/superadmin-admins.component';
import { SuperadminNotificationsComponent } from './superadmin-notifications/superadmin-notifications.component';

const routes: Routes = [
  {
    path: '',
    component: SuperadminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: SuperadminDashboardComponent },
      { path: 'schools', component: SuperadminSchoolsComponent },
      { path: 'schools/:id', component: SuperadminSchoolDetailComponent },
      { path: 'admins', component: SuperadminAdminsComponent },
      { path: 'notifications', component: SuperadminNotificationsComponent },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SuperadminRoutingModule {}
