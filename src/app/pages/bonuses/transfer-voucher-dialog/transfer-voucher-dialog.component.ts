import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ApiCrudService } from 'src/service/crud.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { Observable, map, startWith } from 'rxjs';

@Component({
  selector: 'vex-transfer-voucher-dialog',
  templateUrl: './transfer-voucher-dialog.component.html',
  styleUrls: ['./transfer-voucher-dialog.component.scss']
})
export class TransferVoucherDialogComponent implements OnInit {

  form: UntypedFormGroup;
  clientsForm = new FormControl('', Validators.required);
  filteredOptions: Observable<any[]>;

  clients = [];
  selectedClient: any = null;
  loading: boolean = true;
  checking: boolean = false;
  transferring: boolean = false;
  canBeUsed: boolean = false;
  availabilityMessage: string = '';
  user: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<TransferVoucherDialogComponent>,
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
       client.last_name.toLowerCase().includes(filterValue))
    );
  }

  displayFn(client: any): string {
    return client && client?.first_name && client?.last_name
      ? client?.first_name + ' ' + client?.last_name
      : client?.first_name;
  }

  getClients() {
    this.crudService.list('/clients', 1, 10000, 'desc', 'id', '&school_id='+this.user.schools[0].id)
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
          this.snackbar.open(this.translateService.instant('voucher.error_loading_clients'), 'OK', {duration: 3000});
          this.loading = false;
        }
      });
  }

  onClientSelected(client: any) {
    this.selectedClient = client;
    if (client && client.id) {
      this.checkAvailability();
    }
  }

  checkAvailability() {
    if (!this.selectedClient || !this.selectedClient.id) return;

    this.checking = true;
    const payload = {
      client_id: this.selectedClient.id
    };

    this.crudService.post('/vouchers/'+this.data.voucher.id+'/check-availability', payload)
      .subscribe({
        next: (response: any) => {
          const data = response?.data || response;
          this.canBeUsed = data?.available ?? data?.can_be_used ?? false;
          const reasons = Array.isArray(data?.reasons) && data.reasons.length
            ? data.reasons.join(', ')
            : '';
          this.availabilityMessage = response?.message || data?.message || reasons;
          this.checking = false;
        },
        error: (error) => {
          console.error('Error checking availability:', error);
          this.canBeUsed = false;
          this.availabilityMessage = error.error?.message || this.translateService.instant('voucher.error_checking_availability');
          this.checking = false;
        }
      });
  }

  transfer() {
    if (!this.selectedClient || !this.selectedClient.id) {
      this.snackbar.open(this.translateService.instant('voucher.select_client'), 'OK', {duration: 3000});
      return;
    }

    if (!this.data.voucher.is_transferable) {
      this.snackbar.open(this.translateService.instant('voucher.not_transferable'), 'OK', {duration: 3000});
      return;
    }

    this.transferring = true;
    const payload = {
      client_id: this.selectedClient.id
    };

    this.crudService.post('/vouchers/'+this.data.voucher.id+'/transfer', payload)
      .subscribe({
        next: (response: any) => {
          this.snackbar.open(
            this.translateService.instant('voucher.transfer_success'),
            'OK',
            {duration: 3000}
          );
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error transferring voucher:', error);
          const errorMsg = error.error?.message || 'voucher.error_transfer';
          this.snackbar.open(this.translateService.instant(errorMsg), 'OK', {duration: 5000});
          this.transferring = false;
        }
      });
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
