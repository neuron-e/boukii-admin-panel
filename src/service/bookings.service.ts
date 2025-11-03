import { Injectable } from '@angular/core';
import {BehaviorSubject, delay, EMPTY, forkJoin, mergeMap, Observable} from 'rxjs';
import * as moment from 'moment';
import {TranslateService} from '@ngx-translate/core';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ApiCrudService} from './crud.service';

export interface BookingCreateData {
  school_id: number;
  client_main_id: number;
  user_id: number;
  price_total: number;
  has_cancellation_insurance: boolean;
  has_boukii_care: boolean;
  has_reduction: boolean;
  has_tva: boolean;
  price_cancellation_insurance: number;
  price_reduction: number;
  price_boukii_care: number;
  price_tva: number;
  source: 'admin';
  payment_method_id: number | null;
  selectedPaymentOption: string | null;
  paid_total: number;
  paid: boolean;
  notes: string;
  notes_school: string;
  paxes: number;
  status: number;
  color: string;
  vouchers: any[];
  reduction: any;
  basket: any[] | null;
  cart: any[] | null;
}

interface BookingLog {
  booking_id: number;
  action: string;
  description?: string;
  before_change: string;
  user_id: number;
  school_id?: number;
  reason?: string;
}

interface Payment {
  booking_id: number;
  school_id: number;
  amount: number;
  status: string;
  notes: string;
}

interface VoucherData {
  code: string;
  quantity: number;
  remaining_balance: number;
  payed: boolean;
  client_id: number;
  school_id: number;
}

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private bookingDataSubject = new BehaviorSubject<BookingCreateData | null>(null);
  public editData;
  constructor(
    private crudService: ApiCrudService
  ) {}


  private parseDurationToMinutes(value: any): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value > 10 && Number.isInteger(value)) {
        return value;
      }

      return Math.round(value * 60);
    }

    if (typeof value === 'string') {
      const normalized = value.replace(',', '.').trim().toLowerCase();
      if (!normalized) {
        return null;
      }

      const hourMatch = normalized.match(/(\d+)\s*h/);
      const minuteMatch = normalized.match(/(\d+)\s*(?:m|min)/);

      if (hourMatch || minuteMatch) {
        const hours = parseInt(hourMatch?.[1] ?? '0', 10);
        const minutes = parseInt(minuteMatch?.[1] ?? '0', 10);
        return hours * 60 + minutes;
      }

      const numeric = parseFloat(normalized);
      if (!Number.isNaN(numeric)) {
        if (numeric > 10) {
          return Math.round(numeric);
        }

        return Math.round(numeric * 60);
      }
    }

    return null;
  }

  private formatIntervalLabel(hours: number, minutes: number): string {
    if (hours <= 0) {
      return `${minutes}m`;
    }

    if (minutes === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${minutes}m`;
  }

  private buildIntervalCandidates(minutes: number | null, explicitLabel?: string): string[] {
    const candidates: string[] = [];
    const addCandidate = (label?: string) => {
      if (!label) {
        return;
      }
      const normalized = label.trim();
      if (!normalized) {
        return;
      }
      if (!candidates.includes(normalized)) {
        candidates.push(normalized);
      }
    };

    addCandidate(explicitLabel);

    if (minutes === null || !Number.isFinite(minutes)) {
      return candidates;
    }

    const normalizedMinutes = Math.max(Math.round(minutes / 15) * 15, 0);
    const hours = Math.floor(normalizedMinutes / 60);
    const mins = normalizedMinutes % 60;

    addCandidate(this.formatIntervalLabel(hours, mins));

    if (hours > 0 && mins === 0) {
      addCandidate(`${hours}h 0m`);
      addCandidate(`${hours}h 0min`);
      addCandidate(`${hours}h`);
    } else if (hours > 0) {
      addCandidate(`${hours}h ${mins}min`);
      addCandidate(`${hours}h${mins}m`);
    }

    if (hours === 0) {
      addCandidate(`${mins}m`);
      addCandidate(`${mins}min`);
    }

    addCandidate((normalizedMinutes / 60).toString());
    addCandidate((normalizedMinutes / 60).toFixed(2));
    addCandidate(`${normalizedMinutes}m`);
    addCandidate(`${normalizedMinutes}min`);

    return candidates;
  }

  private findIntervalByCandidates(priceRange: any[], candidates: string[]): any {
    if (!Array.isArray(priceRange) || candidates.length === 0) {
      return null;
    }

    for (const candidate of candidates) {
      const match = priceRange.find((range: any) => range?.intervalo === candidate);
      if (match) {
        return match;
      }
    }

    return null;
  }

  setBookingData(data: BookingCreateData) {
    this.bookingDataSubject.next(data);
  }

  getBookingData(): BookingCreateData | null {
    return this.bookingDataSubject.value;
  }

  calculatePendingPrice(): number {
    const data = this.getBookingData();
    if (!data) {
      console.warn('🔍 calculatePendingPrice: No booking data found');
      return 0;
    }

    const vouchers = Array.isArray((data as any).vouchers) ? (data as any).vouchers : [];
    const totalVouchers = vouchers.reduce((acc: number, item: any) => {
      const value = item?.bonus?.reducePrice;
      const parsed = typeof value === 'number' ? value : parseFloat(value ?? '0');
      return acc + (isNaN(parsed) ? 0 : parsed);
    }, 0);

    const priceTotal = typeof (data as any).price_total === 'number'
      ? (data as any).price_total
      : parseFloat((data as any).price_total ?? '0');

    console.log('🔍 calculatePendingPrice DEBUG:', {
      priceTotal,
      totalVouchers,
      pending: priceTotal - totalVouchers,
      bookingData: data
    });

    const pending = priceTotal - totalVouchers;
    return pending > 0 ? pending : 0;
  }

  calculateActivityPrice(activity: any): number {
    let price = 0;

    if (activity.course.course_type === 1) {
      if (!activity.course.is_flexible) {
        price = parseFloat(activity.course.price || 0) * activity.utilizers.length;
      } else {
        price = parseFloat(activity.course.price || 0) * activity.dates.length * activity.utilizers.length;
      }
    } else {
      activity.dates.forEach(date => {
        price += this.calculateDatePrice(activity.course, date);
      });
    }

    return price;
  }

  calculateDatePrice(course: any, date: any, showCancelled = false): number {
    let datePrice = 0;
    let extraPrice = 0;

    const bookingUsers = Array.isArray(date?.booking_users) ? date.booking_users : [];
    const validUsers = showCancelled
      ? bookingUsers
      : bookingUsers.filter((user: any) => user?.status === 1);

    const utilizersCount = Array.isArray(date?.utilizers) ? date.utilizers.length : 0;
    const selectedUtilizers = validUsers.length || utilizersCount;

    if (selectedUtilizers > 0) {
      if (course?.course_type === 1) {
        datePrice = parseFloat(course?.price || 0);
      } else if (course?.is_flexible) {
        const durationMinutes = this.parseDurationToMinutes(date?.durationMinutes ?? date?.duration ?? date?.formattedDuration);
        const intervalCandidates = this.buildIntervalCandidates(durationMinutes, typeof date?.duration === 'string' ? date.duration : undefined);
        const interval = this.findIntervalByCandidates(course?.price_range, intervalCandidates);

        if (interval) {
          const rawValue = interval[selectedUtilizers] ?? interval[String(selectedUtilizers)];
          const priceValue = parseFloat(rawValue ?? '0');
          if (!Number.isNaN(priceValue)) {
            datePrice += priceValue;
          }
        }
      } else {
        datePrice += parseFloat(course?.price || 0) * selectedUtilizers;
      }

      const extras = Array.isArray(date?.extras) ? date.extras : [];
      extraPrice = extras.reduce((sum: number, extra: any) => {
        const price = parseFloat(extra?.price ?? '0');
        const quantity = Number(extra?.quantity ?? 1) || 1;
        return sum + (Number.isNaN(price) ? 0 : price * quantity);
      }, 0);
    }

    return datePrice + extraPrice;
  }
  updateBookingData(partialData: Partial<BookingCreateData>) {
    const currentData = this.getBookingData();
    if (currentData) {
      const updatedData = { ...currentData, ...partialData };
      this.setBookingData(updatedData);
    }
  }

  setCart(normalizedDates, bookingData: BookingCreateData) {
    const cart: any[] = [];
    let groupId = 0;
    const safeDates = Array.isArray(normalizedDates) ? normalizedDates : [];

    safeDates.forEach(item => {
      groupId += 1;
      const utilizers = Array.isArray(item?.utilizers) ? item.utilizers : [];
      const dates = Array.isArray(item?.dates) ? item.dates : [];

      utilizers.forEach(utilizer => {
        dates.forEach(date => {
          const bookingUser: any = {
            client_id: utilizer?.id ?? null,
            group_id: groupId,
            monitor_id: item?.monitor?.id ?? null,
            price_base: parseFloat(item?.totalSinExtras ?? '0'),
            extra_price: parseFloat(item?.extrasTotal ?? '0'),
            price: parseFloat(String(item?.total ?? '0').replace(/[^\d.-]/g, '')),
            currency: item?.course?.currency ?? null,
            course_id: item?.course?.id ?? null,
            course_name: item?.course?.name ?? null,
            notes_school: item?.schoolObs ?? '',
            notes: item?.clientObs ?? '',
            course_type: item?.course?.course_type ?? null,
            degree_id: item?.sportLevel?.id ?? null,
            hour_start: date?.startHour ?? null,
            hour_end: date?.endHour ?? null
          };

          const courseDate = item?.course?.course_dates?.find(d =>
            moment(d?.date).format('YYYY-MM-DD') === moment(date?.date).format('YYYY-MM-DD')
          );

          bookingUser.course_date_id = courseDate?.id ?? null;

          const extras: any[] = [];

          if (item?.course?.course_type === 2) {
            const utilizerExtras = date?.utilizers?.find(u =>
              u?.first_name === utilizer?.first_name && u?.last_name === utilizer?.last_name
            );
            const extraList = Array.isArray(utilizerExtras?.extras) ? utilizerExtras.extras : [];
            extraList.forEach(extra => {
              const extraPrice = parseFloat(extra?.price ?? '0');
              const quantity = Number(extra?.quantity ?? 1) || 1;
              extras.push({
                course_extra_id: extra?.id ?? null,
                name: extra?.name ?? '',
                quantity,
                price: Number.isNaN(extraPrice) ? 0 : extraPrice
              });
            });
          } else {
            const extraList = Array.isArray(date?.extras) ? date.extras : [];
            extraList.forEach(extra => {
              const extraPrice = parseFloat(extra?.price ?? '0');
              const quantity = Number(extra?.quantity ?? 1) || 1;
              extras.push({
                course_extra_id: extra?.id ?? null,
                name: extra?.name ?? '',
                quantity,
                price: Number.isNaN(extraPrice) ? 0 : extraPrice
              });
            });
          }

          bookingUser.extras = extras;

          if (bookingData?.school_id === 15) {
            const courseGroups = Array.isArray(courseDate?.course_groups) ? courseDate.course_groups : [];
            const matchingGroup = courseGroups.find(group => group?.degree_id === item?.sportLevel?.id);

            if (matchingGroup) {
              bookingUser.group = matchingGroup.id;
              bookingUser.group_name = matchingGroup.name;

              const courseSubgroups = Array.isArray(matchingGroup?.course_subgroups)
                ? matchingGroup.course_subgroups
                : [];
              const availableSubgroup = courseSubgroups.find(subgroup => {
                const currentParticipants = Array.isArray(subgroup?.booking_users)
                  ? subgroup.booking_users.length
                  : 0;
                const maxParticipants = typeof subgroup?.max_participants === 'number'
                  ? subgroup.max_participants
                  : Number.POSITIVE_INFINITY;
                return currentParticipants < maxParticipants;
              });

              if (availableSubgroup) {
                bookingUser.subgroup = availableSubgroup.id;
                bookingUser.subgroup_name = availableSubgroup.name;
              }
            }
          }

          cart.push(bookingUser);
        });
      });
    });

    return cart;
  }
  resetBookingData() {
    console.log('🔄 Reseteando BookingData para nueva reserva');
    this.bookingDataSubject.next({
      school_id: 0,
      client_main_id: 0,
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
      vouchers: [],  // Reset de vouchers
      reduction: null,  // Reset de reduction
      basket: null,  // Reset de reduction
      cart:  null
    });
  }

  /**
   * MEJORA CRÍTICA: Método para verificar si hay datos problemáticos en el estado actual
   */
  validateBookingDataIntegrity(): { isValid: boolean, issues: string[] } {
    const data = this.getBookingData();
    const issues: string[] = [];

    if (!data) {
      return { isValid: true, issues: [] };
    }

    // Verificar precio total vs vouchers
    const priceTotal = typeof data.price_total === 'number' ? data.price_total : parseFloat((data.price_total as any)?.toString() ?? '0');
    const vouchersTotal = Array.isArray(data.vouchers) ?
      data.vouchers.reduce((acc, item) => {
        const value = item?.bonus?.reducePrice;
        const parsed = typeof value === 'number' ? value : parseFloat(value ?? '0');
        return acc + (isNaN(parsed) ? 0 : parsed);
      }, 0) : 0;

    if (priceTotal === 0 && vouchersTotal > 0) {
      issues.push(`Precio total 0€ con bonos aplicados por ${vouchersTotal}€`);
    }

    if (priceTotal < 0) {
      issues.push(`Precio total negativo: ${priceTotal}€`);
    }

    if (vouchersTotal < 0) {
      issues.push(`Total de bonos negativo: ${vouchersTotal}€`);
    }

    return {
      isValid: issues.length === 0,
      issues: issues
    };
  }

  private createBookingLog(logData: BookingLog): Observable<any> {
    return this.crudService.create('/booking-logs', logData);
  }

  private createPayment(paymentData: Payment): Observable<any> {
    return this.crudService.create('/payments', paymentData);
  }

  private updateBookingUserStatus(bookingUsers: any[], status: number): Observable<any> {
    return forkJoin(
      bookingUsers.map(user =>
        this.crudService.update('/booking-users', { status }, user.id)
      )
    );
  }

  private cancelBookingUsers(bookingUserIds: number[]): Observable<any> {
    return this.crudService.post('/admin/bookings/cancel', {
      bookingUsers: bookingUserIds
    });
  }

  private handleNoRefund(bookingId: number, bookingUsers: any[], bookTotalPrice: number, userData: any): Observable<any> {
    const operations = [
      this.createBookingLog({
        booking_id: bookingId,
        action: 'no_refund',
        before_change: 'confirmed',
        user_id: userData.id
      }),
      this.createPayment({
        booking_id: bookingId,
        school_id: userData.schools[0].id,
        amount: bookTotalPrice,
        status: 'no_refund',
        notes: 'no refund applied'
      }),
      this.cancelBookingUsers(bookingUsers)
    ];

    return forkJoin(operations);
  }

  private handleBoukiiPay(bookingId: number, bookTotalPrice: number, bookingUsers: any[], userData: any, reason: string): Observable<any> {
    const provider = 'boukii_pay';
    const operations: Observable<any>[] = [
      this.createBookingLog({
        booking_id: bookingId,
        action: 'refund_' + provider,
        before_change: 'confirmed',
        user_id: userData.id,
        reason: reason
      })
    ];

    operations.push(
      this.crudService.post(`/admin/bookings/refunds/${bookingId}`, {
        amount: bookTotalPrice
      })
    );


    operations.push(
      this.cancelBookingUsers(bookingUsers)
    );

    return forkJoin(operations);
  }

  private handleCashRefund(bookingId: number, bookingUsers: any[], bookTotalPrice: number, userData: any, reason: string): Observable<any> {
    const provider = 'cash';
    const operations = [
      this.createBookingLog({
        booking_id: bookingId,
        action: 'refund_' + provider,
        before_change: 'confirmed',
        user_id: userData.id,
        description: reason
      }),
      this.createPayment({
        booking_id: bookingId,
        school_id: userData.schools[0].id,
        amount: bookTotalPrice,
        status: 'refund',
        notes: 'other'
      }),
      this.cancelBookingUsers(bookingUsers)
    ];

    return forkJoin(operations);
  }

  private handleVoucherRefund(bookingId: number, bookingUsers: any[], bookTotalPrice: number, userData: any, clientMainId: number): Observable<any> {
    const provider = 'voucher';
    const voucherData: VoucherData = {
      code: 'BOU-' + this.generateRandomNumber(),
      quantity: bookTotalPrice,
      remaining_balance: bookTotalPrice,
      payed: false,
      client_id: clientMainId,
      school_id: userData.schools[0].id
    };

    return forkJoin([
      this.createBookingLog({
        booking_id: bookingId,
        action: 'refund_' + provider,
        before_change: 'confirmed',
        user_id: userData.id
      }),
      this.cancelBookingUsers(bookingUsers),
      this.createPayment({
        booking_id: bookingId,
        school_id: userData.schools[0].id,
        amount: bookTotalPrice,
        status: 'refund',
        notes: 'voucher'
      }),
      this.crudService.create('/vouchers', voucherData).pipe(
        mergeMap(result =>
          this.crudService.create('/vouchers-logs', {
            voucher_id: result.data.id,
            booking_id: bookingId,
            amount: -voucherData.quantity
          })
        )
      )
    ]);
  }

  processCancellation(
    data: any,
    bookingData: any,
    isPartial = false,
    user: any,
    group: any,
    bookingUserIds:any = null,
    total:any = null
  ): Observable<any> {
    if (!data) return EMPTY;
    const bookingUserIdsFinal = group
      ? group.dates.flatMap(date => date.booking_users.map(b => b.id))
      : bookingUserIds;

    const totalFinal = group ? group.total : total; // Si group no está, usar data.total

    const initialLog: BookingLog = {
      booking_id: bookingData.id,
      action: 'partial_cancel',
      description: 'partial cancel booking',
      user_id: user.id,
      before_change: 'confirmed',
      school_id: user.schools[0].id
    };

    let cancellationOperation: Observable<any>;

    switch (data.type) {
      case 'no_refund':
        cancellationOperation = this.handleNoRefund(
          bookingData.id,
          bookingUserIdsFinal,
          totalFinal,
          user
        );
        break;

      case 'boukii_pay':
        cancellationOperation = this.handleBoukiiPay(
          bookingData.id,
          totalFinal,
          bookingUserIdsFinal,
          user,
          data.reason
        );
        break;

      case 'refund':
        cancellationOperation = this.handleCashRefund(
          bookingData.id,
          bookingUserIdsFinal,
          totalFinal,
          user,
          data.reason
        );
        break;

      case 'refund_gift':
        cancellationOperation = this.handleVoucherRefund(
          bookingData.id,
          bookingUserIdsFinal,
          totalFinal,
          user,
          bookingData.client_main_id
        );
        break;

      default:
        return EMPTY;
    }

    return this.createBookingLog(initialLog).pipe(
      mergeMap(() => cancellationOperation),
      delay(1000),
      mergeMap(() => {
        const status = isPartial ? 3 : 2;
        return this.crudService.update('/bookings', { status }, bookingData.id);
      })
    );
  }

  private generateRandomNumber(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
