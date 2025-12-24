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
  private readonly TAB_GIFT_PURCHASED = 3;

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
  currencyCode: string;

  // Gift vouchers created in admin (vouchers with is_gift=1) data
  giftVouchers: any[] = [];
  giftVouchersViewMode: 'cards' | 'table' = 'cards';
  private readonly giftVouchersCardsPerPage = 50;

  @ViewChild('giftVouchersTableRef') giftVouchersTable?: AioTableComponent;

  // Gift vouchers purchased (from gift_vouchers table) data
  giftVouchersPurchased: any[] = [];
  giftVouchersPurchasedViewMode: 'cards' | 'table' = 'cards';
  private readonly giftVouchersPurchasedCardsPerPage = 50;

  @ViewChild('giftVouchersPurchasedTableRef') giftVouchersPurchasedTable?: AioTableComponent;

  // Gift vouchers table configuration (vouchers with is_gift=1)
  giftVouchersTableColumns: TableColumn<any>[] = [
    { label: 'code', property: 'code', type: 'text_copyable', visible: true, cssClasses: ['font-medium'] },
    { label: 'amount', property: 'quantity', type: 'currency', visible: true },
    { label: 'voucher.assigned_client', property: 'client', type: 'client', visible: true },
    { label: 'voucher.buyer', property: 'buyer_name', type: 'text', visible: true },
    { label: 'recipient', property: 'recipient_name', type: 'text', visible: true },
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

  // Gift vouchers purchased table configuration (gift_vouchers table)
  giftVouchersPurchasedTableColumns: TableColumn<any>[] = [
    { label: 'code', property: 'code', type: 'text_copyable', visible: true, cssClasses: ['font-medium'] },
    { label: 'voucher.buyer', property: 'buyer_name', type: 'text', visible: true },
    { label: 'recipient', property: 'recipient_name', type: 'text', visible: true },
    { label: 'amount', property: 'amount', type: 'currency', visible: true },
    { label: 'status', property: 'status', type: 'badge', visible: true },
    { label: 'is_paid', property: 'is_paid', type: 'badge', visible: true },
    { label: 'voucher.creation_date', property: 'created_at', type: 'date', visible: true },
    { label: 'actions', property: 'actions', type: 'button', visible: true }
  ];
  giftVouchersPurchasedTableEntity = '/gift-vouchers';
  giftVouchersPurchasedTableDeleteEntity = '/gift-vouchers';
  giftVouchersPurchasedTableRoute = 'gift-vouchers';
  giftVouchersPurchasedCreateComponent: any = null; // No creation from admin for purchased vouchers
  giftVouchersPurchasedTableWith: any = ['school', 'purchasedBy', 'redeemedBy', 'voucher'];
  giftVouchersPurchasedTableSearch = '';

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
    this.currencyCode = this.getDefaultCurrency();
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
        const settings = this.parseSettingsPayload(response?.data?.settings ?? response?.settings);
        const currency = this.resolveCurrencyCandidate(
          response?.data?.taxes?.currency,
          response?.data?.currency,
          response?.currency,
          settings?.taxes?.currency,
          this.user?.schools?.[0]?.taxes?.currency,
          this.user?.schools?.[0]?.currency
        );
        this.currencyCode = currency || this.currencyCode;
      },
      error: (error) => {
        console.error('Error loading school settings:', error);
        this.currencyCode = this.getDefaultCurrency();
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
      // Gift vouchers created from admin (vouchers with is_gift=1)
      this.currentTitle = 'gift_vouchers';
      this.loadGiftVouchers();
    } else if (tabIndex === this.TAB_GIFT_PURCHASED) {
      // Gift vouchers purchased by clients (from gift_vouchers table)
      this.currentTitle = 'gift_vouchers_purchased';
      this.loadGiftVouchersPurchased();
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

  // Gift vouchers (vouchers with is_gift=1) card view methods
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

  viewGiftVoucher(voucher: any) {
    // Open edit dialog for gift vouchers from admin
    this.snackbar.open(
      this.translateService.instant('gift_voucher.view'),
      'OK',
      { duration: 3000 }
    );
  }

  deleteGiftVoucher(voucher: any) {
    const confirmDelete = window.confirm(this.translateService.instant('delete_confirm') || 'Delete gift voucher?');
    if (!confirmDelete) {
      return;
    }

    this.crudService.delete('/vouchers', voucher.id).subscribe({
      next: () => {
        this.snackbar.open(
          this.translateService.instant('voucher.deleted_success'),
          'OK',
          { duration: 3000 }
        );
        this.loadGiftVouchers();
      },
      error: (error) => {
        console.error('Error deleting gift voucher:', error);
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

    const buyerName = voucher.buyer_name ?? '';
    const recipientName = voucher.recipient_name ?? '';
    const amount = voucher.quantity ?? 0;
    const balance = voucher.remaining_balance ?? 0;
    const isPaid = voucher.payed ?? false;
    const createdAt = voucher.created_at;

    return {
      ...voucher,
      buyer_name: buyerName,
      recipient_name: recipientName,
      amount,
      balance,
      is_paid: isPaid,
      personal_message: voucher.personal_message ?? null,
      status: balance <= 0 ? 'used' : (isPaid ? 'active' : 'pending'),
      created_at: createdAt
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

  // Gift vouchers purchased (from gift_vouchers table) card view methods
  loadGiftVouchersPurchased(page = 1) {
    const schoolId = this.user?.schools?.[0]?.id;
    let searchQuery = '';

    if (schoolId) {
      searchQuery += `&school_id=${schoolId}`;
    }

    this.crudService.list(
      '/gift-vouchers',
      page,
      this.giftVouchersPurchasedCardsPerPage,
      'desc',
      'id',
      searchQuery,
      '',
      null,
      '',
      ['school', 'purchasedBy', 'redeemedBy', 'voucher']
    ).subscribe({
      next: (response: any) => {
        const rawData = response?.data;
        const rawVouchers = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.data)
            ? rawData.data
            : [];
        this.giftVouchersPurchased = rawVouchers.map((voucher: any) => this.normalizeGiftVoucherPurchased(voucher));
        this.refreshGiftVouchersPurchasedTable();
      },
      error: (error) => {
        console.error('Error loading purchased gift vouchers:', error);
        this.giftVouchersPurchased = [];
        this.refreshGiftVouchersPurchasedTable();
      }
    });
  }

  viewGiftVoucherPurchased(voucher: any) {
    // Show read-only view for purchased gift vouchers
    this.snackbar.open(
      this.translateService.instant('gift_voucher_purchased.view_only'),
      'OK',
      { duration: 3000 }
    );
  }

  copyCode(code: string) {
    this.clipboard.copy(code);
    this.snackbar.open(
      this.translateService.instant('voucher.copy_success'),
      'OK',
      { duration: 2000 }
    );
  }

  deleteGiftVoucherPurchased(voucher: any) {
    const confirmDelete = window.confirm(this.translateService.instant('delete_confirm') || 'Delete gift voucher?');
    if (!confirmDelete) {
      return;
    }

    this.crudService.delete('/gift-vouchers', voucher.id).subscribe({
      next: () => {
        this.snackbar.open(
          this.translateService.instant('voucher.deleted_success'),
          'OK',
          { duration: 3000 }
        );
        this.loadGiftVouchersPurchased();
      },
      error: (error) => {
        console.error('Error deleting gift voucher:', error);
        this.snackbar.open(
          this.translateService.instant('voucher.error_delete'),
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  private refreshGiftVouchersPurchasedTable(): void {
    if (!this.giftVouchersPurchasedTable) {
      return;
    }

    const pageIndex = this.giftVouchersPurchasedTable.pageIndex || 1;
    const pageSize = this.giftVouchersPurchasedTable.pageSize || 10;

    this.giftVouchersPurchasedTable.getData(pageIndex, pageSize);
  }

  private normalizeGiftVoucherPurchased(voucher: any): any {
    if (!voucher) {
      return voucher;
    }

    const buyerName = voucher.buyer_name ?? voucher.sender_name ?? '';
    const recipientName = voucher.recipient_name ?? '';
    const amount = voucher.amount ?? 0;
    const isPaid = voucher.is_paid ?? false;
    const status = voucher.status ?? 'pending';
    const createdAt = voucher.created_at;

    return {
      ...voucher,
      buyer_name: buyerName,
      recipient_name: recipientName,
      amount,
      is_paid: isPaid,
      status,
      created_at: createdAt
    };
  }

  toggleGiftVouchersPurchasedView() {
    this.giftVouchersPurchasedViewMode = this.giftVouchersPurchasedViewMode === 'cards' ? 'table' : 'cards';

    if (this.giftVouchersPurchasedViewMode === 'table') {
      setTimeout(() => this.refreshGiftVouchersPurchasedTable(), 0);
    } else {
      this.loadGiftVouchersPurchased();
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

  private parseSettingsPayload(raw: any): any {
    if (!raw) {
      return null;
    }
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    if (typeof raw === 'object') {
      return raw;
    }
    return null;
  }

  private resolveCurrencyCandidate(...candidates: Array<string | null | undefined>): string | null {
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length) {
        return candidate;
      }
    }
    return null;
  }

  private getDefaultCurrency(): string {
    return (
      this.resolveCurrencyCandidate(
        this.user?.schools?.[0]?.taxes?.currency,
        this.user?.schools?.[0]?.currency
      ) || 'EUR'
    );
  }
}
