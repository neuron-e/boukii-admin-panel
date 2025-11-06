import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ChangeMonitorOption } from "src/app/static-data/changeMonitorOptions";
import { LangService } from "src/service/langService";
import { UtilsService } from "src/service/utils.service";

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
  extras?: Record<string, any>[];
}

@Component({
  selector: "booking-description-card",
  templateUrl: "./booking-description-card.component.html",
  styleUrls: ["./booking-description-card.component.scss"],
})
export class BookingDescriptionCard {
  @Output() editActivity = new EventEmitter();
  @Output() deleteActivity = new EventEmitter();

  @Input() utilizers: any;
  @Input() allLevels: any;
  @Input() sport: any;
  @Input() sportLevel: any;
  @Input() course: any;
  @Input()
  set dates(value: any[]) {
    this._dates = [...(value || [])]; // Crear nueva referencia
    this.extractUniqueMonitors();
  }

  public _dates: any[] = [];

  get dates(): any[] {
    return this._dates;
  }


  @Input() monitors: any;
  @Input() clientObs: any;
  @Input() schoolObs: any;
  @Input() total: any;
  @Input() discountInfo: any; // Información del descuento aplicado
  @Input() summaryMode = false;
  @Input() isDetail = false;
  @Input() index: number = 1;
  uniqueMonitors: any[] = []; // Monitores únicos

  constructor(
    protected langService: LangService,
    protected utilsService: UtilsService
  ) { }

  ngOnInit() {
    this.extractUniqueMonitors();
  }

  formatDate(date: string) {
    return this.utilsService.formatDate(date);
  }

  hasExtrasForDate(date: any): boolean {
    // Verifica si hay utilizadores para la fecha y si al menos uno tiene extras
    return date.utilizers?.some((utilizer: any) => utilizer.extras && utilizer.extras.length > 0) || false;
  }

  private extractUniqueMonitors() {
    if (this._dates.length) {
      const allMonitors = this._dates.map((date) => date.monitor).filter((monitor) => !!monitor);
      this.uniqueMonitors = allMonitors.filter(
        (monitor, index, self) => self.findIndex((m) => m.id === monitor.id) === index
      );
    } else {
      this.uniqueMonitors = [];
    }
  }

  hasDiscount(): boolean {
    return this.discountInfo && this.discountInfo.hasDiscount;
  }

  getDiscountPercentage(): number {
    return this.discountInfo?.percentage || 0;
  }

  getOriginalPrice(): number {
    return this.discountInfo?.originalPrice || 0;
  }

  getDiscountAmount(): number {
    return this.discountInfo?.discountAmount || 0;
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

  sendEditForm(step: number) {
    this.editActivity.emit(
      {
        step: step
      }
    )
  }

  protected readonly parseFloat = parseFloat;
}
