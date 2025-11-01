import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, map, startWith } from 'rxjs';
import { ApiCrudService } from 'src/service/crud.service';
import { SchoolService } from 'src/service/school.service';

@Component({
  selector: 'vex-refund-booking',
  templateUrl: './refund-booking.component.html',
  styleUrls: ['./refund-booking.scss']
})
export class RefundBookingModalComponent implements OnInit {

  loading = true;
  selectedBonus = [];
  unifyBonus = false;
  reason = '';

  noRefundForm: FormGroup;
  refundForm: FormGroup;
  bonusForm: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public defaults: any, private crudService: ApiCrudService, private snackbar: MatSnackBar,
    private fb: UntypedFormBuilder, private dialogRef: MatDialogRef<any>, public schoolService: SchoolService) {

  }

  ngOnInit(): void {

    this.refundForm = this.fb.group({
      reason: ['', Validators.required]
    })
   this.loading = false;
  }

  closeAndSave(type: string) {
    this.dialogRef.close({type: type});
  }

  closeAndSaveRefund(type: string, reason: string) {
    this.dialogRef.close({type: type, reason: reason});
  }

  closeAndSaveGift(type: string) {
    this.dialogRef.close({type: type});
  }

  setReason(event: any) {
    this.reason = event.target.value;
  }
}
