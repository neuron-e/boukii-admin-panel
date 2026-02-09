import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Inject } from '@angular/core';
import { SuperadminService } from 'src/app/services/superadmin.service';

@Component({
  selector: 'app-superadmin-admin-create',
  templateUrl: './superadmin-admin-create.component.html',
  styleUrls: ['./superadmin-admin-create.component.scss']
})
export class SuperadminAdminCreateComponent {
  loading = false;
  schools: any[] = [];
  showSchoolSelect = true;
  allowSuperadmin = true;
  form = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    school_id: ['', Validators.required],
    role: [''],
    is_superadmin: [false]
  });

  constructor(
    private fb: FormBuilder,
    private superadmin: SuperadminService,
    private snack: MatSnackBar,
    private dialogRef: MatDialogRef<SuperadminAdminCreateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form.get('is_superadmin')?.valueChanges.subscribe((isSuper) => {
      const schoolControl = this.form.get('school_id');
      if (isSuper) {
        schoolControl?.clearValidators();
        schoolControl?.setValue('');
      } else {
        schoolControl?.setValidators([Validators.required]);
      }
      schoolControl?.updateValueAndValidity({ emitEvent: false });
    });

    if (data?.schoolId) {
      this.form.patchValue({ school_id: data.schoolId });
      this.form.get('school_id')?.disable();
      this.showSchoolSelect = false;
      this.allowSuperadmin = false;
    } else if (data?.type) {
      const isSuper = data.type === 'superadmin' || data.type === 4 || data.type === '4';
      this.form.patchValue({ is_superadmin: isSuper });
      if (isSuper) {
        this.showSchoolSelect = false;
        this.allowSuperadmin = false;
        this.form.get('school_id')?.clearValidators();
        this.form.get('school_id')?.updateValueAndValidity({ emitEvent: false });
      } else {
        this.loadSchools();
      }
    } else {
      this.loadSchools();
    }
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
    const payload: any = {
      ...this.form.getRawValue(),
      school_id: this.form.get('school_id')?.value
    };
    if (payload.is_superadmin) {
      payload.type = 'superadmin';
      delete payload.school_id;
    } else if (!payload.school_id) {
      this.loading = false;
      this.snack.open('School is required for admins', 'OK', { duration: 2500 });
      return;
    }
    delete payload.is_superadmin;
    this.superadmin.createAdmin(payload).subscribe({
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
