import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SuperadminService } from 'src/app/services/superadmin.service';

@Component({
  selector: 'app-superadmin-school-detail',
  templateUrl: './superadmin-school-detail.component.html',
  styleUrls: ['./superadmin-school-detail.component.scss']
})
export class SuperadminSchoolDetailComponent implements OnInit {
  loading = false;
  saving = false;
  schoolId: number;
  details: any;

  form = this.fb.group({
    name: ['', Validators.required],
    slug: [''],
    contact_email: [''],
    contact_phone: [''],
    contact_telephone: [''],
    contact_address: [''],
    contact_city: [''],
    contact_cp: [''],
    contact_country: [''],
    active: [true],
    logo: [''],
    payrexx_instance: [''],
    payrexx_key: [''],
    conditions_url: [''],
    payment_link_validity_hours: ['']
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private service: SuperadminService
  ) {}

  ngOnInit(): void {
    this.schoolId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    if (!this.schoolId) {
      return;
    }
    this.loading = true;
    this.service.getSchoolDetails(this.schoolId).subscribe({
      next: (res: any) => {
        this.details = res?.data ?? res;
        const school = this.details?.school ?? this.details;
        this.form.patchValue({
          name: school?.name ?? '',
          slug: school?.slug ?? '',
          contact_email: school?.contact_email ?? '',
          contact_phone: school?.contact_phone ?? '',
          contact_telephone: school?.contact_telephone ?? '',
          contact_address: school?.contact_address ?? '',
          contact_city: school?.contact_city ?? '',
          contact_cp: school?.contact_cp ?? '',
          contact_country: school?.contact_country ?? '',
          active: school?.active ?? true,
          logo: school?.logo ?? '',
          payrexx_instance: school?.payrexx_instance ?? '',
          payrexx_key: school?.payrexx_key ?? '',
          conditions_url: school?.conditions_url ?? '',
          payment_link_validity_hours: school?.payment_link_validity_hours ?? ''
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  back(): void {
    this.router.navigate(['/superadmin/schools']);
  }

  save(): void {
    if (this.form.invalid || this.saving) {
      return;
    }
    this.saving = true;
    this.service.updateSchool(this.schoolId, this.form.value).subscribe({
      next: () => {
        this.saving = false;
        this.snack.open('School updated', 'OK', { duration: 2500 });
        this.load();
      },
      error: () => {
        this.saving = false;
      }
    });
  }
}
