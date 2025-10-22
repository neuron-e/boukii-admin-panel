import { Component, OnInit } from '@angular/core';
import { TableColumn } from 'src/@vex/interfaces/table-column.interface';
import { GiftVouchersCreateUpdateComponent } from './gift-vouchers-create-update/gift-vouchers-create-update.component';
import { RedeemGiftVoucherDialogComponent } from './redeem-gift-voucher-dialog/redeem-gift-voucher-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ApiCrudService } from 'src/service/crud.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'vex-gift-vouchers',
  templateUrl: './gift-vouchers.component.html',
  styleUrls: ['./gift-vouchers.component.scss']
})
export class GiftVouchersComponent implements OnInit {

  createComponent = GiftVouchersCreateUpdateComponent;
  entity = '/gift-vouchers';
  deleteEntity = '/gift-vouchers';
  icon = '../../../assets/img/icons/gift.svg';
  user: any;

  filterStatus: string = 'all'; // all, pending, delivered, redeemed

  columns: TableColumn<any>[] = [
    { label: 'recipient', property: 'recipient_email', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'recipient_name', property: 'recipient_name', type: 'text', visible: true },
    { label: 'amount', property: 'amount', type: 'currency', visible: true },
    { label: 'template', property: 'template', type: 'badge', visible: true },
    { label: 'sender', property: 'sender_name', type: 'text', visible: true },
    { label: 'delivery_date', property: 'delivery_date', type: 'date', visible: true },
    { label: 'delivered', property: 'is_delivered', type: 'boolean', visible: true },
    { label: 'redeemed', property: 'is_redeemed', type: 'boolean', visible: true },
    { label: 'status', property: 'status', type: 'gift-voucher-status', visible: true },
    { label: 'Actions', property: 'actions', type: 'button', visible: true }
  ];

  constructor(
    private dialog: MatDialog,
    private crudService: ApiCrudService,
    private snackbar: MatSnackBar,
    private translateService: TranslateService
  ) {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
  }

  ngOnInit() {
  }

  openRedeemDialog(giftVoucher: any) {
    if (!giftVoucher.is_delivered) {
      this.snackbar.open(
        this.translateService.instant('This gift voucher has not been delivered yet'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    if (giftVoucher.is_redeemed) {
      this.snackbar.open(
        this.translateService.instant('This gift voucher has already been redeemed'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    const dialogRef = this.dialog.open(RedeemGiftVoucherDialogComponent, {
      width: '600px',
      data: { giftVoucher }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackbar.open(
          this.translateService.instant('Gift voucher redeemed successfully'),
          'OK',
          { duration: 3000 }
        );
        // Refresh the list - the aio-table component should handle this
      }
    });
  }

  markAsDelivered(giftVoucher: any) {
    if (giftVoucher.is_delivered) {
      this.snackbar.open(
        this.translateService.instant('This gift voucher has already been delivered'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    const confirmed = confirm(this.translateService.instant('Are you sure you want to mark this gift voucher as delivered?'));
    if (!confirmed) return;

    this.crudService.post('/gift-vouchers/' + giftVoucher.id + '/deliver', {})
      .subscribe({
        next: (response: any) => {
          this.snackbar.open(
            this.translateService.instant('Gift voucher marked as delivered'),
            'OK',
            { duration: 3000 }
          );
          // Refresh the list
        },
        error: (error) => {
          console.error('Error marking gift voucher as delivered:', error);
          const errorMsg = error.error?.message || 'Error marking gift voucher as delivered';
          this.snackbar.open(this.translateService.instant(errorMsg), 'OK', { duration: 5000 });
        }
      });
  }

  filterByStatus(status: string) {
    this.filterStatus = status;
    // This would trigger a re-fetch with filter in the aio-table component
    // You may need to implement custom filtering logic in the aio-table
  }

  getPendingDelivery() {
    // Navigate or filter to show only pending delivery vouchers
    this.filterByStatus('pending');
  }
}
