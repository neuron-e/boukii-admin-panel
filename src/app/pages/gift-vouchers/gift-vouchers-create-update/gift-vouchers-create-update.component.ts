import { Component, OnInit, Inject } from '@angular/core';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { fadeInUp400ms } from 'src/@vex/animations/fade-in-up.animation';
import { stagger20ms } from 'src/@vex/animations/stagger.animation';
import { Observable, map, startWith } from 'rxjs';
import { ApiCrudService } from 'src/service/crud.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'vex-gift-vouchers-create-update',
  templateUrl: './gift-vouchers-create-update.component.html',
  styleUrls: ['./gift-vouchers-create-update.component.scss'],
  animations: [fadeInUp400ms, stagger20ms]
})
export class GiftVouchersCreateUpdateComponent implements OnInit {

  mode: 'create' | 'update' = 'create';
  defaults: any = {
    amount: null,
    personal_message: null,
    sender_name: null,
    recipient_email: null,
    recipient_name: null,
    delivery_date: null,
    is_delivered: false,
    is_redeemed: false,
    purchased_by_client_id: null,
    school_id: null,
    is_paid: false,
    payment_reference: null,
    notes: null
  };

  user: any;
  loading: boolean = true;
  form: UntypedFormGroup;
  clientsForm = new FormControl('');
  filteredOptions: Observable<any[]>;
  sendImmediately: boolean = true;

  clients = [];
  id: any = null;
  giftVoucherSummary: any = null;

  constructor(
    private fb: UntypedFormBuilder,
    private crudService: ApiCrudService,
    private translateService: TranslateService,
    private snackbar: MatSnackBar,
    public dialogRef: MatDialogRef<GiftVouchersCreateUpdateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));

    // Set mode and id from dialog data
    this.mode = data?.mode || 'create';
    this.id = data?.id || null;

    this.form = this.fb.group({
      amount: [null, [Validators.required, Validators.min(1)]],
      sender_name: [null, Validators.required],
      personal_message: [null],
      recipient_email: [null, [Validators.required, Validators.email]],
      recipient_name: [null, Validators.required],
      delivery_date: [null],
      is_paid: [false],
      payment_reference: [null],
      notes: [null]
    });
  }

  ngOnInit() {
    if (this.mode === 'update' && this.id) {
      this.getGiftVoucher();
    } else {
      this.loading = false;
    }

    this.getClients();

    // Handle send immediately toggle
    if (this.sendImmediately) {
      this.form.get('delivery_date')?.clearValidators();
      this.form.get('delivery_date')?.updateValueAndValidity();
    }
  }

  onSendImmediatelyChange() {
    if (this.sendImmediately) {
      this.defaults.delivery_date = null;
      this.form.get('delivery_date')?.clearValidators();
    } else {
      this.form.get('delivery_date')?.setValidators([Validators.required]);
    }
    this.form.get('delivery_date')?.updateValueAndValidity();
  }

  save() {
    if (this.form.invalid) {
      this.snackbar.open(
        this.translateService.instant('Please fill all required fields'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    if (this.mode === 'create') {
      this.create();
    } else if (this.mode === 'update') {
      this.update();
    }
  }

  create() {
    const formValue = this.form.value;
    const data: any = {
      amount: formValue.amount,
      personal_message: formValue.personal_message,
      sender_name: formValue.sender_name,
      recipient_email: formValue.recipient_email,
      recipient_name: formValue.recipient_name,
      delivery_date: this.sendImmediately ? null : formValue.delivery_date,
      purchased_by_client_id: this.defaults.purchased_by_client_id?.id || null,
      school_id: this.user.schools[0].id,
      is_paid: formValue.is_paid,
      payment_reference: formValue.payment_reference,
      notes: formValue.notes
    };

    this.crudService.create('/gift-vouchers', data)
      .subscribe({
        next: (res) => {
          this.snackbar.open(
            this.translateService.instant('Gift voucher created successfully'),
            'OK',
            { duration: 3000 }
          );
          this.dialogRef.close(res);
        },
        error: (error) => {
          console.error('Error creating gift voucher:', error);
          const errorMsg = error.error?.message || 'Error creating gift voucher';
          this.snackbar.open(this.translateService.instant(errorMsg), 'OK', { duration: 3000 });
        }
      });
  }

  update() {
    const formValue = this.form.value;
    const data: any = {
      amount: formValue.amount,
      personal_message: formValue.personal_message,
      sender_name: formValue.sender_name,
      recipient_email: formValue.recipient_email,
      recipient_name: formValue.recipient_name,
      delivery_date: this.sendImmediately ? null : formValue.delivery_date,
      purchased_by_client_id: this.defaults.purchased_by_client_id?.id || null,
      school_id: this.user.schools[0].id,
      is_paid: formValue.is_paid,
      payment_reference: formValue.payment_reference,
      notes: formValue.notes
    };

    this.crudService.update('/gift-vouchers', data, this.id)
      .subscribe({
        next: (res) => {
          this.snackbar.open(
            this.translateService.instant('Gift voucher updated successfully'),
            'OK',
            { duration: 3000 }
          );
          this.dialogRef.close(res);
        },
        error: (error) => {
          console.error('Error updating gift voucher:', error);
          const errorMsg = error.error?.message || 'Error updating gift voucher';
          this.snackbar.open(this.translateService.instant(errorMsg), 'OK', { duration: 3000 });
        }
      });
  }

  private _filter(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.clients.filter(client =>
      (client.first_name.toLowerCase().includes(filterValue) ||
       client.last_name.toLowerCase().includes(filterValue))
    );
  }

  displayFn(client: any): string {
    return client && client?.first_name && client?.last_name
      ? client?.first_name + ' ' + client?.last_name
      : client?.first_name;
  }

  getClients() {
    this.crudService.list('/clients', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id)
      .subscribe({
        next: (data: any) => {
          this.clients = data.data;
          this.filteredOptions = this.clientsForm.valueChanges.pipe(
            startWith(''),
            map((value: any) => typeof value === 'string' ? value : value?.name),
            map(full_name => full_name ? this._filter(full_name) : this.clients.slice(0, 50))
          );

          if (this.mode === 'update' && this.defaults.purchased_by_client_id) {
            this.defaults.purchased_by_client_id = this.clients.find(
              (c) => this.defaults.purchased_by_client_id === c.id
            );
          }
        },
        error: (error) => {
          console.error('Error fetching clients:', error);
          this.snackbar.open(
            this.translateService.instant('Error loading clients'),
            'OK',
            { duration: 3000 }
          );
        }
      });
  }


  getGiftVoucher() {
    this.crudService.get('/gift-vouchers/' + this.id)
      .subscribe({
        next: (data: any) => {
          this.defaults = data.data;
          this.sendImmediately = !this.defaults.delivery_date;

          // Populate form with loaded data
          this.form.patchValue({
            amount: this.defaults.amount,
            sender_name: this.defaults.sender_name,
            personal_message: this.defaults.personal_message,
            recipient_email: this.defaults.recipient_email,
            recipient_name: this.defaults.recipient_name,
            delivery_date: this.defaults.delivery_date,
            is_paid: this.defaults.is_paid,
            payment_reference: this.defaults.payment_reference,
            notes: this.defaults.notes
          });

          // Set client autocomplete if exists
          if (this.defaults.purchased_by_client_id) {
            this.defaults.purchased_by_client_id = this.clients.find(
              (c) => this.defaults.purchased_by_client_id === c.id
            );
          }

          // Get summary for additional info
          this.getGiftVoucherSummary();

          this.loading = false;
        },
        error: (error) => {
          console.error('Error fetching gift voucher:', error);
          this.snackbar.open(
            this.translateService.instant('Error loading gift voucher'),
            'OK',
            { duration: 3000 }
          );
          this.loading = false;
        }
      });
  }

  getGiftVoucherSummary() {
    this.crudService.get('/gift-vouchers/' + this.id + '/summary')
      .subscribe({
        next: (data: any) => {
          this.giftVoucherSummary = data.data;
        },
        error: (error) => {
          console.error('Error fetching gift voucher summary:', error);
        }
      });
  }

  close() {
    this.dialogRef.close();
  }

  get canBeRedeemed(): boolean {
    return this.defaults.is_delivered && !this.defaults.is_redeemed;
  }

  get canBeDelivered(): boolean {
    return !this.defaults.is_delivered;
  }
}
