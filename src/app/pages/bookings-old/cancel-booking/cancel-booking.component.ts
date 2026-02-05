import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, map, startWith } from 'rxjs';
import { ApiCrudService } from 'src/service/crud.service';
import { SchoolService } from 'src/service/school.service';

@Component({
  selector: 'vex-cancel-booking',
  templateUrl: './cancel-booking.component.html',
  styleUrls: ['./cancel-booking.scss']
})
export class CancelBookingModalComponent implements OnInit {

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


  getCurrentUse(bonus: any) {
    let ret = 0;
    this.defaults.currentBonusLog.forEach(element => {
      if (element.voucher_id === bonus.bonus.id) {
        ret = parseFloat(element.amount);
      }
    });

    return ret;
  }

  calculateCurrentPriceReducingItem(item) {
    let ret = this.defaults.itemPrice;
    this.defaults.currentBonus.forEach(element => {
      if (element.bonus.id !== item.bonus.id) {
        ret = ret - element.bonus.currentPay;
      }

    });

    return item.bonus.currentPay >= ret;
  }

  checkBonus(event, item) {
    if (event.source.checked) {
      this.selectedBonus.push(item);
    } else {
      const index = this.selectedBonus.findIndex((b) => b.id === item.bonus.id);
      this.selectedBonus.splice(index, 1);
    }
  }

  checkBonusChecked(item: any) {
    return this.selectedBonus.findIndex((s) => s.id == item.bonus.id) !== -1;
  }

  calculateAllRemainingQuantity() {
    let ret = 0;
    if (this.selectedBonus.length > 0) {
      this.selectedBonus.forEach(element => {
        ret = ret + parseFloat(element.bonus.currentPay);
      });
    } else {
      return false;
    }

    return ret >= this.defaults.itemPrice;
  }

  closeAndSave(type: string) {
    this.dialogRef.close({ type: type });
  }

  closeAndSaveRefund(type: string, reason: string) {
    this.dialogRef.close({ type: type, reason: reason });
  }

  closeAndSaveGift(type: string) {
    this.dialogRef.close({ type: type });
  }

  closeAndSaveBonus(type: string) {
    this.dialogRef.close({ type: type, bonus: this.unifyBonus ? this.defaults.currentBonus : this.selectedBonus, unifyBonus: this.unifyBonus });
  }

  setReason(event: any) {
    this.reason = event.target.value;
  }
}
