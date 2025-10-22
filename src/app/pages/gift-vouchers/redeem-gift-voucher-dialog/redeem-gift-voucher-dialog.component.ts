import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApiCrudService } from 'src/service/crud.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { Observable, map, startWith } from 'rxjs';

@Component({
  selector: 'vex-redeem-gift-voucher-dialog',
  templateUrl: './redeem-gift-voucher-dialog.component.html',
  styleUrls: ['./redeem-gift-voucher-dialog.component.scss']
})
export class RedeemGiftVoucherDialogComponent implements OnInit {

  form: UntypedFormGroup;
  clientsForm = new FormControl('', Validators.required);
  filteredOptions: Observable<any[]>;

  clients = [];
  selectedClient: any = null;
  loading: boolean = true;
  redeeming: boolean = false;
  user: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<RedeemGiftVoucherDialogComponent>,
    private fb: UntypedFormBuilder,
    private crudService: ApiCrudService,
    private snackbar: MatSnackBar,
    private translateService: TranslateService
  ) {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
    this.form = this.fb.group({
      client: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.getClients();
  }

  private _filter(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.clients.filter(client =>
      (client.first_name.toLowerCase().includes(filterValue) ||
       client.last_name.toLowerCase().includes(filterValue) ||
       client.email?.toLowerCase().includes(filterValue))
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
          this.loading = false;
        },
        error: (error) => {
          console.error('Error fetching clients:', error);
          this.snackbar.open(
            this.translateService.instant('Error loading clients'),
            'OK',
            { duration: 3000 }
          );
          this.loading = false;
        }
      });
  }

  onClientSelected(client: any) {
    this.selectedClient = client;
  }

  redeem() {
    if (!this.selectedClient || !this.selectedClient.id) {
      this.snackbar.open(
        this.translateService.instant('Please select a client'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    if (!this.data.giftVoucher.is_delivered) {
      this.snackbar.open(
        this.translateService.instant('This gift voucher has not been delivered yet'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    if (this.data.giftVoucher.is_redeemed) {
      this.snackbar.open(
        this.translateService.instant('This gift voucher has already been redeemed'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    this.redeeming = true;
    const payload = {
      client_id: this.selectedClient.id
    };

    this.crudService.post('/gift-vouchers/' + this.data.giftVoucher.id + '/redeem', payload)
      .subscribe({
        next: (response: any) => {
          this.snackbar.open(
            this.translateService.instant('Gift voucher redeemed successfully'),
            'OK',
            { duration: 3000 }
          );
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error redeeming gift voucher:', error);
          const errorMsg = error.error?.message || 'Error redeeming gift voucher';
          this.snackbar.open(this.translateService.instant(errorMsg), 'OK', { duration: 5000 });
          this.redeeming = false;
        }
      });
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
