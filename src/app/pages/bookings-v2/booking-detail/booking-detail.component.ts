import { Component, Inject, OnInit, Optional } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { BookingService } from '../../../../service/bookings.service';
import { ApiCrudService } from '../../../../service/crud.service';
import {ActivatedRoute, Router} from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BookingDialogComponent } from '../bookings-create-update/components/booking-dialog/booking-dialog.component';
import {
  CancelPartialBookingModalComponent
} from '../../bookings/cancel-partial-booking/cancel-partial-booking.component';
import {CancelBookingModalComponent} from '../../bookings/cancel-booking/cancel-booking.component';
import {BookingDetailDialogComponent} from './components/booking-dialog/booking-dialog.component';
import { SchoolService } from 'src/service/school.service';
import { PAYMENT_METHODS, PaymentMethodId } from '../../../shared/payment-methods';

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
  paymentOptions: Array<{ id: PaymentMethodId; label: string }> = [];
  readonly paymentMethods = PAYMENT_METHODS;

  private activitiesChangedSubject = new Subject<void>();

  activitiesChanged$ = this.activitiesChangedSubject.asObservable();

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
      return this.translateService.instant('payment_paylink');
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
      return this.translateService.instant('payment_payyo');
    }

    const providerName = provider ? this.formatProviderName(provider) : 'Boukii Pay';
    return this.translateService.instant('payment_gateway', { provider: providerName });
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
      dialogRef.close()
      this.payModal = true;
    });

    dialogRef.componentInstance.closeClick.subscribe(() => {
      dialogRef.close();
    });
  }


  getDegrees() {
    const user = JSON.parse(localStorage.getItem("boukiiUser"))
    this.crudService.list('/degrees', 1, 10000, 'asc', 'degree_order',
      '&school_id=' + user.schools[0].id + '&active=1')
      .subscribe((data) => this.allLevels = data.data)
  }

  getBooking() {
    this.crudService
      .get("/bookings/" + this.id, [
        "user",
        "clientMain.clientSports",
        "vouchersLogs.voucher",
        "bookingUsers.course.courseDates.courseGroups.courseSubgroups",
        "bookingUsers.course.courseExtras",
        "bookingUsers.bookingUserExtras.courseExtra",
        "bookingUsers.client.clientSports",
        "bookingUsers.courseDate",
        "bookingUsers.monitor.monitorSportsDegrees",
        "bookingUsers.degree",
        "payments",
        "bookingLogs"
      ])
      .subscribe((data) => {
        this.bookingData$.next(data.data);
        this.bookingData = data.data;
        // Asegurar estructura de actividades agrupadas y totales calculados
        this.groupedActivities = this.groupBookingUsersByGroupId(data.data);
        this.mainClient = data.data.client_main;
        this.syncPaymentSelectionFromBooking(data.data);
      });
  }

  closeModal() {
    this.dialog.closeAll();
  }

  groupBookingUsersByGroupId(booking: any) {
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
        acc[groupId] = {
          sport: user.course.sport,
          course: user.course,
          sportLevel: user.degree,
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

        acc[groupId].dates.push({
          id: user.course_date_id,
          date: resolvedDate,
          startHour: user.hour_start,
          endHour: user.hour_end,
          duration: user.formattedDuration,
          currency: booking.currency,
          monitor: user.monitor,
          utilizers: [],
          extras: [],
          booking_users: [],
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
      groupedActivity.total = this.bookingService.calculateActivityPrice(groupedActivity);

      console.log('🔍 BOOKING DETAIL DEBUG - Processing activity:', {
        courseName: groupedActivity.course?.name,
        isFlexible: groupedActivity.course?.is_flexible,
        utilizersCount: groupedActivity.utilizers?.length,
        datesCount: groupedActivity.dates?.length,
        priceRange: groupedActivity.course?.price_range
      });

      // MEJORA CRÍTICA: Calcular precio individual para cada fecha
      if (groupedActivity.course?.is_flexible && groupedActivity.utilizers?.length) {
        groupedActivity.dates.forEach((date: any, index: number) => {
          const duration = date.duration;
          const selectedUtilizers = groupedActivity.utilizers.length;

          console.log(`🔍 BOOKING DETAIL DEBUG - Date ${index}:`, {
            date: date.date,
            duration,
            selectedUtilizers,
            beforePrice: date.price
          });

          // Encuentra el intervalo de duración que se aplica
          const interval = groupedActivity.course.price_range?.find(range => {
            return range.intervalo === duration;
          });

          if (interval) {
            // Intentar acceso con número y string para compatibilidad
            const priceForPax = parseFloat(interval[selectedUtilizers]) || parseFloat(interval[selectedUtilizers.toString()]) || 0;
            date.price = priceForPax.toString();
            date.currency = groupedActivity.course.currency || 'CHF';

            console.log(`🔍 BOOKING DETAIL DEBUG - Price calculated:`, {
              priceForPax,
              datePrice: date.price,
              currency: date.currency
            });
          } else {
            console.log(`🔍 BOOKING DETAIL DEBUG - No interval found for duration:`, duration);
            date.price = '0';
            date.currency = groupedActivity.course.currency || 'CHF';
          }
        });
      } else if (!groupedActivity.course?.is_flexible) {
        // Para cursos no flexibles, usar el precio base
        groupedActivity.dates.forEach((date: any) => {
          date.price = groupedActivity.course?.price || '0';
          date.currency = groupedActivity.course?.currency || 'CHF';

          console.log('🔍 BOOKING DETAIL DEBUG - Fixed price assigned:', {
            datePrice: date.price,
            currency: date.currency
          });
        });
      }
    });

    return groupedActivities;
  }

  editActivity(data: any, index: any) {
    if (data && data.course_dates) {
      // MEJORA: Verificar si se eliminaron fechas y calcular reembolso
      const originalDates = this.groupedActivities[index].dates;
      const newDates = data.course_dates;
      const originalTotal = this.groupedActivities[index].total;

      const datesRemoved = originalDates.length - newDates.length;
      const hasRemovedDates = datesRemoved > 0;

      if (hasRemovedDates && this.bookingData.paid) {
        // Calcular reembolso proporcional por fechas eliminadas
        const refundAmount = this.calculateRefundForRemovedDates(
          originalDates.length,
          newDates.length,
          originalTotal
        );

        this.showRefundPreviewDialog(refundAmount, datesRemoved, () => {
          this.processActivityUpdate(data, index);
        });
      } else {
        // No hay fechas eliminadas o no está pagado, proceder normalmente
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

    const priceTotalRaw = bookingData.price_total as any;
    const priceTotalNum = typeof priceTotalRaw === 'number' ? priceTotalRaw : parseFloat(priceTotalRaw ?? '0');
    const safePriceTotal = isNaN(priceTotalNum) ? 0 : priceTotalNum;

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
    this.crudService.post('/admin/bookings/update',
      {
        dates: data.course_dates,
        total: data.total,
        group_id: this.groupedActivities[index].dates[0].booking_users[0].group_id,
        booking_id: this.id
      })
      .subscribe((response) => {
        this.getBooking();
        this.snackBar.open(
          this.translateService.instant('snackbar.booking_detail.update'),
          this.getCloseActionLabel(),
          { duration: 3000 }
        );
      });
  }


  showErrorSnackbar(message: string): void {
    this.snackBar.open(message, this.getCloseActionLabel(), {
      duration: 3000,
      panelClass: ['error-snackbar']
    });
  }


}
