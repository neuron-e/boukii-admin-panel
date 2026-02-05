import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SuperadminService } from 'src/app/services/superadmin.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-superadmin-admins',
  templateUrl: './superadmin-admins.component.html',
  styleUrls: ['./superadmin-admins.component.scss']
})
export class SuperadminAdminsComponent implements OnInit {
  loading = false;
  admins: any[] = [];
  schools: any[] = [];
  displayedColumns = ['name', 'email', 'schools'];
  form = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    school_id: ['', Validators.required],
    role: ['']
  });

  constructor(
    private superadmin: SuperadminService,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAdmins();
    this.loadSchools();
  }

  loadAdmins(): void {
    this.loading = true;
    this.superadmin.listAdmins().subscribe({
      next: ({ data }) => {
        this.admins = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadSchools(): void {
    this.superadmin.listSchools({ perPage: 999 }).subscribe({
      next: ({ data }) => this.schools = data
    });
  }

  getSchoolNames(admin: any): string {
    if (!admin.schools || !admin.schools.length) {
      return '—';
    }
    return admin.schools.map((s: any) => s.name).join(', ');
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.superadmin.createAdmin(this.form.value).subscribe({
      next: () => {
        this.snack.open('Admin created', 'OK', { duration: 2500 });
        this.form.reset();
        this.loadAdmins();
      }
    });
  }
}
