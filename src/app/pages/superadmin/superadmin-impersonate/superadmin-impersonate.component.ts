import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SuperadminService } from 'src/app/services/superadmin.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-superadmin-impersonate',
  templateUrl: './superadmin-impersonate.component.html',
  styleUrls: ['./superadmin-impersonate.component.scss']
})
export class SuperadminImpersonateComponent implements OnInit {
  schools: any[] = [];
  admins: any[] = [];
  loading = false;
  form = this.fb.group({
    school_id: ['', Validators.required],
    user_id: ['']
  });
  token: string | null = null;

  constructor(
    private superadmin: SuperadminService,
    private fb: FormBuilder,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSchools();
  }

  loadSchools(): void {
    this.superadmin.listSchools({ perPage: 999 }).subscribe({
      next: ({ data }) => this.schools = data
    });
  }

  onSchoolChange(): void {
    const schoolId = this.form.value.school_id;
    if (!schoolId) {
      return;
    }
    this.loading = true;
    this.superadmin.listAdmins({ school_id: schoolId }).subscribe({
      next: ({ data }) => {
        this.admins = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  impersonate(): void {
    if (this.form.invalid) {
      return;
    }
    this.superadmin.impersonate(this.form.value).subscribe({
      next: ({ data }) => {
        this.token = data.token;
        this.snack.open('Token generated', 'OK', { duration: 2500 });
      }
    });
  }
}
