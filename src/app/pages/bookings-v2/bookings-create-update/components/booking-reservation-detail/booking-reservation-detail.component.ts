import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { LangService } from '../../../../../../service/langService';
import { UtilsService } from '../../../../../../service/utils.service';
import { MatDialog } from '@angular/material/dialog';
import { AddReductionModalComponent } from '../add-reduction/add-reduction.component';
import { AddDiscountBonusModalComponent } from '../add-discount-bonus/add-discount-bonus.component';
import { BookingCreateData, BookingService } from '../../../../../../service/bookings.service';

@Component({
  selector: 'booking-reservation-detail',
  templateUrl: './booking-reservation-detail.component.html',
  styleUrls: ['./booking-reservation-detail.component.scss'],
})
export class BookingReservationDetailComponent implements OnInit {
  @Input() client: any;
  @Input() activities: any;
  @Input() hideBotton = false;
  @Output() endClick = new EventEmitter();
  @Output() payClick = new EventEmitter();
  @Output() addClick = new EventEmitter();

  bookingData: BookingCreateData;
  cancellationInsurancePercent: number;
  price_tva: number;
  price_boukii_care: number;
  school: any;
  settings: any;

  constructor(
    protected langService: LangService,
    protected utilsService: UtilsService,
    private dialog: MatDialog,
    public bookingService: BookingService
  ) {
    this.school = this.utilsService.getSchoolData();
    this.settings = JSON.parse(this.school.settings);
    this.cancellationInsurancePercent = parseFloat(this.settings?.taxes?.cancellation_insurance_percent);
    this.price_boukii_care = parseInt(this.settings?.taxes?.boukii_care_price, 10);
    this.price_tva = parseFloat(this.settings?.taxes?.tva);
  }

  ngOnInit(): void {
    this.bookingData = this.bookingService.getBookingData() || this.initializeBookingData();

    // MEJORA CRÍTICA: Solo recalcular bonos si ya existen y hay cambios de precio
    // Evitar aplicación automática en inicialización
    if (this.bookingData.vouchers && this.bookingData.vouchers.length > 0) {
      this.recalculateBonusPrice();
    }

    this.updateBookingData();
  }

  private initializeBookingData(): BookingCreateData {
    return {
      school_id: this.school.id,
      client_main_id: this.client.id,
      user_id: 0,
      price_total: 0,
      has_cancellation_insurance: false,
      has_boukii_care: false,
      has_reduction: false,
      has_tva: false,
      price_cancellation_insurance: 0,
      price_reduction: 0,
      price_boukii_care: 0,
      price_tva: 0,
      source: 'admin',
      payment_method_id: null,
      paid_total: 0,
      paid: false,
      notes: '',
      notes_school: '',
      selectedPaymentOption: '',
      paxes: 0,
      status: 0,
      color: '',
      vouchers: [],
      reduction: null,
      basket: null,
      cart: null
    };
  }

  sumActivityTotal(): number {
    return this.activities.reduce((acc, item) => {
      const raw = typeof item.total === 'number' ? item.total : parseFloat(String(item.total).replace(/[^\d.-]/g, '')) || 0;
      return acc + raw;
    }, 0);
  }

  getActivitiesCurrency(): string {
    const first = Array.isArray(this.activities) && this.activities.length > 0 ? this.activities[0] : null;
    return first?.currency || first?.course?.currency || '';
  }

  updateBookingData() {
    this.bookingData.price_total = this.calculateTotal();
    this.bookingService.setBookingData(this.bookingData);
  }

  calculateRem(event: any) {
    if (event.source.checked) {
      this.bookingData.price_cancellation_insurance = Number(this.sumActivityTotal()) * Number(this.cancellationInsurancePercent);
      this.bookingData.has_cancellation_insurance = event.source.checked;
    } else {
      this.bookingData.price_cancellation_insurance = 0;
      this.bookingData.has_cancellation_insurance = event.source.checked;
    }
    this.updateBookingData();
    this.recalculateBonusPrice();
  }

  recalculateBonusPrice() {
    // MEJORA CRÍTICA: Solo proceder si realmente hay bonos válidos
    if (!this.bookingData.vouchers || this.bookingData.vouchers.length === 0) {
      return;
    }

    // Validar que el price_total es válido antes de proceder
    if (!this.bookingData.price_total || isNaN(this.bookingData.price_total) || this.bookingData.price_total <= 0) {
      console.warn('⚠️ Price total inválido, evitando recálculo de bonos');
      return;
    }

    let remainingPrice = this.bookingData.price_total - this.calculateTotalVoucherPrice();

    // MEJORA CRÍTICA: Solo proceder si hay una diferencia significativa
    if (Math.abs(remainingPrice) < 0.01) {
      return;
    }

    this.bookingData.vouchers.forEach((voucher, index) => {
      if (!voucher.bonus || !voucher.bonus.remaining_balance) {
        console.warn(`⚠️ Bono ${index} sin datos válidos, saltando`);
        return;
      }

      const availableBonus = voucher.bonus.remaining_balance - (voucher.bonus.reducePrice || 0);

      if (remainingPrice > 0) {
        if (availableBonus >= remainingPrice) {
          voucher.bonus.reducePrice = (voucher.bonus.reducePrice || 0) + remainingPrice;
          remainingPrice = 0;
        } else if (availableBonus > 0) {
          voucher.bonus.reducePrice = (voucher.bonus.reducePrice || 0) + availableBonus;
          remainingPrice -= availableBonus;
        }
      } else if (remainingPrice < 0) {
        const currentReducePrice = voucher.bonus.reducePrice || 0;
        const adjustedReducePrice = currentReducePrice + remainingPrice;

        if (adjustedReducePrice >= 0) {
          voucher.bonus.reducePrice = adjustedReducePrice;
          remainingPrice = 0;
        } else {
          remainingPrice -= currentReducePrice;
          voucher.bonus.reducePrice = 0;
        }
      }
    });

    this.updateBookingData();
  }


  recalculateTva() {
    const basePrice =
      Number(this.sumActivityTotal()) +
      Number(this.bookingData.price_cancellation_insurance) -
      Number(this.bookingData.price_reduction) +
      Number(this.bookingData.price_boukii_care);

    this.bookingData.price_tva = basePrice * Number(this.price_tva);
  }

  calculateTotal(): number {
    this.recalculateTva();
    return this.sumActivityTotal() +
      (this.bookingData.price_cancellation_insurance ? Number(this.bookingData.price_cancellation_insurance) : 0) -
      (this.bookingData.price_reduction ? Number(this.bookingData.price_reduction) : 0) +
      (this.bookingData.price_boukii_care ? Number(this.bookingData.price_boukii_care) : 0) +
      (this.bookingData.price_tva ? Number(this.bookingData.price_tva) : 0);
  }

  calculateTotalVoucherPrice(): number {
    return this.bookingData.vouchers
      ? this.bookingData.vouchers.reduce((e, i) => e + (i.bonus?.reducePrice ? parseFloat(i.bonus.reducePrice) : 0), 0)
      : 0;
  }

  addBonus(): void {
    const dialogRef = this.dialog.open(AddDiscountBonusModalComponent, {
      width: '600px',
      data: {
        client_id: this.client.id,
        school_id: this.school.id,
        currentPrice: this.bookingData.price_total - this.calculateTotalVoucherPrice(),
        appliedBonus: this.bookingData.vouchers,
        currency: this.activities[0].course.currency,
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.bookingData.vouchers.push(result);
        this.updateBookingData();
        this.recalculateBonusPrice();
      }
    });
  }

  addReduction(): void {
    const dialogRef = this.dialog.open(AddReductionModalComponent, {
      width: '530px',
      data: { currentPrice: this.bookingData.price_total, currency: this.activities[0].course.currency },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.bookingData.reduction = result;
        this.bookingData.reduction.appliedPrice = result.totalDiscount;
        this.bookingData.price_reduction = this.bookingData.reduction.appliedPrice;
        this.updateBookingData();
        this.recalculateBonusPrice();
      }
    });
  }

  deleteReduction(): void {
    this.bookingData.reduction = null;
    this.bookingData.price_reduction = 0;
    this.updateBookingData();
    this.recalculateBonusPrice();
  }

  deleteBonus(index: number): void {
    this.bookingData.vouchers.splice(index, 1);
    this.updateBookingData();
    this.recalculateBonusPrice();
  }

  private calculateReduction(): number {
    return this.bookingData.reduction.type === 1
      ? (this.sumActivityTotal() * this.bookingData.reduction.discount) / 100
      : Math.min(this.bookingData.reduction.discount, this.sumActivityTotal());
  }

  getDiscountInfoList(activity: any): any[] {
    const info = activity?.discountInfo;
    if (!info) {
      return [];
    }

    return Array.isArray(info) ? info : [info];
  }

  getActivityDiscountAmount(activity: any): number {
    return (activity?.discountInfo || []).reduce((sum: number, discount: any) => {
      const amount = discount?.amountSaved ?? discount?.discountAmount ?? 0;
      return sum + (parseFloat(amount) || 0);
    }, 0);
  }

  getActivityBaseAmount(activity: any): number {
    const discount = this.getActivityDiscountAmount(activity);
    const total = typeof activity?.total === 'number'
      ? activity.total
      : parseFloat(String(activity?.total || 0).replace(/[^\d.-]/g, '')) || 0;
    return total + discount;
  }

  protected readonly isNaN = isNaN;
}
