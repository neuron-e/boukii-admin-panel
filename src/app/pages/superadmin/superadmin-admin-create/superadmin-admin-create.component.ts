import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { SuperadminService } from 'src/app/services/superadmin.service';

@Component({
  selector: 'app-superadmin-admin-create',
  templateUrl: './superadmin-admin-create.component.html',
  styleUrls: ['./superadmin-admin-create.component.scss']
})
export class SuperadminAdminCreateComponent {
  loading = false;
  schools: any[] = [];
  form = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    school_id: ['', Validators.required],
    role: ['']
  });

  constructor(
    private fb: FormBuilder,
    private superadmin: SuperadminService,
    private snack: MatSnackBar,
    private dialogRef: MatDialogRef<SuperadminAdminCreateComponent>
  ) {
    this.loadSchools();
  }

  loadSchools(): void {
    this.superadmin.listSchools({ perPage: 999 }).subscribe({
      next: ({ data }) => {
        this.schools = data ?? [];
      }
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading) {
      return;
    }

    this.loading = true;
    this.superadmin.createAdmin(this.form.value).subscribe({
      next: () => {
        this.snack.open('Admin created', 'OK', { duration: 2500 });
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
