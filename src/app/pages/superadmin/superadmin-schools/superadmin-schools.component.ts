import { Component } from '@angular/core';
import { TableColumn } from 'src/@vex/interfaces/table-column.interface';
import { SuperadminSchoolCreateModalComponent } from '../superadmin-school-create-modal/superadmin-school-create-modal.component';
import { SuperadminService } from 'src/app/services/superadmin.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { SchoolService } from 'src/service/school.service';
import { ConfigService } from 'src/@vex/config/config.service';
import { defaultConfig } from 'src/@vex/config/configs';

@Component({
  selector: 'app-superadmin-schools',
  templateUrl: './superadmin-schools.component.html',
  styleUrls: ['./superadmin-schools.component.scss']
})
export class SuperadminSchoolsComponent {
  entity = '/superadmin/schools';
  icon = '../../../assets/img/icons/cursos.svg';
  createComponent = SuperadminSchoolCreateModalComponent;
  extraActions = [
    {
      label: 'superadmin.access_admin_panel',
      icon: 'mat:login',
      action: (row: any) => this.impersonate(row)
    }
  ];

  columns: TableColumn<any>[] = [
    { label: 'superadmin.column_id', property: 'id', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'superadmin.column_name', property: 'name', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'superadmin.column_email', property: 'contact_email', type: 'text', visible: true },
    { label: 'superadmin.column_status', property: 'active', type: 'badge', visible: true },
    { label: 'superadmin.column_actions', property: 'actions', type: 'button', visible: true }
  ];

  constructor(
    private superadmin: SuperadminService,
    private snack: MatSnackBar,
    private router: Router,
    private schoolService: SchoolService,
    private configService: ConfigService
  ) {}

  private impersonate(row: any) {
    const schoolId = row?.id;
    if (!schoolId) {
      return;
    }
    this.superadmin.impersonate({ school_id: schoolId }).subscribe({
      next: ({ data }) => {
        const userData = data?.user;
        const token = data?.token;
        if (!userData || !token) {
          this.snack.open('Impersonation failed', 'OK', { duration: 2500 });
          return;
        }
        if (!Array.isArray(userData.schools) || userData.schools.length === 0) {
          userData.schools = [{ id: schoolId, active: true }];
        }
        localStorage.setItem('boukiiUser', JSON.stringify(userData));
        localStorage.setItem('boukiiUserToken', JSON.stringify(token));

        const schoolUser = userData?.schools?.length ? userData : { schools: [{ id: schoolId }] };
        this.schoolService.getSchoolData(schoolUser, true).subscribe({
          next: (res: any) => {
            const school = res?.data ?? res;
            if (school) {
              userData.schools = [{ ...school, active: true }];
              localStorage.setItem('boukiiUser', JSON.stringify(userData));
            }
            defaultConfig.imgSrc = school?.logo;
            this.configService.updateConfig({
              sidenav: {
                imageUrl: school?.logo,
                title: school?.name,
                showCollapsePin: false
              }
            });
            this.router.navigate(['/home']);
          },
          error: () => {
            this.router.navigate(['/home']);
          }
        });
      },
      error: () => {
        this.snack.open('Impersonation failed', 'OK', { duration: 2500 });
      }
    });
  }
}
