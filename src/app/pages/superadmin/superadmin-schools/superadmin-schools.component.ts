import { Component, OnInit } from '@angular/core';
import { SuperadminService } from 'src/app/services/superadmin.service';

@Component({
  selector: 'app-superadmin-schools',
  templateUrl: './superadmin-schools.component.html',
  styleUrls: ['./superadmin-schools.component.scss']
})
export class SuperadminSchoolsComponent implements OnInit {
  loading = false;
  schools: any[] = [];
  columns = ['name', 'contact_email', 'active'];

  constructor(private superadmin: SuperadminService) {}

  ngOnInit(): void {
    this.fetchSchools();
  }

  fetchSchools(): void {
    this.loading = true;
    this.superadmin.listSchools().subscribe({
      next: ({ data }) => {
        this.schools = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
