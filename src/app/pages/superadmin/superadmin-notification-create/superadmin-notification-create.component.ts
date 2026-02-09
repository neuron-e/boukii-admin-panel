import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SuperadminService } from 'src/app/services/superadmin.service';

@Component({
  selector: 'app-superadmin-notification-create',
  templateUrl: './superadmin-notification-create.component.html',
  styleUrls: ['./superadmin-notification-create.component.scss']
})
export class SuperadminNotificationCreateComponent implements OnInit {
  form: FormGroup;
  schools: any[] = [];
  monitors: any[] = [];
  loading = false;

  constructor(
    private fb: FormBuilder,
    private superadminService: SuperadminService,
    private dialogRef: MatDialogRef<SuperadminNotificationCreateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(150)]],
      body: [''],
      recipient_type: ['schools', Validators.required],
      all_schools: [true],
      school_ids: [[]],
      all_monitors: [false],
      monitor_ids: [[]],
      schedule_at: [''],
      send_push: [true],
    });
  }

  ngOnInit(): void {
    this.loadSchools();
    this.loadMonitors();
  }

  loadSchools() {
    this.superadminService.listSchools({ perPage: 200 }).subscribe({
      next: (response: any) => {
        this.schools = response?.data || [];
      }
    });
  }

  loadMonitors() {
    this.superadminService.listMonitors({ perPage: 200 }).subscribe({
      next: (response: any) => {
        this.monitors = response?.data || [];
      }
    });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = { ...this.form.value };
    this.loading = true;
    this.superadminService.createNotification(payload).subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  close() {
    this.dialogRef.close(false);
  }
}
