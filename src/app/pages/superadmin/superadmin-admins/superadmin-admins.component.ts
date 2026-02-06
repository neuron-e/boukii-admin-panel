import { Component } from '@angular/core';
import { TableColumn } from 'src/@vex/interfaces/table-column.interface';
import { SuperadminAdminCreateComponent } from '../superadmin-admin-create/superadmin-admin-create.component';

@Component({
  selector: 'app-superadmin-admins',
  templateUrl: './superadmin-admins.component.html',
  styleUrls: ['./superadmin-admins.component.scss']
})
export class SuperadminAdminsComponent {
  entity = '/superadmin/admins';
  icon = '../../../assets/img/icons/Admins.svg';
  createComponent = SuperadminAdminCreateComponent;

  columns: TableColumn<any>[] = [
    { label: 'Id', property: 'id', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'First name', property: 'first_name', type: 'text', visible: true },
    { label: 'Last name', property: 'last_name', type: 'text', visible: true },
    { label: 'Email', property: 'email', type: 'text', visible: true, cssClasses: ['font-medium'] }
  ];
}
