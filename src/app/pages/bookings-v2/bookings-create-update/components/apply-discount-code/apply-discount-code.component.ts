import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApiCrudService } from 'src/service/crud.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

export interface ApplyDiscountCodeData {
  school_id: number;
  client_id?: number;
  client_user_id?: number;
  amount: number;
  currency?: string;
  courseIds?: number[];
  sportIds?: number[];
  degreeIds?: number[];
}

@Component({
  selector: 'vex-apply-discount-code',
  templateUrl: './apply-discount-code.component.html',
  styleUrls: ['./apply-discount-code.component.scss'],
})
export class ApplyDiscountCodeComponent {
  code = '';
  loading = false;
  validationResult: any | null = null;
  errorMessage: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public defaults: ApplyDiscountCodeData,
    private dialogRef: MatDialogRef<ApplyDiscountCodeComponent>,
    private crudService: ApiCrudService,
    private snackbar: MatSnackBar,
    private translateService: TranslateService
  ) {}

  validateCode(): void {
    this.errorMessage = null;
    this.validationResult = null;
    const trimmed = (this.code || '').trim();
    if (!trimmed) {
      this.errorMessage = this.translateService.instant('discount_code') + ' ' + this.translateService.instant('required');
      return;
    }

    const payload: any = {
      code: trimmed,
      school_id: this.defaults.school_id,
      purchase_amount: this.defaults.amount || 0,
      course_ids: this.defaults.courseIds || [],
      sport_ids: this.defaults.sportIds || [],
      degree_ids: this.defaults.degreeIds || [],
    };

    if (this.defaults.client_id) {
      payload.client_id = this.defaults.client_id;
      payload.client_main_id = this.defaults.client_id;
    }
    if (this.defaults.client_user_id) {
      payload.user_id = this.defaults.client_user_id;
      payload.client_user_id = this.defaults.client_user_id;
    }

    this.loading = true;
    this.crudService
      .post('/discount-codes/validate', payload)
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          const data = res?.data;
          if (!data?.valid) {
            this.errorMessage = data?.message || this.translateService.instant('invalid');
            return;
          }
          this.validationResult = data;
          this.snackbar.open(this.translateService.instant('validated'), 'OK', { duration: 2000 });
        },
        error: (err) => {
          this.loading = false;
          const message =
            err?.error?.message ||
            err?.error?.errors?.discount_code?.[0] ||
            this.translateService.instant('invalid');
          this.errorMessage = message;
          this.snackbar.open(message, 'OK', { duration: 3000 });
        },
      });
  }

  confirm(): void {
    if (!this.validationResult?.discount_code) {
      return;
    }

    const result = this.validationResult;
    const discountCode = result.discount_code;
    const allowedCourseIds =
      (discountCode?.course_ids && Array.isArray(discountCode.course_ids) ? discountCode.course_ids : null) ||
      (result?.code_details?.restrictions?.course_ids && Array.isArray(result.code_details.restrictions.course_ids)
        ? result.code_details.restrictions.course_ids
        : null);

    this.dialogRef.close({
      code: discountCode.code,
      discountCodeId: discountCode.id,
      discountAmount: result.discount_amount || 0,
      courseIds: allowedCourseIds,
    });
  }
}
