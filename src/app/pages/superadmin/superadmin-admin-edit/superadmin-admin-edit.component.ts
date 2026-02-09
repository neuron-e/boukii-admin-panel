import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SuperadminService } from 'src/app/services/superadmin.service';

@Component({
  selector: 'app-superadmin-admin-edit',
  templateUrl: './superadmin-admin-edit.component.html',
  styleUrls: ['./superadmin-admin-edit.component.scss']
})
export class SuperadminAdminEditComponent {
  loading = false;
  roles: any[] = [];

  form = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    active: [true],
    role: ['']
  });

  constructor(
    private fb: FormBuilder,
    private superadmin: SuperadminService,
    private snack: MatSnackBar,
    private dialogRef: MatDialogRef<SuperadminAdminEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form.patchValue({
      first_name: data?.admin?.first_name ?? data?.admin?.user?.first_name ?? '',
      last_name: data?.admin?.last_name ?? data?.admin?.user?.last_name ?? '',
      email: data?.admin?.email ?? data?.admin?.user?.email ?? '',
      active: data?.admin?.active ?? data?.admin?.user?.active ?? true,
      role: data?.admin?.roles?.[0]?.name ?? ''
    });
    this.loadRoles();
  }

  loadRoles(): void {
    this.superadmin.listRoles().subscribe({
      next: ({ data }) => {
        this.roles = data ?? [];
      }
    });
  }

  submit(): void {
    if (this.form.invalid || this.loading) {
      return;
    }
    this.loading = true;
    const adminId = this.data?.admin?.id ?? this.data?.admin?.user?.id;
    const payload: any = { ...this.form.value };
    if (this.data?.type) {
      payload.type = this.data.type;
    }
    this.superadmin.updateAdmin(adminId, payload).subscribe({
      next: () => {
        this.snack.open('Admin updated', 'OK', { duration: 2500 });
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
