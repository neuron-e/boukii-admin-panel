import { Component, OnInit, ViewChild } from '@angular/core';
import { TableColumn } from 'src/@vex/interfaces/table-column.interface';
import { AioTableComponent } from 'src/@vex/components/aio-table/aio-table.component';
import { BonusesCreateUpdateComponent } from './bonuses-create-update/bonuses-create-update.component';
import { TransferVoucherDialogComponent } from './transfer-voucher-dialog/transfer-voucher-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ApiCrudService } from 'src/service/crud.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { DiscountsCreateUpdateComponent } from '../discounts/discounts-create-update/discounts-create-update.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { SchoolService } from 'src/service/school.service';

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
    { label: 'code', property: 'code', type: 'text_copyable', visible: true, cssClasses: ['font-medium'] },
    { label: 'amount', property: 'quantity', type: 'currency', visible: true },
    { label: 'voucher.assigned_client', property: 'client', type: 'client', visible: true },
    { label: 'voucher.buyer', property: 'buyer_name', type: 'text', visible: true },
    { label: 'uses', property: 'uses_count', type: 'text', visible: true },
    { label: 'status', property: 'payed', type: 'badge', visible: true },
    { label: 'voucher.creation_date', property: 'created_at', type: 'date', visible: true },
    { label: 'actions', property: 'actions', type: 'button', visible: true }
  ];

  private readonly discountColumns: TableColumn<any>[] = [
    { label: 'code', property: 'code', type: 'text_copyable', visible: true, cssClasses: ['font-medium'] },
    { label: 'name', property: 'name', type: 'text', visible: true },
    { label: 'discount_type', property: 'discount_type', type: 'text', visible: true },
    { label: 'discount_value', property: 'discount_value', type: 'currency', visible: true },
    { label: 'applicable_to', property: 'applicable_to', type: 'text', visible: true },
    { label: 'valid_to', property: 'valid_to', type: 'date', visible: true },
    { label: 'uses', property: 'remaining', type: 'text', visible: true },
    { label: 'status', property: 'active', type: 'badge', visible: true },
    { label: 'actions', property: 'actions', type: 'button', visible: true }
  ];

  createComponent: any = BonusesCreateUpdateComponent;
  columns: TableColumn<any>[] = this.voucherColumns;
  entity = '/vouchers';
  deleteEntity = '/vouchers';
  icon = '../../../assets/img/icons/bonos.svg';
  currentRoute = 'vouchers';
  currentWith: any = ['client', 'vouchersLogs'];
  user: any;

  selectedTab = this.TAB_PURCHASE;
  currentTitle = 'purchase_vouchers';
  searchParams = '&is_gift=0';

  // Currency code from school settings
  currencyCode: string = 'EUR';

  // Gift vouchers data
  giftVouchers: any[] = [];
  giftVouchersViewMode: 'cards' | 'table' = 'cards'; // Toggle between card and table view
  private readonly giftVouchersCardsPerPage = 50;

  @ViewChild('giftVouchersTableRef') giftVouchersTable?: AioTableComponent;

  // Gift vouchers table configuration
  giftVouchersTableColumns: TableColumn<any>[] = [
    { label: 'code', property: 'code', type: 'text_copyable', visible: true, cssClasses: ['font-medium'] },
    { label: 'voucher.buyer', property: 'buyer_name', type: 'text', visible: true },
    { label: 'recipient', property: 'recipient_name', type: 'text', visible: true },
    { label: 'amount', property: 'quantity', type: 'currency', visible: true },
    { label: 'uses', property: 'uses_count', type: 'text', visible: true },
    { label: 'status', property: 'payed', type: 'badge', visible: true },
    { label: 'voucher.creation_date', property: 'created_at', type: 'date', visible: true },
    { label: 'actions', property: 'actions', type: 'button', visible: true }
  ];
  giftVouchersTableEntity = '/vouchers';
  giftVouchersTableDeleteEntity = '/vouchers';
  giftVouchersTableRoute = 'vouchers';
  giftVouchersCreateComponent: any = BonusesCreateUpdateComponent;
  giftVouchersTableWith: any = ['client', 'vouchersLogs'];
  giftVouchersTableSearch = '&is_gift=1';

  constructor(
    private dialog: MatDialog,
    private crudService: ApiCrudService,
    private snackbar: MatSnackBar,
    private translateService: TranslateService,
    private route: ActivatedRoute,
    private router: Router,
    private clipboard: Clipboard,
    private schoolService: SchoolService
  ) {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
  }

  ngOnInit() {
    // Load currency symbol from school settings
    this.loadCurrencySymbol();

    // Check for initial navigation from /discounts route
    const tabParam = (this.route.snapshot.queryParamMap.get('tab') || '').toLowerCase();
    if (tabParam === 'discounts') {
      this.selectedTab = this.TAB_DISCOUNTS;
    }
    this.configureTab(this.selectedTab);
  }

  private loadCurrencySymbol() {
    this.schoolService.getSchoolData().subscribe({
      next: (response: any) => {
        const currency =
          response?.data?.taxes?.currency ||
          response?.data?.currency ||
          response?.currency ||
          this.user?.schools?.[0]?.taxes?.currency ||
          this.user?.schools?.[0]?.currency;
        this.currencyCode = currency || this.currencyCode;
      },
      error: (error) => {
        console.error('Error loading school settings:', error);
        // Keep default EUR if error
      }
    });
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
      this.currentWith = ['client', 'vouchersLogs'];
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
      this.currentWith = ['client', 'vouchersLogs'];
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
        this.translateService.instant('voucher.not_transferable'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    if (voucher.transferred_at) {
      this.snackbar.open(
        this.translateService.instant('voucher.already_transferred'),
        'OK',
        { duration: 3000 }
      );
      return;
    }

    if (voucher.remaining_balance <= 0) {
      this.snackbar.open(
        this.translateService.instant('voucher.no_balance'),
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
          this.translateService.instant('voucher.transfer_success'),
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  // Gift vouchers card view methods
  loadGiftVouchers(page = 1) {
    const schoolId = this.user?.schools?.[0]?.id;
    let searchQuery = '&is_gift=1';

    if (schoolId) {
      searchQuery += `&school_id=${schoolId}`;
    }

    this.crudService.list(
      '/vouchers',
      page,
      this.giftVouchersCardsPerPage,
      'desc',
      'id',
      searchQuery,
      '',
      null,
      '',
      ['client', 'vouchersLogs']
    ).subscribe({
      next: (response: any) => {
        const rawData = response?.data;
        const rawVouchers = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.data)
            ? rawData.data
            : [];
        this.giftVouchers = rawVouchers.map((voucher: any) => this.normalizeGiftVoucher(voucher));
        this.refreshGiftVouchersTable();
      },
      error: (error) => {
        console.error('Error loading gift vouchers:', error);
        this.giftVouchers = [];
        this.refreshGiftVouchersTable();
      }
    });
  }

  createGiftVoucher() {
    const dialogRef = this.dialog.open(BonusesCreateUpdateComponent, {
      width: '800px',
      height: '90vh',
      data: { mode: 'create', isGift: true }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadGiftVouchers();
        this.snackbar.open(
          this.translateService.instant('gift_voucher.created_success'),
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
      data: {
        mode: 'update',
        id: voucher?.id,
        voucher,
        readOnly: true,
        viewMode: true
      }
    });
  }

  editVoucher(voucher: any) {
    const dialogRef = this.dialog.open(BonusesCreateUpdateComponent, {
      width: '800px',
      height: '90vh',
      data: {
        mode: 'update',
        id: voucher?.id,
        voucher
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadGiftVouchers();
        this.snackbar.open(
          this.translateService.instant('voucher.updated_success'),
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  copyCode(code: string) {
    this.clipboard.copy(code);
    this.snackbar.open(
      this.translateService.instant('voucher.copy_success'),
      'OK',
      { duration: 2000 }
    );
  }

  deleteVoucher(voucher: any) {

    const confirmDelete = window.confirm(this.translateService.instant('delete_confirm') || 'Delete voucher?');
    if (!confirmDelete) {
      return;
    }

    this.crudService.delete(this.deleteEntity, voucher.id).subscribe({
      next: () => {
        this.snackbar.open(
          this.translateService.instant('voucher.deleted_success'),
          'OK',
          { duration: 3000 }
        );
        this.loadGiftVouchers();
      },
      error: (error) => {
        console.error('Error deleting voucher:', error);
        this.snackbar.open(
          this.translateService.instant('voucher.error_delete'),
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  private refreshGiftVouchersTable(): void {
    if (!this.giftVouchersTable) {
      return;
    }

    const pageIndex = this.giftVouchersTable.pageIndex || 1;
    const pageSize = this.giftVouchersTable.pageSize || 10;

    this.giftVouchersTable.getData(pageIndex, pageSize);
  }

  private normalizeGiftVoucher(voucher: any): any {
    if (!voucher) {
      return voucher;
    }

    const client = voucher.client;
    const buyerName =
      voucher.buyer_name ??
      voucher.sender_name ??
      voucher.buyer?.name ??
      voucher.buyerName ??
      '';

    const clientName = client
      ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim()
      : '';

    const recipientName =
      voucher.recipient_name ??
      voucher.recipientName ??
      clientName;

    const quantity =
      voucher.quantity ??
      voucher.amount ??
      voucher.value ??
      0;

    let payedValue = voucher.payed;
    if (typeof payedValue !== 'boolean') {
      if (payedValue === 1 || payedValue === '1') {
        payedValue = true;
      } else if (payedValue === 0 || payedValue === '0') {
        payedValue = false;
      } else {
        const status = (voucher.status || '').toString().toLowerCase();
        if (status === 'used' || status === 'redeemed' || status === 'paid') {
          payedValue = true;
        } else if (status === 'pending' || status === 'active') {
          payedValue = false;
        } else if (typeof voucher.remaining_balance === 'number') {
          payedValue = voucher.remaining_balance <= 0;
        } else {
          payedValue = Boolean(payedValue);
        }
      }
    }

    const createdAt =
      voucher.created_at ??
      voucher.createdAt ??
      voucher.created_at_formatted ??
      voucher.created_at_iso ??
      voucher.created;

    const notes = voucher.notes ?? voucher.description ?? voucher.message ?? '';
    const logs = voucher.vouchers_logs ?? voucher.vouchersLogs ?? [];
    const usesCount = voucher.uses_count ?? (Array.isArray(logs) ? logs.length : 0);
    const remainingBalance = voucher.remaining_balance ?? voucher.remainingBalance ?? voucher.quantity;

    return {
      ...voucher,
      buyer_name: buyerName,
      recipient_name: recipientName,
      quantity,
      payed: payedValue,
      created_at: createdAt,
      notes,
      logs,
      uses_count: usesCount,
      remaining_balance: remainingBalance
    };
  }

  toggleGiftVouchersView() {
    this.giftVouchersViewMode = this.giftVouchersViewMode === 'cards' ? 'table' : 'cards';

    if (this.giftVouchersViewMode === 'table') {
      setTimeout(() => this.refreshGiftVouchersTable(), 0);
    } else {
      this.loadGiftVouchers();
    }
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
          this.translateService.instant('discount.export_success'),
          'OK',
          { duration: 3000 }
        );
      },
      error: (error) => {
        console.error('Error exporting discounts:', error);
        this.snackbar.open(
          this.translateService.instant('discount.export_error'),
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
    const shareText = `${discount.name}\n${this.translateService.instant('code')}: ${discount.code}\n${this.translateService.instant('discount_type')}: ${discount.discount_type}\n${this.translateService.instant('discount_value')}: ${discount.discount_value}`;

    if (navigator.share) {
      navigator.share({
        title: 'Discount Code',
        text: shareText
      }).then(() => {
        this.snackbar.open(
          this.translateService.instant('discount.share_success'),
          'OK',
          { duration: 2000 }
        );
      }).catch((error) => {
        console.error('Error sharing:', error);
        // Fallback to copying to clipboard
        this.clipboard.copy(shareText);
        this.snackbar.open(
          this.translateService.instant('discount.copy_details'),
          'OK',
          { duration: 2000 }
        );
      });
    } else {
      // Fallback to copying to clipboard
      this.clipboard.copy(shareText);
      this.snackbar.open(
        this.translateService.instant('discount.copy_details'),
        'OK',
        { duration: 2000 }
      );
    }
  }
}

