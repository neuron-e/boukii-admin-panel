import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { SuperadminService } from 'src/app/services/superadmin.service';

@Component({
  selector: 'app-superadmin-school-create-modal',
  templateUrl: './superadmin-school-create-modal.component.html',
  styleUrls: ['./superadmin-school-create-modal.component.scss']
})
export class SuperadminSchoolCreateModalComponent {
  loading = false;
  form = this.fb.group({
    name: ['', [Validators.required]],
    contact_email: ['', [Validators.required, Validators.email]],
    slug: [''],
    admin_first_name: ['', [Validators.required]],
    admin_last_name: ['', [Validators.required]],
    admin_email: ['', [Validators.required, Validators.email]],
    admin_password: ['', [Validators.required, Validators.minLength(8)]]
  });

  constructor(
    private fb: FormBuilder,
    private service: SuperadminService,
    private snack: MatSnackBar,
    private dialogRef: MatDialogRef<SuperadminSchoolCreateModalComponent>
  ) {}

  submit(): void {
    if (this.form.invalid || this.loading) {
      return;
    }

    this.loading = true;
    this.service.createSchool(this.form.value).subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('School created', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.loading = false;
        this.snack.open('Error creating school', 'OK', { duration: 3000 });
      }
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }
}
