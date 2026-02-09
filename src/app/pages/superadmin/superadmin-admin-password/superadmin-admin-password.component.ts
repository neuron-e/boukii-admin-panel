import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SuperadminService } from 'src/app/services/superadmin.service';

@Component({
  selector: 'app-superadmin-admin-password',
  templateUrl: './superadmin-admin-password.component.html',
  styleUrls: ['./superadmin-admin-password.component.scss']
})
export class SuperadminAdminPasswordComponent {
  loading = false;

  form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  constructor(
    private fb: FormBuilder,
    private superadmin: SuperadminService,
    private snack: MatSnackBar,
    private dialogRef: MatDialogRef<SuperadminAdminPasswordComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

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
    this.superadmin.resetAdminPassword(adminId, payload).subscribe({
      next: () => {
        this.snack.open('Password updated', 'OK', { duration: 2500 });
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
