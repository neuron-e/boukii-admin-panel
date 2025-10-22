import { Component, OnInit } from '@angular/core';
import { TableColumn } from 'src/@vex/interfaces/table-column.interface';
import { BonusesCreateUpdateComponent } from './bonuses-create-update/bonuses-create-update.component';
import { TransferVoucherDialogComponent } from './transfer-voucher-dialog/transfer-voucher-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ApiCrudService } from 'src/service/crud.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { DiscountsCreateUpdateComponent } from '../discounts/discounts-create-update/discounts-create-update.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';

@Component({
  selector: 'vex-bonuses',
  templateUrl: './bonuses.component.html',
  styleUrls: ['./bonuses.component.scss']
})
export class BonusesComponent implements OnInit {

  private readonly TAB_PURCHASE = 0;
  private readonly TAB_DISCOUNTS = 1;
  private readonly TAB_GIFT = 2;

  private readonly voucherColumns: TableColumn<any>[] = [
    { label: 'ID', property: 'code', type: 'text_copyable', visible: true, cssClasses: ['font-medium'] },
    { label: 'Nombre del bono', property: 'name', type: 'text', visible: true },
    { label: 'Valor', property: 'quantity', type: 'currency', visible: true },
    { label: 'Cliente asignado', property: 'client', type: 'client', visible: true },
    { label: 'Estado', property: 'payed', type: 'badge', visible: true },
    { label: 'Fecha creación', property: 'created_at', type: 'date', visible: true },
    { label: 'Acciones', property: 'actions', type: 'button', visible: true }
  ];

  private readonly discountColumns: TableColumn<any>[] = [
    { label: 'Código', property: 'code', type: 'text_copyable', visible: true, cssClasses: ['font-medium'] },
    { label: 'Tipo', property: 'discount_type', type: 'text', visible: true },
    { label: 'Valor', property: 'discount_value', type: 'currency', visible: true },
    { label: 'Aplicable a', property: 'applicable_to', type: 'text', visible: true },
    { label: 'Fecha expiración', property: 'valid_to', type: 'date', visible: true },
    { label: 'Usos', property: 'remaining', type: 'text', visible: true },
    { label: 'Estado', property: 'active', type: 'badge', visible: true },
    { label: 'Acciones', property: 'actions', type: 'button', visible: true }
  ];

  createComponent: any = BonusesCreateUpdateComponent;
  columns: TableColumn<any>[] = this.voucherColumns;
  entity = '/vouchers';
  deleteEntity = '/vouchers';
  icon = '../../../assets/img/icons/bonos.svg';
  currentRoute = 'vouchers';
  currentWith: any = ['client'];
  user: any;

  selectedTab = this.TAB_PURCHASE;
  currentTitle = 'purchase_vouchers';
  searchParams = '&is_gift=0';

  // Gift vouchers data
  giftVouchers: any[] = [];

  constructor(
    private dialog: MatDialog,
    private crudService: ApiCrudService,
    private snackbar: MatSnackBar,
    private translateService: TranslateService,
    private route: ActivatedRoute,
    private router: Router,
    private clipboard: Clipboard
  ) {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
  }

  ngOnInit() {
    // Check for initial navigation from /discounts route
    const tabParam = (this.route.snapshot.queryParamMap.get('tab') || '').toLowerCase();
    if (tabParam === 'discounts') {
      this.selectedTab = this.TAB_DISCOUNTS;
    }
    this.configureTab(this.selectedTab);
  }

  onTabChange(tabIndex: number) {
    this.configureTab(tabIndex);
  }

  private configureTab(tabIndex: number) {
    this.selectedTab = tabIndex;

    if (tabIndex === this.TAB_DISCOUNTS) {
      this.columns = this.discountColumns;
      this.createComponent = DiscountsCreateUpdateComponent;
      this.entity = '/discount-codes';
      this.deleteEntity = '/discount-codes';
      this.currentRoute = 'discounts';
      this.currentWith = [];
      this.currentTitle = 'discount_codes';
      this.searchParams = '';
    } else if (tabIndex === this.TAB_GIFT) {
      // Gift vouchers - load data for card view
      this.columns = this.voucherColumns;
      this.createComponent = BonusesCreateUpdateComponent;
      this.entity = '/vouchers';
      this.deleteEntity = '/vouchers';
      this.currentRoute = 'vouchers';
      this.currentWith = ['client'];
      this.searchParams = '&is_gift=1';
      this.currentTitle = 'gift_vouchers';
      this.loadGiftVouchers();
    } else {
      // Purchase vouchers
      this.columns = this.voucherColumns;
      this.createComponent = BonusesCreateUpdateComponent;
      this.entity = '/vouchers';
      this.deleteEntity = '/vouchers';
      this.currentRoute = 'vouchers';
      this.currentWith = ['client'];
      this.searchParams = '&is_gift=0';
      this.currentTitle = 'purchase_vouchers';
    }
  }

  toggleGenericVouchers() {
    // This method can be removed or repurposed
  }

  openTransferDialog(voucher: any) {
    if (this.selectedTab === this.TAB_DISCOUNTS) {
      return;
    }

    if (!voucher.is_transferable) {
      this.snackbar.open(
        this.translateService.instant('This voucher is not transferable'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    if (voucher.transferred_at) {
      this.snackbar.open(
        this.translateService.instant('This voucher has already been transferred'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    if (voucher.remaining_balance <= 0) {
      this.snackbar.open(
        this.translateService.instant('This voucher has no remaining balance'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    const dialogRef = this.dialog.open(TransferVoucherDialogComponent, {
      width: '600px',
      data: { voucher }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.snackbar.open(
          this.translateService.instant('Voucher transferred successfully'),
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  // Gift vouchers card view methods
  loadGiftVouchers() {
    const params = `?with[]=client&is_gift=1`;
    this.crudService.list('/vouchers' + params).subscribe({
      next: (response: any) => {
        this.giftVouchers = response.data || [];
      },
      error: (error) => {
        console.error('Error loading gift vouchers:', error);
        this.giftVouchers = [];
      }
    });
  }

  createGiftVoucher() {
    const dialogRef = this.dialog.open(BonusesCreateUpdateComponent, {
      width: '800px',
      height: '90vh',
      data: { isGift: true }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadGiftVouchers();
        this.snackbar.open(
          this.translateService.instant('Gift voucher created successfully'),
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  viewVoucher(voucher: any) {
    const dialogRef = this.dialog.open(BonusesCreateUpdateComponent, {
      width: '800px',
      height: '90vh',
      data: { voucher, viewMode: true }
    });
  }

  editVoucher(voucher: any) {
    const dialogRef = this.dialog.open(BonusesCreateUpdateComponent, {
      width: '800px',
      height: '90vh',
      data: { voucher }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadGiftVouchers();
        this.snackbar.open(
          this.translateService.instant('Voucher updated successfully'),
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  copyCode(code: string) {
    this.clipboard.copy(code);
    this.snackbar.open(
      this.translateService.instant('Code copied to clipboard'),
      'OK',
      { duration: 2000 }
    );
  }

  exportDiscounts() {
    // Get current discount codes data
    const params = `?with[]=courses&with[]=clients`;
    this.crudService.list('/discount-codes' + params).subscribe({
      next: (response: any) => {
        const discounts = response.data || [];

        // Prepare CSV data
        const csvData = this.prepareDiscountCSV(discounts);

        // Create and download CSV
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `discount-codes-${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.snackbar.open(
          this.translateService.instant('Discount codes exported successfully'),
          'OK',
          { duration: 3000 }
        );
      },
      error: (error) => {
        console.error('Error exporting discounts:', error);
        this.snackbar.open(
          this.translateService.instant('Error exporting discount codes'),
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  private prepareDiscountCSV(discounts: any[]): string {
    const headers = [
      'Code',
      'Name',
      'Type',
      'Value',
      'Applicable To',
      'Valid From',
      'Valid To',
      'Total Uses',
      'Remaining',
      'Active'
    ];

    const rows = discounts.map(discount => [
      discount.code || '',
      discount.name || '',
      discount.discount_type || '',
      discount.discount_value || '',
      discount.applicable_to || '',
      discount.valid_from || '',
      discount.valid_to || '',
      discount.total || '',
      discount.remaining || '',
      discount.active ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  shareDiscount(discount: any) {
    const shareText = `${discount.name}\nCode: ${discount.code}\nType: ${discount.discount_type}\nValue: ${discount.discount_value}`;

    if (navigator.share) {
      navigator.share({
        title: 'Discount Code',
        text: shareText
      }).then(() => {
        this.snackbar.open(
          this.translateService.instant('Discount shared successfully'),
          'OK',
          { duration: 2000 }
        );
      }).catch((error) => {
        console.error('Error sharing:', error);
        // Fallback to copying to clipboard
        this.clipboard.copy(shareText);
        this.snackbar.open(
          this.translateService.instant('Discount details copied to clipboard'),
          'OK',
          { duration: 2000 }
        );
      });
    } else {
      // Fallback to copying to clipboard
      this.clipboard.copy(shareText);
      this.snackbar.open(
        this.translateService.instant('Discount details copied to clipboard'),
        'OK',
        { duration: 2000 }
      );
    }
  }
}

