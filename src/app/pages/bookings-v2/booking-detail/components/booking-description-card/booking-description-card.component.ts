import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ChangeMonitorOption } from "src/app/static-data/changeMonitorOptions";
import { LangService } from "src/service/langService";
import { UtilsService } from "src/service/utils.service";
import { MatDialog } from '@angular/material/dialog';
import { FormDetailsPrivateComponent } from '../form-details-private/form-details-private.component';
import { FormDetailsColectiveFlexComponent } from '../form-details-colective-flex/form-details-colective-flex.component';
import { FormDetailsColectiveFixComponent } from '../form-details-colective-fix/form-details-colective-fix.component';
import { StepObservationsComponent } from '../step-observations/step-observations.component';
import { BookingDatesEditUnifiedComponent } from '../booking-dates-edit-unified/booking-dates-edit-unified.component';
import {TranslateService} from '@ngx-translate/core';
import {BookingService} from '../../../../../../service/bookings.service';
import {ApiCrudService} from '../../../../../../service/crud.service';
import {Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';
import {
  AppliedDiscountInfo,
  buildDiscountInfoList,
  resolveIntervalName
} from 'src/app/pages/bookings-v2/shared/discount-utils';

export interface BookingDescriptionCardDate {
  date: string;
  startHour: string;
  endHour: string;
  price: string;
  currency: string;
  changeMonitorOption?: ChangeMonitorOption;
  monitor?: Record<string, any>;
  utilizer?: Record<string, any>[];
  utilizers?: Record<string, any>[];
  booking_users?: any[];
  extras?: Record<string, any>[];
}

@Component({
  selector: "booking-detail-description-card",
  templateUrl: "./booking-description-card.component.html",
  styleUrls: ["./booking-description-card.component.scss"],
})
export class BookingDescriptionCard implements OnChanges {
  @Output() editActivity = new EventEmitter();
  @Output() deleteActivity = new EventEmitter();

  @Input() utilizers: any;
  @Input() sport: any;
  @Input() sportLevel: any;
  @Input() allLevels: any;
  @Input() course: any;
  @Input()
  set dates(value: any[]) {
    console.log('🔍 CARD COMPONENT DEBUG - Dates setter called with value:', value);
    this._dates = value || [];
    if (this._dates.length > 0) {
      console.log('🔍 CARD COMPONENT DEBUG - First date in setter:', this._dates[0]);
    }
    this.extractUniqueMonitors();
    this.refreshDiscountInfo();
  }

  get dates(): any[] {
    return this._dates;
  }
  @Input() monitors: any;
  @Input() clientObs: any;
  @Input() schoolObs: any;
  @Input() groupedActivities: any;
  @Input() total: any;
  @Input() summaryMode = false;
  @Input() isDetail = false;
  @Input() status = 1;
  @Input() index: number = 1;
  uniqueMonitors: any[] = []; // Monitores únicos
  private _dates: any[] = [];
  discountInfoList: AppliedDiscountInfo[] = [];
  intervalGroups: Array<{
    key: string;
    label: string;
    dates: any[];
    discountInfo: AppliedDiscountInfo[];
  }> = [];

  constructor(
    public translateService: TranslateService,
    public bookingService: BookingService,
    protected langService: LangService,
    protected utilsService: UtilsService,
    public dialog: MatDialog
  ) {
    this.extractUniqueMonitors();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['course'] && !changes['course'].firstChange) ||
      (changes['dates'] && !changes['dates'].firstChange)) {
      this.refreshDiscountInfo();
    }
  }

  formatDate(date: string) {
    return this.utilsService.formatDate(date);
  }

  private extractUniqueMonitors() {
    if (this.dates.length) {
      const allMonitors = this.dates.map((date) => date.monitor).filter((monitor) => !!monitor);
      this.uniqueMonitors = allMonitors.filter(
        (monitor, index, self) => self.findIndex((m) => m.id === monitor.id) === index
      );
    } else {
      this.uniqueMonitors = [];
    }
  }

  private refreshDiscountInfo(): void {
    if (this.course && Array.isArray(this._dates) && this._dates.length > 0) {
      this.discountInfoList = buildDiscountInfoList(this.course, this._dates);
    } else {
      this.discountInfoList = [];
    }
    this.rebuildIntervalGroups();
  }

  hasExtrasForDate(date: any): boolean {
    // Verifica si hay utilizadores para la fecha y si al menos uno tiene extras
    return date.utilizers?.some((utilizer: any) => utilizer.extras && utilizer.extras.length > 0) || false;
  }

  private rebuildIntervalGroups(): void {
    const discountByKey = new Map<string, AppliedDiscountInfo[]>();
    this.discountInfoList.forEach(discount => {
      const key = discount.intervalId ? String(discount.intervalId) : 'default';
      if (!discountByKey.has(key)) {
        discountByKey.set(key, []);
      }
      discountByKey.get(key)!.push(discount);
    });

    const groupsMap = new Map<string, {
      key: string;
      label: string;
      dates: any[];
      discountInfo: AppliedDiscountInfo[];
    }>();

    this._dates.forEach(date => {
      const key = date?.interval_id ? String(date.interval_id) : 'default';
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          label: this.resolveIntervalLabel(key, date),
          dates: [],
          discountInfo: discountByKey.get(key) || []
        });
      }
      groupsMap.get(key)!.dates.push(date);
    });

    this.intervalGroups = Array.from(groupsMap.values());
  }

  private resolveIntervalLabel(key: string, sampleDate: any): string {
    if (sampleDate?.interval_name) {
      return sampleDate.interval_name;
    }
    if (key === 'default') {
      const translated = this.translateService.instant('all_dates');
      return translated && translated !== 'all_dates' ? translated : 'General';
    }
    const resolved = resolveIntervalName(this.course, key);
    return resolved || `${this.translateService.instant('interval')} ${key}`;
  }

  getDiscountsForInterval(interval: { discountInfo: AppliedDiscountInfo[] }): AppliedDiscountInfo[] {
    return interval?.discountInfo || [];
  }

  getGlobalIndexForDate(date: any): number {
    return this._dates.indexOf(date);
  }

  calculateDiscountedPrice(date: any, index: number): number {
    let price = this.bookingService.calculateDatePrice(this.course, date, true);

    if (this.course && this.course.discounts) {
      let parsedDiscounts: any[] = [];

      if (Array.isArray(this.course.discounts)) {
        parsedDiscounts = this.course.discounts;
      } else {
        try {
          const parsed = JSON.parse(this.course.discounts);
          if (Array.isArray(parsed)) {
            parsedDiscounts = parsed;
          }
        } catch (error) {
          console.error("Error al parsear discounts:", error);
        }
      }

      parsedDiscounts.forEach(discount => {
        if (discount.date === index + 1 && discount.percentage) {
          price -= (price * (discount.percentage / 100));
        }
      });
    }

    return price;
  }

  shouldShowPrice(course: any, date: any, index: number): boolean {
    // Si es course_type !== 1 y no es flexible, mostrar solo en la primera fecha
    if (course.course_type === 1 && !course.is_flexible) {
      return index === 0;
    }

    // En otros casos, mostrar el precio normalmente
    return true;
  }


  isDiscounted(date: any, index: number): boolean {
    const price = parseFloat(date.price);
    if (this.course && this.course.discounts && !Array.isArray(this.course.discounts) ) {
      const discounts = [];
      try {
        const discounts = JSON.parse(this.course.discounts);
        console.log("Discounts parseado correctamente:", discounts);
      } catch (error) {
        console.error("Error al parsear discounts:", error);
      }
      return discounts.some(discount => discount.date === index + 1); // Index + 1 porque los índices en arrays comienzan en 0
    }
    return false;
  }

  getExtraDescription(dateExtra) {
    return dateExtra.map((extra) => extra?.description).join(", ");
  }

  getExtraName(dateExtra) {
    return dateExtra.map((extra) => extra?.name).join(", ");
  }

  getExtraPrice(dateExtra) {
    return dateExtra.map((extra) => extra?.price).join(", ");
  }

  sendEditForm(dates: any, course: any, utilizers: any = []) {
    // Usar el componente unificado para todos los tipos de curso
    this.openUnifiedDatesEditForm(dates, course, utilizers);
  }

  private openUnifiedDatesEditForm(dates: any, course: any, utilizers: any = []) {
    const dialogRef = this.dialog.open(BookingDatesEditUnifiedComponent, {
      width: '800px',
      maxHeight: '90vh',
      panelClass: 'customBookingDialog',
      data: {
        course: course,
        utilizers: utilizers,
        sportLevel: this.sportLevel,
        initialData: dates,
        groupedActivities: this.groupedActivities
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('📌 Edit Result:', result);

        // Actualizar las fechas
        this.dates = result.course_dates || dates;

        // Calcular el nuevo total
        if (result.course_dates) {
          this.total = result.course_dates.reduce((acc: number, date: any) => {
            let datePrice = parseFloat(date.price || 0);

            // Sumar extras si existen
            if (date.extras && date.extras.length > 0) {
              const extrasPrice = date.extras.reduce((sum: number, extra: any) =>
                sum + parseFloat(extra.price || 0), 0);
              datePrice += extrasPrice;
            }

            return acc + datePrice;
          }, 0).toFixed(2);
        }

        result.total = this.total;
        result.priceChange = result.priceChange; // Incluir información de cambio de precio

        // Emitir el evento de edición
        this.editActivity.emit(result);
      } else {
        this.editActivity.emit(result);
      }
    });
  }



  private openPrivateDatesForm(dates: any, course: any, utilizers: any = []) {
    const dialogRef = this.dialog.open(FormDetailsPrivateComponent, {
      width: "800px",
      panelClass: "customBookingDialog",
      data: {
        utilizers: utilizers,
        sport: course.sport,
        sportLevel: this.sportLevel,
        course: course,
        groupedActivities: this.groupedActivities,
        initialData: dates
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Aquí manejas los datos actualizados que provienen del modal
        this.dates = result.course_dates;
        this.total = this.dates[0].price
        result.total = this.total;
        this.editActivity.emit(result);
        // Aquí puedes tomar los datos y hacer lo que necesites con ellos
        // Por ejemplo, enviarlos al backend o actualizar la UI
        //this.updateBooking(result);
      } else {
        this.editActivity.emit(result);
      }
    });
  }

  private openCollectiveFlexDatesForm(dates: any, course: any, utilizers: any = []) {
    const dialogRef = this.dialog.open(FormDetailsColectiveFlexComponent, {
      width: "800px",
      height: "800px",
      panelClass: "customBookingDialog",
      data: {
        utilizer: utilizers[0],
        sport: course.sport,
        sportLevel: this.sportLevel,
        course: course,
        groupedActivities: this.groupedActivities,
        initialData: dates
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Aquí manejas los datos actualizados que provienen del modal
        this.dates = result.course_dates;
        this.total = this.dates.reduce((acc, date) =>
          acc + parseFloat(date.price), 0).toFixed(2);
        result.total = this.total;
        this.editActivity.emit(result);
        // Aquí puedes tomar los datos y hacer lo que necesites con ellos
        // Por ejemplo, enviarlos al backend o actualizar la UI
        //this.updateBooking(result);
      } else {
        this.editActivity.emit(result);
      }
    });
  }

  private openCollectiveFixDatesForm(dates: any, course: any, utilizers: any = []) {
    const dialogRef = this.dialog.open(FormDetailsColectiveFixComponent, {
      width: "800px",
      panelClass: "customBookingDialog",
      data: {
        utilizer: utilizers[0],
        sport: course.sport,
        sportLevel: this.sportLevel,
        course: course,
        groupedActivities: this.groupedActivities,
        initialData: dates
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Aquí manejas los datos actualizados que provienen del modal
        this.dates = result.course_dates;
        this.total = this.dates.reduce((acc, date) =>
          acc + parseFloat(date.price), 0).toFixed(2);
        result.total = this.total;
        this.editActivity.emit(result);
        // Aquí puedes tomar los datos y hacer lo que necesites con ellos
        // Por ejemplo, enviarlos al backend o actualizar la UI
        //this.updateBooking(result);
      } else {
        this.editActivity.emit(result);
      }
    });
  }

  openObservationsForm(clientObs: any, schoolObs: any) {
    const dialogRef = this.dialog.open(StepObservationsComponent, {
      width: "800px",
      panelClass: "customBookingDialog",
      data: {
        initialData: {
          clientObs: clientObs,
          schoolObs: schoolObs
        }
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Aquí manejas los datos actualizados que provienen del modal
        this.schoolObs = result.schoolObs;
        this.clientObs = result.clientObs;
        this.editActivity.emit(result);
        //this.updateBooking(result);
      }
    });
  }



  protected readonly parseFloat = parseFloat;
}
