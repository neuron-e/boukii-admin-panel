import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { TableColumn } from 'src/@vex/interfaces/table-column.interface';
import { BookingsCreateUpdateV2Component } from './bookings-create-update/bookings-create-update.component';
import moment from 'moment';
import { ApiCrudService } from 'src/service/crud.service';
import { Router } from '@angular/router';
import { MOCK_COUNTRIES } from 'src/app/static-data/countries-data';
import { MOCK_PROVINCES } from 'src/app/static-data/province-data';
import { SchoolService } from 'src/service/school.service';
import { map } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { LayoutService } from 'src/@vex/services/layout.service';
import { buildDiscountInfoList } from 'src/app/pages/bookings-v2/shared/discount-utils';
import { BookingService } from 'src/service/bookings.service';

@Component({
  selector: 'vex-bookings-v2',
  templateUrl: './bookings.component.html',
  styleUrls: ['./bookings.component.scss']
})
export class BookingsV2Component implements OnInit, OnChanges {
  @Input() filterCourseId: number = 0
  showDetail: boolean = false;
  detailData: any;
  detailLoading = false;
  imageAvatar = '../../../assets/img/avatar.png';

  // New properties for flex course handling
  courseInfo: any = null;
  isFlexCourse: boolean = false;

  countries = MOCK_COUNTRIES;
  provinces = MOCK_PROVINCES;
  clients = [];
  monitors = [];
  languages = [];
  sports = [];
  bonus: any = [];
  user: any;
  school: any;
  bookingLog: any = [];
  bookingUsersUnique = [];
  allLevels: any;
  // Prefer stored price_total; fallback to computed/basket when missing
  private resolveDisplayTotal(booking: any): number {
    if (!booking) return 0;
    const originalRaw = booking.price_total;
    if (originalRaw !== null && originalRaw !== undefined && originalRaw !== '') {
      const originalTotal = Number(originalRaw);
      if (!isNaN(originalTotal)) {
        return Math.max(0, originalTotal);
      }
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
    if (!isNaN(computedTotal)) return Math.max(0, computedTotal);
    if (!isNaN(basketTotal)) return Math.max(0, basketTotal);
    return 0;
  }

  createComponent = BookingsCreateUpdateV2Component;
  icon = '../../../assets/img/icons/reservas.svg';
  entity = '/admin/bookings/table';
  deleteEntity = '/bookings';
  detailEntity = '/bookings';
  columns: TableColumn<any>[] = [
    { label: 'Id', property: 'id', type: 'id', visible: true, cssClasses: ['font-medium'] },
    { label: 'type', property: 'sport', type: 'booking_users_image', visible: true },
    { label: 'course', property: 'booking_users', type: 'booking_users', visible: true },
    { label: 'client', property: 'client_main', type: 'client', visible: true },
    { label: 'obs', property: 'has_observations', type: 'warning', visible: true },
    { label: 'dates', property: 'dates', type: 'booking_dates', visible: true },
    { label: 'register', property: 'created_at', type: 'date', visible: true },
    //{ label: 'options', property: 'options', type: 'text', visible: true },
    { label: 'op_rem_abr', property: 'has_cancellation_insurance', type: 'light', visible: true },
    { label: 'B. Care', property: 'has_boukii_care', type: 'light', visible: true },
    { label: 'price', property: 'price_total', type: 'price', visible: true },
    { label: 'method_paiment', property: 'payment_method_id', type: 'payment_method_id', visible: true },
    { label: 'bonus', property: 'bonus', type: 'light', visible: true },
    { label: 'paid', property: 'paid', type: 'payment_status', visible: true },
    { label: 'status', property: 'status', type: 'cancelation_status', visible: true },
    { label: 'Actions', property: 'actions', type: 'button', visible: true }
  ];

  constructor(
    private crudService: ApiCrudService,
    private router: Router,
    private schoolService: SchoolService,
    public LayoutService: LayoutService,
    private bookingService: BookingService
  ) {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));

    this.schoolService.getSchoolData(this.user).subscribe((school) => {
      this.school = school.data;
      if (!JSON.parse(this.school.settings).taxes?.cancellation_insurance_percent) {
        this.columns = this.columns.filter(column => column.property !== 'has_cancellation_insurance');
      }
      if (!JSON.parse(this.school.settings).taxes?.boukii_care_price) {
        this.columns = this.columns.filter(column => column.property !== 'has_boukii_care');

      }
    })
    this.getDegrees();
    this.getSports();
    this.getLanguages();
  }

  getDegrees() {
    const user = JSON.parse(localStorage.getItem("boukiiUser"))
    this.crudService.list('/degrees', 1, 10000, 'asc', 'degree_order',
      '&school_id=' + user.schools[0].id + '&active=1')
      .subscribe((data) => this.allLevels = data.data)
  }


  async showDetailEvent(event: any) {
    if (event.showDetail || (!event.showDetail && this.detailData !== null && this.detailData.id !== event.item.id)) {
      this.bonus = [];
      this.showDetail = true;
      this.detailLoading = true;

      try {
        const res: any = await this.crudService
          .get(`/admin/bookings/${event.item.id}/preview`)
          .toPromise();
        this.detailData = res?.data || event.item;
        const displayTotal = this.resolveDisplayTotal(this.detailData);
        const hasStoredTotal = this.detailData?.price_total !== null
          && this.detailData?.price_total !== undefined
          && this.detailData?.price_total !== '';
        if (!hasStoredTotal) {
          this.detailData.price_total = displayTotal;
        } else if (Number(this.detailData?.price_total) < 0) {
          this.detailData.price_total = Math.max(0, Number(displayTotal));
        }

        // Ordenar los usuarios de la reserva
        this.detailData.bookingusers = this.orderBookingUsers(this.detailData.booking_users || []);

        // Obtener usuarios únicos de la reserva
        this.getUniqueBookingUsers(this.detailData.bookingusers);
        this.enrichPreviewBookingUsers();

        // Cargar niveles por deporte de la escuela (asíncrono)
        await this.getSchoolSportDegrees();

        // Vouchers / bonus
        if (this.detailData?.vouchers_logs?.length > 0) {
          this.detailData.vouchers_logs.forEach((voucherLog: any) => {
            const voucher = voucherLog.voucher;
            voucher.currentPay = parseFloat(voucherLog.amount);
            this.bonus.push(voucher);
          });
        }

        // Extras
        (this.detailData.bookingusers || []).forEach((book: any) => {
          book.courseExtras = [];
          (book.booking_user_extras || []).forEach((extra: any) => {
            book.courseExtras.push(extra);
          });
        });

      } catch (e) {
        // Fallback mínimo si la carga de detalle falla
        this.detailData = event.item;
        const displayTotal = this.resolveDisplayTotal(this.detailData);
        const hasStoredTotal = this.detailData?.price_total !== null
          && this.detailData?.price_total !== undefined
          && this.detailData?.price_total !== '';
        if (!hasStoredTotal) {
          this.detailData.price_total = displayTotal;
        } else if (Number(this.detailData?.price_total) < 0) {
          this.detailData.price_total = Math.max(0, Number(displayTotal));
        }
        this.detailData.bookingusers = this.orderBookingUsers(this.detailData.booking_users || []);
        this.getUniqueBookingUsers(this.detailData.bookingusers);
        this.enrichPreviewBookingUsers();
      }
      this.detailLoading = false;
    } else {
      this.showDetail = event.showDetail;
      if (!this.showDetail) {
        this.detailLoading = false;
      }
    }
  }

  calculateFormattedDuration(hourStart: string, hourEnd: string): string {
    // Parsea las horas de inicio y fin
    let start = moment(hourStart.replace(': 00', ''), "HH:mm");
    let end = moment(hourEnd.replace(': 00', ''), "HH:mm");

    // Calcula la duración
    let duration = moment.duration(end.diff(start));

    // Formatea la duración
    let formattedDuration = "";
    if (duration.hours() > 0) {
      formattedDuration += duration.hours() + "h ";
    }
    if (duration.minutes() > 0) {
      formattedDuration += duration.minutes() + "m";
    }

    return formattedDuration.trim();
  }


  getCountry(id: any) {
    const country = this.countries.find((c) => c.id == +id);
    return country ? country.name : 'NDF';
  }

  getProvince(id: any) {
    const province = this.provinces.find((c) => c.id === +id);
    return province ? province.name : 'NDF';
  }

  calculateAge(birthDateString) {
    if (birthDateString && birthDateString !== null) {
      const today = new Date();
      const birthDate = new Date(birthDateString);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();

      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age;
    } else {
      return 0;
    }

  }

  getLanguage(id: any) {
    const lang = this.languages.find((c) => c.id == +id);
    return lang ? lang.code.toUpperCase() : 'NDF';
  }

  getLanguages() {
    this.crudService.list('/languages', 1, 1000)
      .subscribe((data) => {
        this.languages = data.data.reverse();

      })
  }

  getClient(id: any) {
    if (id && id !== null) {
      return this.clients.find((c) => c.id === id);
    }
  }

  getClientDegree(client: any) {
    if (!client || !client.client_sports || !client.client_sports.length) {
      return 0;
    }
    // MEJORA: Protección contra reservas huérfanas (course null)
    const sportId = this.detailData.bookingusers &&
                   this.detailData.bookingusers[0] &&
                   this.detailData.bookingusers[0].course ?
                   this.detailData.bookingusers[0].course.sport_id : null;
    if (!sportId) {
      return 0;
    }
    const clientSport = client.client_sports.find(cs => cs.sport_id === sportId && cs.school_id == this.user.schools[0].id);
    if (!clientSport || !clientSport.degree_id) {
      return 0;
    }
    return clientSport.degree_id;
  }

  getClientDegreeObject(client: any) {
    if (!client || !client.client_sports || !client.client_sports.length) {
      return 0;
    }

    // MEJORA: Protección contra reservas huérfanas (course null)
    const sportId = this.detailData.bookingusers &&
                   this.detailData.bookingusers[0] &&
                   this.detailData.bookingusers[0].course ?
                   this.detailData.bookingusers[0].course.sport_id : null;

    if (!sportId) {
      return 0;
    }
    const clientSport = client.client_sports.find(cs => cs.sport_id === sportId && cs.school_id == this.user.schools[0].id);
    if (!clientSport || !clientSport.degree_id) {
      return 0;
    }
    return clientSport.degree;
  }

  get isActive(): boolean {
    // Verificar que detailData existe antes de acceder a sus propiedades
    if (!this.detailData || !this.detailData.booking_users || this.detailData.booking_users.length === 0) {
      return false;
    }

    // Encuentra la fecha más futura en booking_users
    const maxDate = this.detailData.booking_users.reduce((latest, user) => {
      const userDate = new Date(user.date); // Asumiendo que cada `user` tiene una propiedad `date`
      return userDate > latest ? userDate : latest;
    }, new Date(0)); // Inicializamos con una fecha muy pasada

    // Compara la fecha más futura con la fecha actual
    return this.detailData.status === 1 &&
      maxDate > new Date();
  }

  isActiveBookingUser(bu: any): boolean {
    // Compara la fecha más futura con la fecha actual
    return bu.status === 1 &&
      new Date(bu.date) > new Date();
  }

  isFinishedBookingUser(bu: any): boolean {
    // Compara la fecha más futura con la fecha actual
    return bu.status === 1 &&
      new Date(bu.date) < new Date();
  }


  encontrarPrimeraClaveConValor(obj: any): string | null {
    if (obj !== null) {
      for (const clave of Object.keys(obj)) {
        if (obj[clave] !== null && clave !== 'intervalo') {
          return obj[clave];
        }
      }
      return null;
    }

  }

  encontrarPrimeraCombinacionConValores(data: any, course: any) {
    if (data !== null) {
      for (const intervalo of data) {
        // Usamos Object.values para obtener los valores del objeto y Object.keys para excluir 'intervalo'
        if (Object.keys(intervalo).some(key => key !== 'intervalo' && intervalo[key] !== null)) {
          return intervalo;
        }
      }
      return null; // Devuelve null si no encuentra ninguna combinación válida
    }

  }


  getHighestAuthorizedDegree(monitor, sport_id: number): any | null {
    // Encuentra los deportes asociados al monitor
    const degrees = monitor.monitor_sports_degrees
      .filter(degree =>
        degree.sport_id === sport_id &&
        degree.school_id === this.user?.schools[0]?.id
      )
      .map(degree => degree.monitor_sport_authorized_degrees)
      .flat(); // Aplanamos el array para obtener todos los grados autorizados

    if (degrees.length === 0) {
      return null; // Si no hay grados autorizados, retornamos null
    }

    // Buscamos el degree autorizado con el degree_order más alto
    const highestDegree = degrees.reduce((prev, current) => {
      return current.degree.degree_order > prev.degree.degree_order ? current : prev;
    });

    return highestDegree;
  }

  get isFinished(): boolean {
    // Verificar que detailData existe antes de acceder a sus propiedades
    if (!this.detailData || !this.detailData.booking_users || this.detailData.booking_users.length === 0) {
      return false;
    }

    // Encuentra la fecha más futura en booking_users
    const maxDate = this.detailData.booking_users.reduce((latest, user) => {
      const userDate = new Date(user.date); // Asumiendo que cada `user` tiene una propiedad `date`
      return userDate > latest ? userDate : latest;
    }, new Date(0)); // Inicializamos con una fecha muy pasada

    // Compara la fecha más futura con la fecha actual
    return this.detailData.status === 1 &&
      maxDate < new Date();
  }


  getSportName(id) {
    return this.sports.find((s) => s.id === id).name
  }

  getClients() {
    this.crudService.list('/clients', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id, '&with[]=clientSports')
      .subscribe((client) => {
        this.clients = client.data;
      })
  }

  getMonitors() {
    this.crudService.list('/monitors', 1, 10000, 'desc',
      'id', '&school_id=' + this.user.schools[0].id, '', null, '',
      ['sports', 'monitorsSchools', 'monitorsSchools', 'monitorSportsDegrees.monitorSportAuthorizedDegrees.degree', 'user'])
      .subscribe((monitor) => {
        this.monitors = monitor.data;
      })
  }


  getSports() {
    this.crudService.list('/sports', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id)
      .subscribe((sport) => {
        this.sports = sport.data;
      })
  }

  async getSchoolSportDegrees(): Promise<void> {
    try {
      const sportResponse = await this.crudService.list('/school-sports', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id).toPromise();
      this.detailData.sports = sportResponse.data;
      const degreeRequests = sportResponse.data.map((sport) =>
        this.crudService.list('/degrees', 1, 10000, 'asc', 'degree_order', `&school_id=${this.user.schools[0].id}&sport_id=${sport.sport_id}&active=1`)
          .pipe(
            map((degreeResponse) => ({
              sport_id: sport.sport_id,
              degrees: degreeResponse.data.map((degree: any) => ({
                ...degree,
                inactive_color: this.lightenColor(degree.color, 30)
              })).reverse()
            }))
          )
      );

      const sportsWithDegrees: any = await forkJoin(degreeRequests).toPromise();
      sportsWithDegrees.forEach((sportWithDegrees, idx) => {
        const sport = this.detailData.sports.find(s => s.sport_id === sportWithDegrees.sport_id);
        if (sport) {
          sport.degrees = sportWithDegrees.degrees;
        }
      });

      // Asignar degrees_sport en función de los bookingusers si es necesario
      if (this.detailData.bookingusers && this.detailData.bookingusers.length) {
        // MEJORA: Protección contra reservas huérfanas (course null)
        const sportId = this.detailData.bookingusers[0].course?.sport_id;
        if (sportId) {
          const matchingSport = this.detailData.sports.find(sport => sport.sport_id === sportId);
          this.detailData.degrees_sport = matchingSport && matchingSport.degrees ? [...matchingSport.degrees].reverse() : [];
        } else {
          this.detailData.degrees_sport = [];
        }
      } else {
        this.detailData.degrees_sport = [];
      }

    } catch (error) {
      console.error("Error fetching sports and degrees:", error);
    }
  }

  private normalizePaymentMethodId(value: any): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value === 'object') {
      if ('payment_method_id' in value && value.payment_method_id !== undefined && value.payment_method_id !== null) {
        value = value.payment_method_id;
      } else if ('id' in value && value.id !== undefined && value.id !== null) {
        value = value.id;
      }
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  getPaymentMethod(id: any) {
    const normalized = this.normalizePaymentMethodId(id);
    switch (normalized) {
      case 1:
        return 'CASH';
      case 2:
        return this.schoolService.getPaymentProvider() === 'payyo' ? 'PAYYO' : 'BOUKII PAY';
      case 3:
        return 'ONLINE';
      case 4:
        return 'AUTRE';
      case 5:
        return 'payment_no_payment';
      case 6:
        return 'bonus';

      default:
        return 'payment_no_payment'
    }
  }

  private lightenColor(hexColor: string, percent: number): string {
    let r: any = parseInt(hexColor.substring(1, 3), 16);
    let g: any = parseInt(hexColor.substring(3, 5), 16);
    let b: any = parseInt(hexColor.substring(5, 7), 16);

    // Increase the lightness
    r = Math.round(r + (255 - r) * percent / 100);
    g = Math.round(g + (255 - g) * percent / 100);
    b = Math.round(b + (255 - b) * percent / 100);

    // Convert RGB back to hex
    r = r.toString(16).padStart(2, '0');
    g = g.toString(16).padStart(2, '0');
    b = b.toString(16).padStart(2, '0');

    return '#' + r + g + b;
  }

  getDegree(degreeId: any) {
    let ret = null;

    if (this.detailData && this.detailData.sports) {
      this.detailData.sports.forEach(sport => {

        if (sport?.degrees) {
          const degree = sport.degrees.find((d) => d.id === degreeId);

          if (degree) {
            ret = degree;
          }
        }

      });
    }

    return ret;
  }

  getMonitor(id: number) {
    if (id && id !== null) {

      const monitor = this.monitors.find((m) => m.id === id);

      return monitor;
    }
  }

  goTo(route: string) {
    this.router.navigate([route]);
  }

  getTVA() {
    return parseFloat(this.school.bookings_comission_cash) > 0;
  }

  getTVAValue() {
    return parseFloat(this.school.bookings_comission_cash);
  }

  existExtras() {
    let ret = false;

    // Verificar que detailData y bookingusers existen
    if (!this.detailData || !this.detailData.bookingusers) {
      return false;
    }

    this.detailData.bookingusers.forEach(element => {
      if (element.courseExtras && element.courseExtras.length > 0 && !ret) {
        ret = true;
      }
    });

    return ret;
  }

  getExtrasPrice() {
    let ret = 0;

    // Verificar que detailData y bookingusers existen
    if (!this.detailData || !this.detailData.bookingusers) {
      return 0;
    }

    this.detailData.bookingusers.forEach(element => {
      if (element.courseExtras && element.courseExtras.length > 0) {
        element.courseExtras.forEach(ce => {
          ret = ret + parseFloat(ce.course_extra.price);
        });
      }
    });

    return ret;
  }

  getBonusPrice() {
    let ret = 0;
    this.bonus.forEach(element => {
      ret = ret + element.currentPay;
    });
    return ret;
  }

  getUniqueBookingUsers(data: any) {
    const uniqueEntriesMap = new Map();

    data.forEach((item: any) => {
      let groupKey = item.group_id ?? item.course_group_id ?? item.course_subgroup_id ?? null;
      if (groupKey == null && item?.course?.course_type === 2) {
        const bookingKey = item.booking_id ?? item.id ?? 'booking';
        const monitorKey = item.monitor_id ?? 'no-monitor';
        groupKey = `${bookingKey}-${item.course_id}-${item.hour_start}-${item.hour_end}-${monitorKey}`;
      }
      if (groupKey == null) {
        groupKey = item.client_id ?? item.course_id ?? 'unknown';
      }
      const key = `${groupKey}-${item.course_id}`;

      if (!uniqueEntriesMap.has(key)) {
        uniqueEntriesMap.set(key, {
          ...item,
          bookingusers: [] // Crea un array de bookingusers para almacenar cada fecha
        });
      }

      // Agrega la fecha actual al array de bookingusers
      uniqueEntriesMap.get(key).bookingusers.push(item);
    });

    // Convertir el Map en un array de objetos únicos con fechas agrupadas
    this.bookingUsersUnique = Array.from(uniqueEntriesMap.values());
  }

  private parseNumber(value: any): number {
    const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? '0'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  getPreviewParticipants(group: any): any[] {
    const users = Array.isArray(group?.bookingusers) ? group.bookingusers : [];
    const unique = new Map<number, any>();

    users.forEach((user: any) => {
      const client = user?.client;
      if (client?.id == null) {
        return;
      }
      if (!unique.has(client.id)) {
        unique.set(client.id, client);
      }
    });

    return Array.from(unique.values());
  }

  hasPreviewParticipantNotes(group: any, clientId: number): boolean {
    const users = Array.isArray(group?.bookingusers) ? group.bookingusers : [];
    return users.some((user: any) =>
      user?.client_id === clientId && (user?.notes || user?.notes_school)
    );
  }

  private toMinutes(timeValue: string | null | undefined): number | null {
    if (!timeValue) {
      return null;
    }
    const parts = timeValue.split(':').map((piece: string) => parseInt(piece, 10));
    if (parts.length < 2 || parts.some((value) => Number.isNaN(value))) {
      return null;
    }
    return parts[0] * 60 + parts[1];
  }

  private getDurationMinutes(start?: string, end?: string): number | null {
    const startMinutes = this.toMinutes(start);
    const endMinutes = this.toMinutes(end);
    if (startMinutes === null || endMinutes === null || endMinutes < startMinutes) {
      return null;
    }
    return endMinutes - startMinutes;
  }

  private buildPreviewDatesForGroup(group: any): any[] {
    const users = Array.isArray(group?.bookingusers) ? group.bookingusers : [];
    const datesMap = new Map<string, any>();

    users.forEach((user: any) => {
      const dateKey = `${user?.course_date_id ?? 'no-date'}-${user?.hour_start ?? ''}-${user?.hour_end ?? ''}`;
      if (!datesMap.has(dateKey)) {
        datesMap.set(dateKey, {
          price: 0,
          originalPrice: 0,
          date: user?.date ?? null,
          hour_start: user?.hour_start ?? null,
          hour_end: user?.hour_end ?? null,
          interval_id: user?.course_date?.interval_id ?? user?.course_interval_id ?? user?.interval_id ?? null,
          interval_name: user?.course_date?.interval_name ?? user?.interval_name ?? null,
          currency: user?.currency ?? group?.currency ?? this.detailData?.currency ?? '',
          durationMinutes: this.getDurationMinutes(user?.hour_start, user?.hour_end) ?? undefined,
          booking_users: [],
          utilizers: [],
          extras: []
        });
      }

      const entry = datesMap.get(dateKey);
      entry.booking_users.push(user);

      if (user?.client && !entry.utilizers.some((utilizer: any) => utilizer?.id === user.client_id)) {
        entry.utilizers.push(user.client);
      }

      if (Array.isArray(user?.booking_user_extras)) {
        user.booking_user_extras.forEach((extra: any) => {
          const extraItem = extra?.course_extra ?? extra?.courseExtra;
          if (extraItem) {
            entry.extras.push(extraItem);
          }
        });
      }
    });

    return Array.from(datesMap.values());
  }

  private enrichPreviewBookingUsers(): void {
    if (!Array.isArray(this.bookingUsersUnique)) {
      return;
    }

    this.bookingUsersUnique = this.bookingUsersUnique.map((group: any) => {
      if (!group?.course) {
        return group;
      }

      const dates = this.buildPreviewDatesForGroup(group).map((date: any) => {
        const price = this.bookingService.calculateDatePrice(group.course, date, true);
        return {
          ...date,
          price,
          originalPrice: price
        };
      });
      const previewDates = dates
        .slice()
        .sort((a: any, b: any) => {
          const dateCompare = new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime();
          if (dateCompare !== 0) {
            return dateCompare;
          }
          return String(a.hour_start ?? '').localeCompare(String(b.hour_start ?? ''));
        });
      const discountInfo = buildDiscountInfoList(group.course, dates);
      const discountAmount = discountInfo.reduce((sum: number, info: any) => {
        const amount = this.parseNumber(info?.amountSaved ?? 0);
        return sum + amount;
      }, 0);
      const baseTotal = dates.reduce((sum: number, date: any) => sum + this.parseNumber(date.price), 0);
      const totalAfterDiscount = Math.max(0, baseTotal - discountAmount);

      return {
        ...group,
        discountInfo,
        discountAmount,
        baseTotal,
        totalAfterDiscount,
        previewDates
      };
    });
  }

  isFreeBooking(): boolean {
    return this.resolveDisplayTotal(this.detailData) <= 0.01;
  }

  isCancelledBooking(): boolean {
    return this.detailData?.status === 2;
  }

  getPreviewDisplayTotal(): number {
    if (this.isCancelledBooking()) {
      return 0;
    }
    return this.resolveDisplayTotal(this.detailData);
  }

  getPreviewOriginalTotal(): number {
    if (this.isFreeBooking()) {
      return 0;
    }
    const original = this.parseNumber(this.detailData?.original_price);
    if (original > 0) {
      return Math.max(0, original);
    }
    const stored = this.resolveDisplayTotal(this.detailData);
    if (stored > 0) {
      return stored;
    }
    const reduction = Math.abs(this.parseNumber(this.detailData?.price_reduction));
    return reduction > 0 ? reduction : 0;
  }

  getPreviewPaidLabel(): string {
    if (this.isCancelledBooking()) {
      return 'cancelled';
    }
    if (this.isFreeBooking()) {
      return 'booking_free_short';
    }
    return this.detailData?.paid ? 'yes' : 'no';
  }

  getPreviewPaymentMethodLabel(): string {
    if (this.isFreeBooking()) {
      return 'booking_free';
    }
    return this.getPaymentMethod(this.detailData?.payment_method_id ?? this.detailData?.payment_method);
  }

  /*  getUniqueBookingUsers(data: any) {
      const uniqueGroups = new Map<string, any>();
  
      data.forEach(item => {
        // Crear una clave única por fecha y monitor
        const key = `${item.date}-${item.monitor_id}`;
  
        if (uniqueGroups.has(key)) {
          const existingItem = uniqueGroups.get(key);
          // Si el precio actual es mayor que el del existente, reemplázalo
          if (item.price > existingItem.price) {
            uniqueGroups.set(key, item);
          }
        } else {
          // Si no existe el grupo, lo añadimos al Map
          uniqueGroups.set(key, item);
        }
      });
  
      // Convertimos el Map en un array de los valores
      this.bookingUsersUnique = Array.from(uniqueGroups.values());
    }*/

  /*  getUniqueBookingUsers(data: any) {
      const uniqueGroups = new Map<string, any>();
  
      data.forEach(item => {
        // Crear una clave única para cada combinación de client_id, date y monitor_id
        const key = `${item.client_id}-${item.date}-${item.monitor_id}`;
  
        // Si el grupo ya existe, comparamos los precios y nos quedamos con el más alto
        if (uniqueGroups.has(key)) {
          const existingItem = uniqueGroups.get(key);
          if (item.price > existingItem.price) {
            uniqueGroups.set(key, item);
          }
        } else {
          // Si el grupo no existe, lo añadimos
          uniqueGroups.set(key, item);
        }
      });
  
      // Convertimos el map en un array de los valores
      this.bookingUsersUnique = Array.from(uniqueGroups.values());
    }*/

  orderBookingUsers(users: any[]) {
    return users.sort((a, b) => {
      // Ordenar por fecha
      const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateComparison !== 0) {
        return dateComparison;
      }

      // Si la fecha es la misma, ordenar por hora de inicio
      return a.hour_start.localeCompare(b.hour_start);
    });
  }

  getBookingsLogs(id: any) {
    this.crudService.list('/booking-logs', 1, 10000, 'desc', 'id', '&booking_id=' + id)
      .subscribe((data) => {
        this.bookingLog = data.data;
      })
  }

  protected readonly parseFloat = parseFloat;

  ngOnInit(): void {
    this.checkIfFlexCourse();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filterCourseId'] && changes['filterCourseId'].currentValue) {
      this.checkIfFlexCourse();
    }
  }

  private checkIfFlexCourse(): void {
    if (this.filterCourseId && this.filterCourseId > 0) {
      // Get course information to check if it's a collective flex course (including FIX courses)
      this.crudService.get('/admin/courses/' + this.filterCourseId).subscribe((course: any) => {
        this.courseInfo = course.data;
        const isFIXCourse = course.data?.name?.toUpperCase().includes('FIX');
        const isFlexibleCourse = course.data?.is_flexible || isFIXCourse;
        this.isFlexCourse = course.data?.type === 1 && isFlexibleCourse;
      });
    } else {
      this.isFlexCourse = false;
      this.courseInfo = null;
    }
  }

  onDataLoaded(data: any[]): void {
    if (Array.isArray(data)) {
      data.forEach(booking => {
        const displayTotal = this.resolveDisplayTotal(booking);
        const hasStoredTotal = booking?.price_total !== null
          && booking?.price_total !== undefined
          && booking?.price_total !== '';
        const normalizedTotal = Math.max(0, Number(displayTotal));
        if (!hasStoredTotal) {
          booking.price_total = normalizedTotal;
        } else if (Number(booking.price_total) < 0) {
          booking.price_total = normalizedTotal;
        }
      });
    }

    if (this.isFlexCourse && data.length > 0) {

      // For flex courses, group bookings by booking_id to get unique reservations
      const uniqueBookings = new Map();

      data.forEach(booking => {
        const bookingId = booking.id;
        if (!uniqueBookings.has(bookingId)) {
          uniqueBookings.set(bookingId, {
            ...booking,
            dateCount: 1 // Count of dates for this booking
          });
        } else {
          // If we already have this booking, increment the date count
          const existing = uniqueBookings.get(bookingId);
          existing.dateCount += 1;
          uniqueBookings.set(bookingId, existing);
        }
      });

      const uniqueBookingsList = Array.from(uniqueBookings.values());
    }
  }
}
