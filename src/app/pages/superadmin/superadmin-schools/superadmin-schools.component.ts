import { Component } from '@angular/core';
import { TableColumn } from 'src/@vex/interfaces/table-column.interface';
import { SuperadminSchoolCreateModalComponent } from '../superadmin-school-create-modal/superadmin-school-create-modal.component';

@Component({
  selector: 'app-superadmin-schools',
  templateUrl: './superadmin-schools.component.html',
  styleUrls: ['./superadmin-schools.component.scss']
})
export class SuperadminSchoolsComponent {
  entity = '/superadmin/schools';
  icon = '../../../assets/img/icons/cursos.svg';
  createComponent = SuperadminSchoolCreateModalComponent;

  columns: TableColumn<any>[] = [
    { label: 'Id', property: 'id', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'Name', property: 'name', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'Email', property: 'contact_email', type: 'text', visible: true },
    { label: 'Status', property: 'active', type: 'badge', visible: true },
    { label: 'Actions', property: 'actions', type: 'button', visible: true }
  ];
}
