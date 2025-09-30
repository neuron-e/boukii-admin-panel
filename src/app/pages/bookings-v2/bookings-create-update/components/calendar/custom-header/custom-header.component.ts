import { Component, DoCheck, OnChanges, OnDestroy } from "@angular/core";
import { MatCalendar } from "@angular/material/datepicker";
import { DateAdapter } from "@angular/material/core";
import { CalendarService } from "../../../../../../../service/calendar.service";
import moment from "moment";
import { TranslateService } from "@ngx-translate/core";

@Component({
  selector: "custom-header",
  templateUrl: "./custom-header.component.html",
  styleUrls: ["./custom-header.component.scss"],
})
export class CustomHeader implements OnChanges, DoCheck {
  showPreviousButton: boolean = true;
  currentMonthAndYear: string;
  constructor(
    private calendar: MatCalendar<any>,
    private dateAdapter: DateAdapter<any>,
    private calendarService: CalendarService,
    private translateService: TranslateService
  ) {
    const currentLocale = this.translateService.getDefaultLang();
    moment.locale(this.setLocale(currentLocale));
    this.dateAdapter.setLocale("es-ES");
    this.dateAdapter.getFirstDayOfWeek = () => 1;
    this.updateHeader();
  }

  ngOnChanges() {
    this.updateHeader();
  }

  ngDoCheck() {
    this.updateHeader();
  }

  updateHeader() {
    const currentDate = moment();
    const activeDate = moment(this.calendar.activeDate);

    this.showPreviousButton = activeDate.isAfter(currentDate, "month");

    this.currentMonthAndYear = activeDate.format("MMMM YYYY");
  }

  getFirstDayOfMonth(date: any): Date {
    return this.dateAdapter.createDate(
      this.dateAdapter.getYear(date),
      this.dateAdapter.getMonth(date),
      1
    );
  }

  getLastDayOfMonth(date: any): Date {
    const year = this.dateAdapter.getYear(date);
    const month = this.dateAdapter.getMonth(date);

    // Ajustar el año y el mes si el mes es diciembre
    const nextMonth = month + 1;
    const nextYear = nextMonth > 11 ? year + 1 : year;
    const adjustedMonth = nextMonth > 11 ? 0 : nextMonth;

    // Crear la fecha del primer día del mes siguiente
    const firstDayNextMonth = this.dateAdapter.createDate(nextYear, adjustedMonth, 1);

    // Restar un día para obtener el último día del mes actual
    return this.dateAdapter.addCalendarDays(firstDayNextMonth, -1);
  }

  previousClicked() {
    const newDate = this.dateAdapter.addCalendarMonths(
      this.calendar.activeDate,
      -1
    );
    this.calendar.activeDate = newDate;
    this.calendarService.notifyMonthChanged(newDate);
  }

  nextClicked() {
    const newDate = this.dateAdapter.addCalendarMonths(
      this.calendar.activeDate,
      1
    );
    this.calendar.activeDate = newDate;
    this.calendarService.notifyMonthChanged(newDate);
  }

  setLocale(lang: string) {
    let locale;

    // Establece el locale basado en el idioma
    switch (lang) {
      case "it":
        locale = "it-IT";
        break;
      case "en":
        locale = "en-GB";
        break;
      case "es":
        locale = "es";
        break;
      case "de":
        locale = "de";
        break;
      case "fr":
        locale = "fr";
        break;
      default:
        locale = "en-GB";
    }
    return locale;
  }
}
