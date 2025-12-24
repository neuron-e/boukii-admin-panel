import { Component, Inject, OnInit, Optional, ChangeDetectorRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { BookingService } from '../../../../service/bookings.service';
import { ApiCrudService } from '../../../../service/crud.service';
import {ActivatedRoute, Router} from '@angular/router';
import { BehaviorSubject, Subject, finalize } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BookingDialogComponent } from '../bookings-create-update/components/booking-dialog/booking-dialog.component';
import {
  CancelPartialBookingModalComponent
} from '../cancel-partial-booking/cancel-partial-booking.component';
import {CancelBookingModalComponent} from '../cancel-booking/cancel-booking.component';
import {BookingDetailDialogComponent} from './components/booking-dialog/booking-dialog.component';
import { SchoolService } from 'src/service/school.service';
import { PAYMENT_METHODS, PaymentMethodId } from '../../../shared/payment-methods';
import { buildDiscountInfoList } from '../shared/discount-utils';
import moment from 'moment';

@Component({
  selector: 'booking-detail-v2',
  templateUrl: './booking-detail.component.html',
  styleUrls: ['./booking-detail.component.scss']
})
export class BookingDetailV2Component implements OnInit {
  payModal: boolean = false;
  deleteModal: boolean = false
  deleteFullModal: boolean = false
  endModal: boolean = false
  deleteIndex: number = 1
  mainClient: any;
  allLevels: any;
  isMobile = false;
  showMobileDetail = false;
  bookingData$ = new BehaviorSubject<any>(null);
  bookingData:any;
  groupedActivities: any[] = [];
  id: number;
  user: any;
  paymentMethod: number = 1; // Valor por defecto (directo)
  step: number = 1;  // Paso inicial
  selectedPaymentOptionId: PaymentMethodId | null = null;
  selectedPaymentOptionLabel: string = '';
  isPaid = false;
  isLoading = false;
  paymentOptions: Array<{ id: PaymentMethodId; label: string }> = [];
  readonly paymentMethods = PAYMENT_METHODS;
  // Prefer stored price_total; fallback to computed/basket when missing
  private resolveDisplayTotal(booking: any): number {
    if (!booking) return 0;
    const originalRaw = booking.price_total;
    if (originalRaw !== null && originalRaw !== undefined && originalRaw !== '') {
      const originalTotal = Number(originalRaw);
      if (!isNaN(originalTotal)) return originalTotal;
    }
    const computedTotal = booking.computed_total !== undefined ? Number(booking.computed_total) : NaN;
    const basketRaw = booking.basket;
    let basket: any = null;
    if (basketRaw) {
      try {
        basket = typeof basketRaw === 'string' ? JSON.parse(basketRaw) : basketRaw;
      } catch {
        basket = null;
      }
    }
    const basketTotal = basket && basket.price_total !== undefined ? Number(basket.price_total) : NaN;
    if (!isNaN(computedTotal)) return computedTotal;
    if (!isNaN(basketTotal)) return basketTotal;
    return 0;
  }

  private activitiesChangedSubject = new Subject<void>();

  activitiesChanged$ = this.activitiesChangedSubject.asObservable();

  get showConfirmationWithoutPaymentOption(): boolean {
    return false;
  }

  private buildDirectPaymentOptions(): Array<{ id: PaymentMethodId; label: string }> {
    const offlineIds: PaymentMethodId[] = [1, 2, 4];
    return this.paymentMethods
      .filter(method => offlineIds.includes(method.id))
      .map(method => ({ id: method.id, label: this.resolvePaymentLabel(method.id) }));
  }

  public resolvePaymentLabel(id: PaymentMethodId | null): string {
    if (id === null || id === undefined) {
      return '';
    }

    if (Number(id) === 2) {
      return this.getGatewayLabel();
    }

    if (Number(id) === 3) {
      return this.translateService.instant('send_payment_link');
    }

    if (Number(id) === 4) {
      return this.translateService.instant('payment_card_external');
    }

    const method = this.paymentMethods.find(m => m.id === id);
    if (!method) {
      return '';
    }

    return this.translateService.instant(method.i18nKey);
  }

  private getGatewayLabel(): string {
    const provider = (this.schoolService.getPaymentProvider() || '').toLowerCase();
    if (provider === 'payyo') {
      return this.translateService.instant('payment_terminal_open', { provider: 'Payyo' });
    }

    const providerName = provider ? this.formatProviderName(provider) : 'Boukii Pay';
    return this.translateService.instant('payment_terminal_open', { provider: providerName });
  }

  private formatProviderName(value: string): string {
    return value
      .split(/[_\s]+/)
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  public determinePaymentMethodId(): PaymentMethodId {
    if (this.paymentMethod === 1 && this.selectedPaymentOptionId) {
      return this.selectedPaymentOptionId;
    }

    if (this.paymentMethod === 3) {
      return 3;
    }

    if (this.paymentMethod === 4) {
      return 5;
    }

    return this.selectedPaymentOptionId ?? 1;
  }

  private syncPaymentSelectionFromBooking(booking: any): void {
    const methodId = booking?.payment_method_id as PaymentMethodId;
    if (!methodId) {
      return;
    }

    if (methodId === 1 || methodId === 2 || methodId === 4) {
      this.paymentMethod = 1;
      this.selectedPaymentOptionId = methodId;
      this.selectedPaymentOptionLabel = this.resolvePaymentLabel(methodId);
      return;
    }

    if (methodId === 3) {
      this.paymentMethod = 3;
      this.selectedPaymentOptionId = 3;
      this.selectedPaymentOptionLabel = this.resolvePaymentLabel(3);
      return;
    }

    if (methodId === 5) {
      this.paymentMethod = 4;
      this.selectedPaymentOptionId = 5;
      this.selectedPaymentOptionLabel = this.resolvePaymentLabel(5);
    }
  }

  private getCloseActionLabel(): string {
    return this.translateService.instant('close');
  }

  constructor(
    public translateService: TranslateService,
    public dialog: MatDialog,
    private activatedRoute: ActivatedRoute,
    public bookingService: BookingService,
    private crudService: ApiCrudService,
    private router: Router,
    private snackBar: MatSnackBar,
    private schoolService: SchoolService,
    private cdr: ChangeDetectorRef,
    @Optional() @Inject(MAT_DIALOG_DATA) public incData: any
  ) {
    this.paymentOptions = this.buildDirectPaymentOptions();
    if (this.paymentOptions.length > 0) {
      this.selectedPaymentOptionId = this.paymentOptions[0].id;
      this.selectedPaymentOptionLabel = this.paymentOptions[0].label;
    }
  }

  ngOnInit(): void {
    this.isMobile = window.innerWidth <= 768;
    this.user = JSON.parse(localStorage.getItem("boukiiUser"));
    if (!this.incData) this.id = this.activatedRoute.snapshot.params.id;
    else this.id = this.incData.id;
    this.getDegrees();
    this.getBooking();
  }

  openDetailBookingDialog() {
    const isMobile = window.innerWidth < 768;

    const dialogRef = this.dialog.open(BookingDetailDialogComponent, {
      panelClass: ["customBookingDialog", isMobile ? "mobile-dialog" : ""],
      position: isMobile ? {
        bottom: "0",
        right: "0",
        top: "0",
        left: "0"
      } : {
        bottom: "24px",
        right: "24px",
        top: "24px",
        left: "24px"
      },
      maxWidth: isMobile ? "100vw" : "900px", // En lugar de -webkit-fill-available
      width: isMobile ? "100%" : "90%",
      height: isMobile ? "100%" : "auto",
      maxHeight: isMobile ? "100vh" : "90vh",
      data: {
        mainClient: this.mainClient,
        groupedActivities: this.groupedActivities,
        allLevels: this.allLevels,
        bookingData$: this.bookingData$,
        activitiesChanged$: this.activitiesChanged$,
        isMobile: isMobile
      },
    });

    dialogRef.componentInstance.deleteActivity.subscribe(() => {
      dialogRef.close()
      this.processFullDelete();
    });

    dialogRef.componentInstance.payActivity.subscribe(() => {
      dialogRef.close();
      this.handlePayClick();
    });

    dialogRef.componentInstance.closeClick.subscribe(() => {
      dialogRef.close();
    });
  }

  handlePayClick(): void {
    this.preparePaymentModalState();
    this.payModal = true;
  }

  private preparePaymentModalState(): void {
    this.step = 1;
    this.isPaid = false;

    if (!this.paymentOptions.length) {
      this.paymentOptions = this.buildDirectPaymentOptions();
    }

    const fallbackOption = this.paymentOptions[0] ?? null;

    if (!this.showConfirmationWithoutPaymentOption && this.paymentMethod === 4) {
      this.paymentMethod = 1;
      this.selectedPaymentOptionId = fallbackOption?.id ?? null;
      this.selectedPaymentOptionLabel = fallbackOption?.label ?? '';
    }

    if (this.paymentMethod === 1 && !this.selectedPaymentOptionId && fallbackOption) {
      this.selectedPaymentOptionId = fallbackOption.id;
      this.selectedPaymentOptionLabel = fallbackOption.label;
    }
  }


  getDegrees() {
    const user = JSON.parse(localStorage.getItem("boukiiUser"))
    this.crudService.list('/degrees', 1, 10000, 'asc', 'degree_order',
      '&school_id=' + user.schools[0].id + '&active=1')
      .subscribe((data) => {
        this.allLevels = data.data;
        this.hydrateGroupedActivitiesLevels();
      })
  }

  getBooking() {
    this.isLoading = true;
    this.crudService
      .get(`/admin/bookings/${this.id}/preview`)
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (data) => this.applyBookingData(data?.data),
        error: (error) => {
          console.error(error);
          this.snackBar.open(
            this.translateService.instant('snackbar.error'),
            this.getCloseActionLabel(),
            { duration: 3000 }
          );
        }
      });
  }

  private applyBookingData(booking: any): void {
    if (!booking) {
      return;
    }

    this.bookingData$.next(booking);
    this.bookingData = booking;
    this.bookingService.setBookingData(this.bookingData);
    const displayTotal = this.resolveDisplayTotal(this.bookingData);
    const hasStoredTotal = this.bookingData?.price_total !== null
      && this.bookingData?.price_total !== undefined
      && this.bookingData?.price_total !== '';
    if (!hasStoredTotal) {
      this.bookingData.price_total = displayTotal;
    }
    this.groupedActivities = this.groupBookingUsersByGroupId(booking);
    this.hydrateGroupedActivitiesLevels();
    this.mainClient = booking.client_main;
    this.syncPaymentSelectionFromBooking(booking);
  }

  private hydrateGroupedActivitiesLevels(): void {
    if (!Array.isArray(this.groupedActivities) || this.groupedActivities.length === 0) {
      return;
    }
    if (!Array.isArray(this.allLevels) || this.allLevels.length === 0) {
      return;
    }

    const normalizeText = (value: any): string => {
      return (value ?? '').toString().trim();
    };

    const buildDegreeLabel = (degree: any): string => {
      if (!degree) return '';
      const league = normalizeText(degree?.league);
      const name = normalizeText(degree?.name);
      return `${league} ${name}`.trim();
    };

    const formatSubgroupLabel = (degreeLabel: string, groupId: any): string => {
      const numericId = Number(groupId);
      const suffix = Number.isFinite(numericId)
        ? String(numericId).padStart(2, '0')
        : normalizeText(groupId);
      if (!suffix) return degreeLabel;
      const base = normalizeText(degreeLabel);
      if (!base) return suffix;
      return `${base} ${suffix}`.trim();
    };

    this.groupedActivities = this.groupedActivities.map(activity => {
      if (!activity) return activity;
      const degreeId = activity.degreeId ?? activity.sportLevel?.id ?? null;
      const resolved = degreeId != null
        ? this.allLevels.find((level: any) => String(level?.id) === String(degreeId)) || null
        : activity.sportLevel;
      const degreeLabel = buildDegreeLabel(resolved);
      const subgroupLabel = formatSubgroupLabel(degreeLabel, activity.groupId ?? activity.subgroupLabel);
      return {
        ...activity,
        sportLevel: resolved ?? activity.sportLevel,
        subgroupLabel: subgroupLabel || activity.subgroupLabel
      };
    });

    this.cdr.detectChanges();
  }

  closeModal() {
    this.dialog.closeAll();
  }

  groupBookingUsersByGroupId(booking: any) {

    const normalizeText = (value: any): string => {
      return (value ?? '').toString().trim();
    };

    const buildDegreeLabel = (degree: any): string => {
      if (!degree) return '';
      const league = normalizeText(degree?.league);
      const name = normalizeText(degree?.name);
      const combined = `${league} ${name}`.trim();
      return combined;
    };

    const resolveDegreeLevel = (user: any): any => {
      if (user?.degree) {
        return user.degree;
      }
      const degreeId = user?.degree_id ?? user?.degreeId ?? user?.degree?.id;
      if (degreeId != null && Array.isArray(this.allLevels)) {
        return this.allLevels.find((level: any) => String(level?.id) === String(degreeId)) || null;
      }
      return null;
    };

    const resolveDegreeLabel = (user: any): string => {
      const level = resolveDegreeLevel(user);
      return buildDegreeLabel(level);
    };

    const formatSubgroupLabel = (degreeLabel: string, groupId: any): string => {
      const numericId = Number(groupId);
      const suffix = Number.isFinite(numericId)
        ? String(numericId).padStart(2, '0')
        : normalizeText(groupId);
      if (!suffix) return degreeLabel;
      const base = normalizeText(degreeLabel);
      if (!base) return suffix;
      return `${base} ${suffix}`.trim();
    };

    const parseTimeToMinutes = (time: string): number | null => {
      if (!time) {
        return null;
      }

      const parts = time.split(':');
      if (parts.length < 2) {
        return null;
      }

      const hours = Number(parts[0]);
      const minutes = Number(parts[1]);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
      }

      return hours * 60 + minutes;
    };

    const parseDurationValueToMinutes = (value: any): number | null => {
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
    };

    const formatIntervalLabel = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;

      if (hours <= 0) {
        return `${mins}m`;
      }

      if (mins === 0) {
        return `${hours}h`;
      }

      return `${hours}h ${mins}m`;
    };

    const normalizeDurationInfo = (rawDuration: any, startHour?: string, endHour?: string) => {
      let minutes = parseDurationValueToMinutes(rawDuration);

      if (minutes === null && startHour && endHour) {
        const start = parseTimeToMinutes(startHour);
        const end = parseTimeToMinutes(endHour);

        if (start !== null && end !== null && end >= start) {
          minutes = end - start;
        }
      }

      if (minutes === null) {
        minutes = 0;
      }

      const normalizedMinutes = Math.max(Math.round(minutes / 15) * 15, 0);

      return {
        minutes: normalizedMinutes,
        label: formatIntervalLabel(normalizedMinutes)
      };
    };

    this.mainClient = booking.client_main;

    // Safety check for booking_users
    if (!booking.booking_users || !Array.isArray(booking.booking_users) || booking.booking_users.length === 0) {
      console.warn('No booking_users data available for booking:', booking.id);
      return [];
    }

    const groupedActivities = Object.values(booking.booking_users.reduce((acc: any, user: any) => {
      // Safety checks for user data
      if (!user || !user.course) {
        console.warn('Invalid user data in booking_users:', user);
        return acc;
      }

      const groupId = user.group_id;
      const courseType = user.course.course_type;

      if (!acc[groupId]) {
        const resolvedLevel = resolveDegreeLevel(user);
        const degreeLabel = buildDegreeLabel(resolvedLevel);
        acc[groupId] = {
          sport: user.course.sport,
          course: user.course,
          sportLevel: resolvedLevel,
          subgroupLabel: formatSubgroupLabel(degreeLabel, groupId),
          groupId: groupId,
          degreeId: user?.degree_id ?? user?.degreeId ?? user?.degree?.id ?? resolvedLevel?.id ?? null,
          dates: [],
          monitors: [],
          utilizers: [],
          clientObs: user.notes,
          schoolObs: user.notes_school,
          total: user.price,
          status: user.status,
          statusList: [] // Nuevo array para almacenar los status de los usuarios
        };
      }

      acc[groupId].statusList.push(user.status);

      // Determinar el nuevo status basado en los valores de statusList
      const uniqueStatuses = new Set(acc[groupId].statusList);

      if (uniqueStatuses.size === 1) {
        acc[groupId].status = [...uniqueStatuses][0]; // Si todos son iguales, asignamos ese mismo status
      } else {
        acc[groupId].status = 3; // Si hay mezcla de 1 y 2, el status del grupo es 3
      }

      const isUserAlreadyAdded = acc[groupId].utilizers.some(utilizer =>
        utilizer.first_name === user.client.first_name &&
        utilizer.last_name === user.client.last_name
      );

      if (!isUserAlreadyAdded) {
        acc[groupId].utilizers.push({
          id: user.client_id,
          first_name: user.client.first_name,
          last_name: user.client.last_name,
          image: user.client.image || null,
          birth_date: user.client.birth_date,
          language1_id: user.client.language1_id,
          country: user.client.country,
          extras: []
        });
      }
      const dateIndex = acc[groupId].dates.findIndex((date: any) =>
        date.id === user.course_date_id &&
        date.startHour === user.hour_start &&
        date.endHour === user.hour_end
      );
      if (dateIndex === -1) {
        const courseDateFromCourse = (user.course?.course_dates || []).find((d: any) => d.id === user.course_date_id);
        const resolvedDate = courseDateFromCourse?.date || user.course_date?.date || user.date || null;

        const durationInfo = normalizeDurationInfo(user.formattedDuration ?? user.duration, user.hour_start, user.hour_end);

        acc[groupId].dates.push({
          id: user.course_date_id,
          date: resolvedDate,
          startHour: user.hour_start,
          endHour: user.hour_end,
          duration: durationInfo.label,
          durationMinutes: durationInfo.minutes,
          currency: booking.currency,
          monitor: user.monitor,
          utilizers: [],
          extras: [],
          booking_users: [],
          interval_id: courseDateFromCourse?.interval_id ?? user.course_interval_id ?? user.interval_id ?? null,
          interval_name: courseDateFromCourse?.interval_name ?? user.interval_name ?? null
        });
      }
      const currentDate = acc[groupId].dates.find((date: any) =>
        date.id === user.course_date_id &&
        date.startHour === user.hour_start &&
        date.endHour === user.hour_end
      );
      currentDate.booking_users.push(user);
      if (courseType !== 1) {
        const isUserAlreadyAdded = currentDate.utilizers.some(utilizer =>
          utilizer.first_name === user.client.first_name &&
          utilizer.last_name === user.client.last_name
        );

        if (!isUserAlreadyAdded) {
          currentDate.utilizers.push({
            id: user.client_id,
            first_name: user.client.first_name,
            last_name: user.client.last_name,
            image: user.client.image || null,
            birth_date: user.client.birth_date,
            language1_id: user.client.language1_id,
            country: user.client.country,
            extras: []
          });
        }
        const utilizer = currentDate.utilizers.find(utilizer =>
          utilizer.first_name === user.client.first_name &&
          utilizer.last_name === user.client.last_name
        );
        if (user.booking_user_extras && user.booking_user_extras.length > 0) utilizer.extras.push(...user.booking_user_extras.map((extra: any) => (extra.course_extra)));
      }
      if (courseType === 1 && user.booking_user_extras && user.booking_user_extras.length > 0) currentDate.extras.push(...user.booking_user_extras.map((extra: any) => (extra.course_extra)));

      if (user.monitor_id) acc[groupId].monitors.push(user.monitor_id);
      return acc;
    }, {}));
    groupedActivities.forEach((groupedActivity: any) => {
      groupedActivity.dates.forEach((date: any) => {
        const priceForDate = this.bookingService.calculateDatePrice(groupedActivity.course, date, true);
        date.price = priceForDate.toFixed(2);
        date.currency = groupedActivity.course?.currency || booking.currency;
      });

      groupedActivity.total = groupedActivity.dates.reduce((sum: number, date: any) => {
        const parsed = parseFloat(date.price);
        return sum + (Number.isNaN(parsed) ? 0 : parsed);
      }, 0);

      groupedActivity.discountInfo = buildDiscountInfoList(groupedActivity.course, groupedActivity.dates);
      const discountAmount = groupedActivity.discountInfo?.reduce((acc: number, info: any) => {
        const amount = info?.amountSaved ?? 0;
        return acc + (parseFloat(amount) || 0);
      }, 0) || 0;

      groupedActivity.baseBeforeDiscount = groupedActivity.total;
      groupedActivity.discountAmount = discountAmount;
      groupedActivity.total = Math.max(0, groupedActivity.baseBeforeDiscount - groupedActivity.discountAmount);
      groupedActivity.currency = groupedActivity.course?.currency || booking.currency;
    });


    // MEJORA CRÍTICA: Forzar detección de cambios para actualizar la UI
    this.cdr.detectChanges();

    return groupedActivities;
  }

  editActivity(data: any, index: any) {
    if (data && data.course_dates) {
      // Usar la información de priceChange del componente unificado
      if (data.priceChange) {
        this.handleBookingChangeWithPriceChange(data, index);
      } else {
        // Sin cambio de precio, proceder normalmente
        this.processActivityUpdate(data, index);
      }
    }
    else if (data && (data.schoolObs || data.clientObs)) {
      this.groupedActivities[index].schoolObs = data.schoolObs;
      this.groupedActivities[index].clientObs = data.clientObs;
      this.editObservations(this.groupedActivities[index].dates[0].booking_users[0].id, data)
    } else {
      this.getBooking();
    }
  }

  /**
   * Maneja cambios de reserva con cambios de precio (añadir o quitar fechas)
   */
  private handleBookingChangeWithPriceChange(data: any, index: number): void {
    const priceChange = data.priceChange;

    if (priceChange.type === 'add') {
      // AÑADIR FECHAS - Incremento de precio
      this.showPriceIncreaseDialog(priceChange, () => {
        this.processActivityUpdate(data, index);
      });
    } else if (priceChange.type === 'remove') {
      // QUITAR FECHAS - Cancelación parcial
      if (this.bookingData.paid) {
        // Si está pagado, mostrar diálogo de reembolso
        this.showPartialCancellationDialog(priceChange, () => {
          this.processActivityUpdateWithRefund(data, index, priceChange);
        });
      } else {
        // Si no está pagado, solo actualizar
        this.processActivityUpdate(data, index);
      }
    }
  }

  /**
   * Muestra diálogo de confirmación para incremento de precio
   */
  private showPriceIncreaseDialog(priceChange: any, onConfirm: () => void): void {
    const dialogMessage = `
      <div style="padding: 20px;">
        <h3 style="color: #4caf50; margin-bottom: 16px;">
          <mat-icon style="vertical-align: middle;">trending_up</mat-icon>
          ${this.translateService.instant('price_increase')}
        </h3>
        <p>${this.translateService.instant('booking_edit_add_dates_info')}</p>
        <div style="margin: 16px 0; padding: 16px; background-color: #f5f5f5; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>${this.translateService.instant('original_price')}:</span>
            <strong>${priceChange.oldPrice.toFixed(2)} ${this.bookingData.price_currency || 'CHF'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>${this.translateService.instant('new_price')}:</span>
            <strong>${priceChange.newPrice.toFixed(2)} ${this.bookingData.price_currency || 'CHF'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; color: #4caf50; font-size: 16px; font-weight: 600; padding-top: 8px; border-top: 1px solid #e0e0e0;">
            <span>${this.translateService.instant('to_pay')}:</span>
            <span>+${priceChange.difference.toFixed(2)} ${this.bookingData.price_currency || 'CHF'}</span>
          </div>
        </div>
        <p style="color: #666; font-size: 14px;">
          ${this.translateService.instant('booking_edit_add_dates_warning')}
        </p>
      </div>
    `;

    const snackBarRef = this.snackBar.open(
      this.translateService.instant('confirm_price_increase_question'),
      this.translateService.instant('confirm'),
      { duration: 10000, horizontalPosition: 'center', verticalPosition: 'top' }
    );

    snackBarRef.onAction().subscribe(() => {
      onConfirm();
    });
  }

  /**
   * Muestra diálogo de confirmación para cancelación parcial con reembolso
   */
  private showPartialCancellationDialog(priceChange: any, onConfirm: () => void): void {
    const removedDatesStr = priceChange.affectedDates
      .filter((d: any) => d.action === 'remove')
      .map((d: any) => moment(d.date).format('DD.MM.YYYY'))
      .join(', ');

    const dialogMessage = `
      <div style="padding: 20px;">
        <h3 style="color: #f44336; margin-bottom: 16px;">
          <mat-icon style="vertical-align: middle;">warning</mat-icon>
          ${this.translateService.instant('partial_cancellation')}
        </h3>
        <p>${this.translateService.instant('booking_edit_remove_dates_info')}</p>
        <div style="margin: 16px 0;">
          <strong>${this.translateService.instant('dates_to_cancel')}:</strong>
          <div style="margin-top: 8px; color: #666;">${removedDatesStr}</div>
        </div>
        <div style="margin: 16px 0; padding: 16px; background-color: #fff3e0; border-left: 4px solid #ff9800; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>${this.translateService.instant('original_price')}:</span>
            <strong>${priceChange.oldPrice.toFixed(2)} ${this.bookingData.price_currency || 'CHF'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span>${this.translateService.instant('new_price')}:</span>
            <strong>${priceChange.newPrice.toFixed(2)} ${this.bookingData.price_currency || 'CHF'}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; color: #f44336; font-size: 16px; font-weight: 600; padding-top: 8px; border-top: 1px solid #ffa726;">
            <span>${this.translateService.instant('refund_amount')}:</span>
            <span>${priceChange.difference.toFixed(2)} ${this.bookingData.price_currency || 'CHF'}</span>
          </div>
        </div>
        <p style="color: #e65100; font-size: 14px; font-weight: 500;">
          ${this.translateService.instant('booking_edit_refund_warning')}
        </p>
      </div>
    `;

    const snackBarRef = this.snackBar.open(
      this.translateService.instant('confirm_partial_cancellation_question'),
      this.translateService.instant('confirm'),
      { duration: 15000, horizontalPosition: 'center', verticalPosition: 'top' }
    );

    snackBarRef.onAction().subscribe(() => {
      onConfirm();
    });
  }

  /**
   * Procesa actualización de actividad con reembolso
   */
  private processActivityUpdateWithRefund(data: any, index: number, priceChange: any): void {
    // Primero actualizar la actividad
    this.processActivityUpdate(data, index);

    // Ejemplo: Crear voucher de crédito
    this.createCreditVoucherForRefund(priceChange.difference);
  }

  /**
   * Crea un voucher de crédito para el reembolso
   */
  private createCreditVoucherForRefund(amount: number): void {

    this.snackBar.open(
      this.translateService.instant('refund_credit_voucher_created', { amount: amount.toFixed(2) }),
      'OK',
      { duration: 5000 }
    );
  }

  editObservations(bookingUserId:number, data:any) {
    this.crudService
      .update("/booking-users", { notes: data.clientObs, notes_school: data.schoolObs }, bookingUserId)
      .subscribe(() => {
        this.snackBar.open(
          this.translateService.instant("snackbar.booking_detail.notes_client"),
          this.getCloseActionLabel(),
          { duration: 3000 }
        );
      }, error => {
        console.error(error);
      });
  }

  hasOtherActiveGroups(currentGroup: any): boolean {
    // Cuenta cuántas actividades tienen status 1 (activas)
    const activeGroupsCount = this.groupedActivities.filter(
      group => group.status === 1
    ).length;

    // Si el grupo actual tiene status 1 y hay más de una actividad activa,
    // significa que hay otras actividades activas además de la actual
    return currentGroup.status === 1 && activeGroupsCount > 1;
  }

  processDelete(index) {
    this.deleteIndex = index;
    const group = this.groupedActivities[index];
    if(!this.hasOtherActiveGroups(group)) {
      this.processFullDelete();
    } else {
      if(this.bookingData.paid) {
        const dialogRef = this.dialog.open(CancelPartialBookingModalComponent, {
          width: "1000px", // Asegurarse de que no haya un ancho máximo
          panelClass: "full-screen-dialog", // Si necesitas estilos adicionales,
          data: {
            itemPrice: group.total,
            booking: this.bookingData,
          },
        });

        dialogRef.afterClosed().subscribe((data: any) => {
          if (data) {
            this.bookingService.processCancellation(
              data, this.bookingData, this.hasOtherActiveGroups(group), this.user, group)
              .subscribe({
                next: () => {
                  this.getBooking();
                  this.snackBar.open(
                    this.translateService.instant('snackbar.booking_detail.update'),
                    this.getCloseActionLabel(),
                    { duration: 3000 }
                  );
                },
                error: (error) => {
                  console.error('Error processing cancellation:', error);
                  this.snackBar.open(
                    this.translateService.instant('snackbar.error'),
                    this.getCloseActionLabel(),
                    { duration: 3000 }
                  );
                }
              });

          }
        });

      } else {
        this.deleteModal = true;
      }
    }


  }

  processFullDelete() {
      const dialogRef = this.dialog.open(CancelBookingModalComponent, {
        width: "1000px", // Asegurarse de que no haya un ancho máximo
        panelClass: "full-screen-dialog", // Si necesitas estilos adicionales,
        data: {
          itemPrice: this.bookingData.price_total,
          booking: this.bookingData,
        },
      });

      dialogRef.afterClosed().subscribe((data: any) => {
        if (data) {
          this.bookingService.processCancellation(
            data, this.bookingData, false, this.user, null,
            this.bookingData.booking_users.map(b => b.id), this.bookingData.price_total)
            .subscribe({
              next: () => {
                this.getBooking();
                this.snackBar.open(
                  this.translateService.instant('snackbar.booking_detail.update'),
                  this.getCloseActionLabel(),
                  {duration: 3000}
                );
              },
              error: (error) => {
                console.error('Error processing cancellation:', error);
                this.snackBar.open(
                  this.translateService.instant('snackbar.error'),
                  this.getCloseActionLabel(),
                  {duration: 3000}
                );
              }
            });

        }
      });

  }

  cancelFull() {
    const bookingUserIds = this.bookingData.booking_users.map(b => b.id)
    this.crudService.post('/admin/bookings/cancel',
      { bookingUsers: bookingUserIds })
      .subscribe((response) => {
        let bookingData = {
          ...response.data,
          vouchers: response.data.voucher_logs
        };
        this.bookingData$.next(bookingData);
        this.snackBar.open(
          this.translateService.instant('snackbar.booking_detail.delete'),
          this.getCloseActionLabel(),
          { duration: 3000 }
        );
        this.deleteFullModal = false;
      });
  }

  cancelActivity(index: any) {
    const group = this.groupedActivities[index];

    // MEJORA: Unificar cancelación vía BookingService.processCancellation
    // para mantener consistencia en logs y auditoría
    this.bookingService.processCancellation(
      { type: 'no_refund' },
      this.bookingData,
      this.hasOtherActiveGroups(group),
      this.user,
      group
    ).subscribe({
      next: () => {
        this.getBooking();
        this.snackBar.open(
          this.translateService.instant('snackbar.booking_detail.delete'),
          this.getCloseActionLabel(),
          { duration: 3000 }
        );
        this.deleteModal = false;
      },
      error: (error) => {
        console.error('Error al cancelar actividad:', error);
        this.snackBar.open(
          this.translateService.instant('snackbar.error'),
          this.getCloseActionLabel(),
          { duration: 3000 }
        );
        this.deleteModal = false;
      }
    });
  }

  // Método para finalizar la reserva
  finalizeBooking(): void {
    if (!this.bookingData) {
      return;
    }

    // MEJORA: Implementar step 2 para pagos offline que requieren confirmación
    if (this.step === 1) {
      const paymentMethodId = this.determinePaymentMethodId();

      // Si es pago offline (efectivo/tarjeta o sin pago), ir al step 2 para confirmación
      if (paymentMethodId === 1 || paymentMethodId === 4) {
        this.step = 2;
        return;
      }
    }

    // Procesar pago (step 1 para pagos online o step 2 para pagos offline)
    const paymentMethodId = this.determinePaymentMethodId();
    const label = this.selectedPaymentOptionLabel || this.resolvePaymentLabel(paymentMethodId);

    const bookingData = {
      ...this.bookingData,
      selectedPaymentOption: label,
      payment_method_id: paymentMethodId,
      paid: false,
      paid_total: 0
    };

    const priceTotalRaw = this.resolveDisplayTotal(bookingData);
    const safePriceTotal = isNaN(priceTotalRaw) ? 0 : priceTotalRaw;

    const vouchersTotal = this.calculateTotalVoucherPrice();
    const safeVouchersTotal = isNaN(vouchersTotal) ? 0 : vouchersTotal;
    const outstanding = Math.max(0, safePriceTotal - safeVouchersTotal);

    if (outstanding === 0) {
      bookingData.paid = true;
      bookingData.paid_total = Math.max(0, safePriceTotal - safeVouchersTotal);
    }

    // MEJORA: Requerir confirmación explícita para pagos offline
    // Solo marcar como pagado si hay confirmación explícita del admin
    if ((paymentMethodId === 1 || paymentMethodId === 4) && this.isPaid) {
      bookingData.paid = true;
      bookingData.paid_total = Math.max(0, safePriceTotal - safeVouchersTotal);
    }

    // Enviar la reserva a la API
    this.crudService.post(`/admin/bookings/update/${this.id}/payment`, bookingData)
      .subscribe(
        (result: any) => {
          // Manejar pagos en línea
          if (bookingData.payment_method_id === 2 || bookingData.payment_method_id === 3) {
            this.crudService.post(`/admin/bookings/payments/${this.id}`, result.data.basket)
              .subscribe(
                (paymentResult: any) => {
                  if (bookingData.payment_method_id === 2) {
                    window.open(paymentResult.data, "_self");
                  } else {
                    this.snackBar.open(
                      this.translateService.instant('snackbar.booking_detail.send_mail'),
                      this.getCloseActionLabel(),
                      { duration: 1000 }
                    );
                  }
                },
                (error) => {
                  this.showErrorSnackbar(this.translateService.instant('snackbar.booking.payment.error'));
                }
              );
          } else {
            this.snackBar.open(
              this.translateService.instant('snackbar.booking_detail.update'),
              this.getCloseActionLabel(),
              { duration: 3000 }
            );
            this.payModal = false;
            this.bookingData$.next(result.data);
            this.bookingData = result.data;
            this.syncPaymentSelectionFromBooking(result.data);
          }
        },
        (error) => {
          this.showErrorSnackbar(this.translateService.instant('snackbar.booking.payment.error'));
        }
      );
  }

  calculateTotalVoucherPrice(): number {
    const vouchers = Array.isArray(this.bookingData?.vouchers)
      ? this.bookingData?.vouchers
      : Array.isArray((this.bookingData as any)?.voucher_logs)
        ? (this.bookingData as any)?.voucher_logs
        : [];
    return vouchers.reduce((total: number, item: any) => {
      const value = item?.bonus?.reducePrice;
      const num = typeof value === 'number' ? value : parseFloat(value ?? '0');
      return total + (isNaN(num) ? 0 : num);
    }, 0);
  }

  getPendingAmount(): number {
    if (!this.bookingData) {
      return 0;
    }
    this.bookingService.setBookingData(this.bookingData);
    return this.bookingService.calculatePendingPrice();
  }


  onPaymentMethodChange(event: any) {
    const value = event?.value;

    if (value === 1) {
      const defaultOption = this.paymentOptions[0];
      if (defaultOption) {
        this.selectedPaymentOptionId = defaultOption.id;
        this.selectedPaymentOptionLabel = defaultOption.label;
      } else {
        this.selectedPaymentOptionId = null;
        this.selectedPaymentOptionLabel = '';
      }
    } else if (value === 3) {
      this.selectedPaymentOptionId = 3;
      this.selectedPaymentOptionLabel = this.resolvePaymentLabel(3);
    } else if (value === 4) {
      this.selectedPaymentOptionId = 5;
      this.selectedPaymentOptionLabel = this.resolvePaymentLabel(5);
    } else {
      this.selectedPaymentOptionId = null;
      this.selectedPaymentOptionLabel = '';
    }
  }

  onPaymentOptionSelectionChange(methodId: PaymentMethodId): void {
    this.selectedPaymentOptionId = methodId;
    this.selectedPaymentOptionLabel = this.resolvePaymentLabel(methodId);
  }
  cancelPaymentStep() {
    if(this.step == 1) {
      this.payModal = false;
    }
    this.step = 1;  // Regresar al paso 1
    this.isPaid = false;  // Resetear isPaid
  }

  /**
   * MEJORA: Calcular reembolso proporcional por fechas eliminadas
   */
  calculateRefundForRemovedDates(originalDatesCount: number, newDatesCount: number, originalTotal: number): number {
    if (originalDatesCount <= newDatesCount) return 0;

    const removedDates = originalDatesCount - newDatesCount;
    const pricePerDate = originalTotal / originalDatesCount;
    return Math.round(removedDates * pricePerDate * 100) / 100; // Redondear a 2 decimales
  }

  /**
   * MEJORA: Mostrar diálogo de preview de reembolso
   */
  showRefundPreviewDialog(refundAmount: number, datesRemoved: number, onConfirm: () => void): void {
    const currency = this.groupedActivities[0]?.course?.currency || '€';

    const dialogRef = this.dialog.open(CancelPartialBookingModalComponent, {
      width: "600px",
      panelClass: "refund-preview-dialog",
      data: {
        itemPrice: refundAmount,
        booking: this.bookingData,
        datesRemoved: datesRemoved,
        isDateRemovalRefund: true,
        currency: currency,
        title: 'Fechas eliminadas - Reembolso requerido'
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.type) {
        // Procesar el reembolso según el tipo seleccionado
        this.processRefundForRemovedDates(result, refundAmount, onConfirm);
      } else {
        // Usuario canceló, no hacer cambios
        this.snackBar.open(
          this.translateService.instant('snackbar.booking_detail.cancelled'),
          this.getCloseActionLabel(),
          { duration: 3000 }
        );
      }
    });
  }

  /**
   * MEJORA: Procesar reembolso por fechas eliminadas
   */
  processRefundForRemovedDates(refundData: any, amount: number, onConfirm: () => void): void {
    // Crear un grupo mock para el reembolso
    const refundGroup = {
      total: amount,
      dates: [], // No hay fechas específicas para el reembolso
      status: 1
    };

    this.bookingService.processCancellation(
      refundData,
      this.bookingData,
      true, // Es parcial
      this.user,
      refundGroup
    ).subscribe({
      next: () => {
        this.snackBar.open(
          this.translateService.instant('snackbar.booking_detail.refund_processed') + `: ${amount}${this.bookingData.currency}`,
          this.getCloseActionLabel(),
          { duration: 4000 }
        );
        // Proceder con la actualización de fechas
        onConfirm();
      },
      error: (error) => {
        console.error('Error procesando reembolso:', error);
        this.snackBar.open(
          this.translateService.instant('snackbar.error') + ': ' + (error.message || 'Error desconocido'),
          this.getCloseActionLabel(),
          { duration: 3000 }
        );
      }
    });
  }

  /**
   * MEJORA: Separar la lógica de actualización de actividad
   */
  processActivityUpdate(data: any, index: any): void {
    this.isLoading = true;
    this.crudService.post('/admin/bookings/update',
      {
        dates: data.course_dates,
        total: data.total,
        group_id: this.groupedActivities[index].dates[0].booking_users[0].group_id,
        booking_id: this.id
      })
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (response) => {
          if (response?.data) {
            this.applyBookingData(response.data);
          } else {
            this.getBooking();
          }
          this.snackBar.open(
            this.translateService.instant('snackbar.booking_detail.update'),
            this.getCloseActionLabel(),
            { duration: 3000 }
          );
        },
        error: (error) => {
          console.error(error);
          this.snackBar.open(
            this.translateService.instant('snackbar.error'),
            this.getCloseActionLabel(),
            { duration: 3000 }
          );
        }
      });
  }


  showErrorSnackbar(message: string): void {
    this.snackBar.open(message, this.getCloseActionLabel(), {
      duration: 3000,
      panelClass: ['error-snackbar']
    });
  }


}
