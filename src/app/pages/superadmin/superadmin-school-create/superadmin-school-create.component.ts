import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SuperadminService } from 'src/app/services/superadmin.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-superadmin-school-create',
  templateUrl: './superadmin-school-create.component.html',
  styleUrls: ['./superadmin-school-create.component.scss']
})
export class SuperadminSchoolCreateComponent {
  form = this.fb.group({
    name: ['', [Validators.required]],
    contact_email: ['', [Validators.email]],
    slug: [''],
    description: [''],
    logo: [''],
    admin_first_name: ['', [Validators.required]],
    admin_last_name: ['', [Validators.required]],
    admin_email: ['', [Validators.required, Validators.email]],
    admin_password: ['', [Validators.minLength(8)]],
  });
  loading = false;

  constructor(
    private fb: FormBuilder,
    private service: SuperadminService,
    private snack: MatSnackBar,
    private router: Router
  ) {}

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result can be string | ArrayBuffer, we only want string for data URL
      const result = reader.result;
      if (typeof result === 'string') {
        this.form.patchValue({ logo: result });
      }
    };
    reader.readAsDataURL(file);
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.service.createSchool(this.form.value).subscribe({
      next: () => {
        this.loading = false;
        this.snack.open('School created', 'OK', { duration: 3000 });
        this.router.navigate(['/superadmin/schools']);
      },
      error: () => {
        this.loading = false;
        this.snack.open('Error creating school', 'OK', { duration: 3000 });
      }
    });
  }
}
