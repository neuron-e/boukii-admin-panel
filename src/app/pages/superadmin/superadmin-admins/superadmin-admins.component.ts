import { Component } from '@angular/core';
import { TableColumn } from 'src/@vex/interfaces/table-column.interface';
import { SuperadminAdminCreateComponent } from '../superadmin-admin-create/superadmin-admin-create.component';
import { SuperadminAdminEditComponent } from '../superadmin-admin-edit/superadmin-admin-edit.component';

@Component({
  selector: 'app-superadmin-admins',
  templateUrl: './superadmin-admins.component.html',
  styleUrls: ['./superadmin-admins.component.scss']
})
export class SuperadminAdminsComponent {
  icon = '../../../assets/img/icons/Admins.svg';
  createComponent = SuperadminAdminCreateComponent;
  updateComponent = SuperadminAdminEditComponent;

  columns: TableColumn<any>[] = [
    { label: 'superadmin.column_id', property: 'id', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'superadmin.column_first_name', property: 'first_name', type: 'text', visible: true },
    { label: 'superadmin.column_last_name', property: 'last_name', type: 'text', visible: true },
    { label: 'superadmin.column_email', property: 'email', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'superadmin.column_roles', property: 'role_names', type: 'text', visible: true }
  ];
}
