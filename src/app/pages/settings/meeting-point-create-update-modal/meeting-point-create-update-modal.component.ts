import { Component, Inject, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'vex-meeting-point-create-update-modal',
  templateUrl: './meeting-point-create-update-modal.component.html',
  styleUrls: ['./meeting-point-create-update-modal.component.scss']
})
export class MeetingPointCreateUpdateModalComponent implements OnInit {
  form: UntypedFormGroup;
  mode: 'create' | 'update' = 'create';

  constructor(
    @Inject(MAT_DIALOG_DATA) public defaults: any,
    private fb: UntypedFormBuilder,
    private dialogRef: MatDialogRef<MeetingPointCreateUpdateModalComponent>
  ) {}

  ngOnInit(): void {
    this.mode = this.defaults && this.defaults.id ? 'update' : 'create';

    this.form = this.fb.group({
      name: [this.defaults?.name || '', Validators.required],
      address: [this.defaults?.address || ''],
      instructions: [this.defaults?.instructions || ''],
      active: [this.defaults?.active ?? true]
    });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      ...this.defaults,
      ...this.form.getRawValue()
    };

    this.dialogRef.close(payload);
  }

  close() {
    this.dialogRef.close();
  }

  isCreateMode(): boolean {
    return this.mode === 'create';
  }

  isUpdateMode(): boolean {
    return this.mode === 'update';
  }
}
