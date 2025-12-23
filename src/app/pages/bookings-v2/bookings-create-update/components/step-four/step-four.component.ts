import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  OnDestroy,
} from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import {
  MatCalendar,
  MatCalendarCellCssClasses,
} from "@angular/material/datepicker";
import { MatDialog } from "@angular/material/dialog";
import { TranslateService } from "@ngx-translate/core";
import moment from "moment";
import { ApiCrudService } from "src/service/crud.service";
import { CustomHeader } from "../calendar/custom-header/custom-header.component";
import { CalendarService } from "../../../../../../service/calendar.service";
import {UtilsService} from '../../../../../../service/utils.service';
import { PerformanceCacheService } from 'src/app/services/performance-cache.service';
import { VisualFeedbackService } from 'src/app/services/visual-feedback.service';
import { AnalyticsService } from 'src/app/services/analytics.service';
import { ConfirmModalComponent } from "src/app/pages/monitors/monitor-detail/confirm-dialog/confirm-dialog.component";
import { Observable, Subject, of, firstValueFrom } from 'rxjs';
import { map, shareReplay, debounceTime, distinctUntilChanged, switchMap, takeUntil, catchError } from 'rxjs/operators';

@Component({
  selector: "booking-step-four",
  templateUrl: "./step-four.component.html",
  styleUrls: ["./step-four.component.scss"],
})
export class StepFourComponent implements OnDestroy {
  @Input() initialData: any;
  @Input() client: any;
  @Input() utilizers: any;
  @Input() activitiesBooked: any;
  @Input() sportLevel: any;
  @Input() selectedForm: any;
  @Output() stepCompleted = new EventEmitter<FormGroup>();
  @Output() prevStep = new EventEmitter();
  @ViewChild("secondCalendar") secondCalendar: MatCalendar<Date>;

  stepForm: FormGroup;
  selectedDate;
  nextMonthDate: Date;
  selectedSubGroup: any;
  selectedCourse;
  courseTypeId: number = 1;
  selectedIndex: number = 1;
  user;
  courses = [];
  minDate;
  coursesDate = [];
  cursesInSelectedDate = [];
  isLoading = true;
  selectedDateMoment;
  showTwoMonths: boolean = true;
  selectedSubGroups = []; // Array para almacenar los subgrupos filtrados
  capacityCheckInterval: any; // Para polling de capacidad en tiempo real
  isCapacityLoading = false; // Para mostrar loading mientras se verifica
  coursesDateByInterval: Map<string, string[]> = new Map(); // Mapa de fechas por intervalo {intervalId: [dates]}

  private availabilityCache = new Map<string, { timestamp: number; courses: any[] }>();
  private availabilityRequests = new Map<string, Observable<any[]>>();
  private readonly availabilityTtlMs = 60 * 1000; // 1 minuto
  private checkAvailabilityCache = new Map<string, Promise<boolean>>();
  private destroy$ = new Subject<void>();
  private availabilityPreviewTrigger$ = new Subject<AvailabilityPreviewParams | null>();
  previewAvailability: AvailabilityPreviewResponse | null = null;
  previewLoading = false;
  previewError = false;


  tabs = [
    { label: "course_colective", courseTypeId: 1, class: "yellow" },
    { label: "course_private", courseTypeId: 2, class: "green" }
  ];

  constructor(
    private fb: FormBuilder,
    private crudService: ApiCrudService,
    private calendarService: CalendarService,
    protected utilsService: UtilsService,
    private performanceCache: PerformanceCacheService,
    private feedback: VisualFeedbackService,
    private analytics: AnalyticsService,
    private dialog: MatDialog,
    private translateService: TranslateService
  ) {


  }

  ngOnInit(): void {
    // MEJORA CRÍTICA: Track inicio del paso de selección de curso
    this.analytics.trackEvent({
      category: 'booking',
      action: 'step_four_initialized',
      label: 'course_selection_step',
      metadata: {
        sport_level: this.sportLevel?.name,
        has_initial_course: !!this.initialData?.selectedCourse,
        has_initial_date: !!this.initialData?.selectedDate
      }
    });

    this.selectedCourse = this.initialData?.selectedCourse;
    this.selectedDate = this.initialData?.selectedDate || this.minDate;
    this.minDate = new Date();
    this.selectedDateMoment = this.selectedDate
      ? moment(this.selectedDate)
      : moment(this.minDate);
    this.updateNextMonth();
    if(!this.initialData?.selectedDate) {
      this.autoSelectFirstDayIfCurrentMonth();
    }
    this.updateTabs();
    this.user = JSON.parse(localStorage.getItem("boukiiUser"));
    this.stepForm = this.fb.group({
      date: [this.selectedDate || this.minDate, Validators.required],
      course: [this.selectedCourse, Validators.required],
      selectedSubGroup: [null], // Campo para el subgrupo seleccionado
    });

    // MEJORA CRÍTICA: Preload de datos relacionados para mejor performance
    this.setupAvailabilityPreviewStream();
    this.preloadRelatedData();

    this.getCourses(this.sportLevel);
    this.calendarService.monthChanged$.subscribe((newDate: Date) => {
      this.selectedDate = newDate;
      this.updateNextMonth();
      this.autoSelectFirstDayIfCurrentMonth();
      this.getCourses(this.sportLevel);
      this.queueAvailabilityPreview(newDate);
    });
  }

  /**
   * MEJORA CRÍTICA: Preload inteligente de datos relacionados
   */
  private preloadRelatedData(): void {
    // Preload datos que probablemente se necesitarán
    const relatedEndpoints = [
      '/admin/degrees',
      '/admin/sports',
      '/admin/monitors'
    ];

    this.performanceCache.preloadRelatedData('/admin/courses', relatedEndpoints);
    this.queueAvailabilityPreview();
  }


  private setupAvailabilityPreviewStream(): void {
    this.availabilityPreviewTrigger$
      .pipe(
        debounceTime(350),
        distinctUntilChanged((prev, curr) => this.arePreviewParamsEqual(prev, curr)),
        switchMap(params => {
          if (!params) {
            this.previewLoading = false;
            return of<AvailabilityPreviewStreamResult>({ status: 'skip' });
          }

          this.previewLoading = true;
          this.previewError = false;

          return this.performanceCache
            .get<AvailabilityPreviewResponse>('/admin/courses/check-availability', params)
            .pipe(
              map(data => ({ status: 'success', data } as AvailabilityPreviewStreamResult)),
              catchError(error => {
                console.warn('Failed to preload availability preview', error);
                return of<AvailabilityPreviewStreamResult>({ status: 'error' });
              })
            );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(result => {
        switch (result.status) {
          case 'skip':
            if (!this.shouldPreloadCollectiveAvailability()) {
              this.previewAvailability = null;
              this.previewError = false;
            }
            this.previewLoading = false;
            break;
          case 'success':
            this.previewLoading = false;
            if (result.data) {
              this.previewAvailability = {
                ...result.data,
                courses: Array.isArray(result.data.courses) ? result.data.courses : []
              };
              this.previewError = false;
            } else {
              this.previewAvailability = null;
              this.previewError = true;
            }
            break;
          case 'error':
          default:
            this.previewLoading = false;
            this.previewAvailability = null;
            this.previewError = true;
            break;
        }
      });
  }

  private queueAvailabilityPreview(anchorDate?: Date): void {
    if (!this.shouldPreloadCollectiveAvailability()) {
      this.previewAvailability = null;
      this.previewError = false;
      this.previewLoading = false;
      this.availabilityPreviewTrigger$.next(null);
      return;
    }

    const { date_from, date_to } = this.buildPreviewRange(anchorDate || this.selectedDate || new Date());
    this.availabilityPreviewTrigger$.next({
      sport_id: this.sportLevel.sport_id,
      degree_id: this.sportLevel.id,
      course_type: 1,
      date_from,
      date_to
    });
  }

  private buildPreviewRange(anchor: Date): { date_from: string; date_to: string } {
    const start = new Date(anchor);
    const end = new Date(anchor);
    end.setDate(end.getDate() + 7);
    return {
      date_from: this.formatDateForApi(start),
      date_to: this.formatDateForApi(end)
    };
  }

  private formatDateForApi(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private shouldPreloadCollectiveAvailability(): boolean {
    return !!this.sportLevel && this.courseTypeId === 1;
  }

  private arePreviewParamsEqual(
    a: AvailabilityPreviewParams | null,
    b: AvailabilityPreviewParams | null
  ): boolean {
    if (a === b) {
      return true;
    }

    if (!a || !b) {
      return false;
    }

    return (
      a.sport_id === b.sport_id &&
      (a.degree_id ?? null) === (b.degree_id ?? null) &&
      a.date_from === b.date_from &&
      a.date_to === b.date_to
    );
  }

  handleCourseSelection(course: any): void {

    // Resetear selección de subgrupo cuando cambia el curso
    this.selectedSubGroup = null;
    this.stepForm.get('selectedSubGroup')?.setValue(null);
    this.stepForm.get('selectedSubGroup')?.markAsUntouched();

    if (course.course_type === 1) {
      // Validación de capacidad para cursos colectivos
      this.validateSubgroupCapacity(course);
    } else {
      this.selectedSubGroups = [];
      this.clearCapacityPolling();
    }

    // Guardar el curso seleccionado
    this.selectedCourse = course;
    this.stepForm.get('course').setValue(course);
  }

  /**
   * MEJORA CRÍTICA: Validación avanzada de capacidad con feedback visual mejorado
   */
  private validateSubgroupCapacity(course: any): void {
    this.isCapacityLoading = true;

    // 1. Obtener TODOS los grupos del curso (no filtrar por nivel)
    const allGroups = course.course_dates[0].course_groups || [];

    if (allGroups.length === 0) {
      this.selectedSubGroups = [];
      this.isCapacityLoading = false;
      return;
    }

    // 2. Obtener todos los subgrupos de todos los grupos
    const neededSlots = this.utilizers?.length ?? 1;
    const allSubgroups = [];

    allGroups.forEach(group => {
      if (group.course_subgroups && group.course_subgroups.length > 0) {
        group.course_subgroups.forEach(subgroup => {
          const currentBookings = subgroup.booking_users?.length ?? 0;
          const maxParticipants = subgroup.max_participants ?? 999;
          const availableSlots = Math.max(0, maxParticipants - currentBookings);
          const hasCapacity = availableSlots >= neededSlots;

          allSubgroups.push({
            ...subgroup,
            // Añadir información completa del grupo/nivel al que pertenece
            group_info: {
              degree_id: group.degree_id,
              degree: group.degree || null,
              name: group.degree?.name || group.name || '',
              annotation: group.degree?.annotation || '',
              color: group.degree?.color || this.sportLevel?.color || '#ccc',
              league: group.degree?.league || ''
            },
            capacity_info: {
              current_bookings: currentBookings,
              max_participants: maxParticipants,
              available_slots: availableSlots,
              needed_slots: neededSlots,
              has_capacity: hasCapacity,
              is_unlimited: maxParticipants === 0 || maxParticipants > 100,
              capacity_percentage: maxParticipants > 0 ? (currentBookings / maxParticipants) * 100 : 0
            }
          });
        });
      }
    });

    this.selectedSubGroups = allSubgroups;
    this.isCapacityLoading = false;

    // Autoseleccionar el grupo que coincide con el nivel seleccionado
    this.autoSelectMatchingSubgroup(allSubgroups);

    // Comentado temporalmente - puede causar destellos
    // this.startCapacityPolling(course);
  }

  /**
   * Autoseleccionar el subgrupo que coincide con el nivel del usuario
   */
  private autoSelectMatchingSubgroup(subgroups: any[]): void {
    if (!this.sportLevel || subgroups.length === 0) {
      return;
    }

    // Buscar el primer subgrupo que coincida con el nivel seleccionado y tenga capacidad
    const matchingSubgroup = subgroups.find(sg =>
      sg.group_info?.degree_id === this.sportLevel.id &&
      sg.capacity_info?.has_capacity
    );

    if (matchingSubgroup) {

      // Autoseleccionar el subgrupo
      this.stepForm.get('selectedSubGroup')?.setValue(matchingSubgroup);
      this.selectedSubGroup = matchingSubgroup;
    } else {
      // Si no hay coincidencia, intentar seleccionar el primero con capacidad
      const firstAvailable = subgroups.find(sg => sg.capacity_info?.has_capacity);
      if (firstAvailable) {
        this.stepForm.get('selectedSubGroup')?.setValue(firstAvailable);
        this.selectedSubGroup = firstAvailable;
      }
    }
  }

  private suggestAlternatives(courseName: string): void {
    this.feedback.info(`Buscando cursos similares a "${courseName}"...`, {
      duration: 3000
    });
    // Aquí se implementaría la lógica para sugerir cursos alternativos
  }

  private suggestGroupAdjustment(availableSlots: number): void {
    this.feedback.info(`Considera reducir a ${availableSlots} participante${availableSlots > 1 ? 's' : ''} para esta reserva`, {
      duration: 4000,
      action: 'Ajustar automáticamente',
      onAction: () => {
        // Aquí se implementaría la lógica para ajustar automáticamente el número de participantes
        this.feedback.success(`Grupo ajustado a ${availableSlots} participante${availableSlots > 1 ? 's' : ''}`);
      }
    });
  }

  /**
   * MEJORA CRÍTICA: Polling de capacidad en tiempo real
   */
  private startCapacityPolling(course: any): void {
    this.clearCapacityPolling();

    this.capacityCheckInterval = setInterval(() => {
      this.refreshSubgroupCapacity(course);
    }, 10000); // Verificar cada 10 segundos
  }

  private clearCapacityPolling(): void {
    if (this.capacityCheckInterval) {
      clearInterval(this.capacityCheckInterval);
      this.capacityCheckInterval = null;
    }
  }

  /**
   * MEJORA CRÍTICA: Refresco de capacidad desde el backend con cache optimizado
   */
  private refreshSubgroupCapacity(course: any): void {
    if (!course || !this.selectedSubGroups.length) return;

    const subgroupIds = this.selectedSubGroups.map(sg => sg.id);
    const requestData = {
      subgroup_ids: subgroupIds,
      needed_participants: this.utilizers?.length ?? 1
    };

    // Usar cache optimizado para reducir requests al servidor
    this.performanceCache.post<any[]>('/admin/courses/check-capacity', requestData, [
      'course_capacity',
      'booking_users'
    ]).subscribe({
      next: (data: any[]) => this.updateSubgroupCapacity(data || []),
      error: (error) => {
        console.warn('Error al verificar capacidad:', error);
      }
    });
  }

  private updateSubgroupCapacity(capacityData: any): void {
    this.selectedSubGroups = this.selectedSubGroups.map(subgroup => {
      const updated = capacityData.find(data => data.id === subgroup.id);
      if (updated) {
        const availableSlots = Math.max(0, updated.max_participants - updated.current_bookings);
        const neededSlots = this.utilizers?.length ?? 1;

        subgroup.capacity_info = {
          ...subgroup.capacity_info,
          current_bookings: updated.current_bookings,
          available_slots: availableSlots,
          has_capacity: availableSlots >= neededSlots,
          capacity_percentage: updated.max_participants > 0 ?
            (updated.current_bookings / updated.max_participants) * 100 : 0
        };
      }
      return subgroup;
    });
  }

  ngOnDestroy(): void {
    this.clearCapacityPolling();
    this.destroy$.next();
    this.destroy$.complete();
    this.availabilityPreviewTrigger$.complete();
  }

  onSubgroupChange(event: any): void {

    // Forzar actualización del formulario
    this.stepForm.updateValueAndValidity();
  }

  updateTabs(): void {
    // Si utilizers tiene más de 1 usuario, eliminamos el tab "course_colective"
    if ((this.utilizers && this.utilizers.length > 1) || this.initialData?.onlyPrivate) {
      this.tabs = [
        { label: "course_private", courseTypeId: 2, class: "green" },
       /* { label: "activity", courseTypeId: 3, class: "blue" }*/
      ];
      this.courseTypeId = 2;
      this.selectedIndex = this.courseTypeId - 2;
    } else {
      // Si solo hay 1 user, mostramos las 3 tabs
      this.tabs = [
        { label: "course_colective", courseTypeId: 1, class: "yellow" },
        { label: "course_private", courseTypeId: 2, class: "green" }
      ];
      this.selectedIndex = this.courseTypeId - 1;
    }
  }

  isFormValid() {

    // Validación básica del formulario
    if (!this.stepForm.valid) {
      return false;
    }

    // Para cursos colectivos, verificar que haya un subgrupo seleccionado
    if (this.selectedCourse?.course_type === 1) {
      const subgroupValue = this.stepForm.get('selectedSubGroup')?.value;
      const hasSubgroup = !!subgroupValue;

      if (!hasSubgroup) {
        return false;
      }
      return true;
    }
    return true;
  }

  /**
   * MEJORA CRÍTICA: Feedback específico para errores de validación
   */
  private provideFormValidationFeedback(): void {
    const errors = [];

    if (this.stepForm.get('date')?.invalid) {
      errors.push('Selecciona una fecha válida');
    }

    if (this.stepForm.get('course')?.invalid) {
      errors.push('Selecciona un curso');
    }

    // Para cursos colectivos, verificar subgrupo
    if (this.selectedCourse?.course_type === 1 && !this.stepForm.get('selectedSubGroup')?.value) {
      errors.push('Selecciona un grupo disponible');
    }

    if (errors.length > 0) {
      this.feedback.warning(`Completa los campos requeridos: ${errors.join(', ')}`, {
        duration: 5000,
        action: 'Entendido'
      });
    }
  }

  handlePrevStep() {
    // MEJORA CRÍTICA: Feedback suave para navegación
    this.feedback.setLoading('navigation', true, 'Volviendo al paso anterior...');

    setTimeout(() => {
      this.feedback.setLoading('navigation', false);
      this.prevStep.emit();
    }, 300);
  }

  completeStep() {
    if (this.isFormValid()) {
      // MEJORA CRÍTICA: Track completación exitosa del paso
      this.analytics.trackEvent({
        category: 'booking',
        action: 'step_four_completed',
        label: 'course_date_confirmed',
        metadata: {
          course_id: this.selectedCourse?.id,
          course_name: this.selectedCourse?.name,
          course_type: this.selectedCourse?.course_type,
          selected_date: moment(this.selectedDate).format('YYYY-MM-DD'),
          sport_level: this.sportLevel?.name,
          has_subgroup: !!this.stepForm.get('selectedSubGroup')?.value,
          subgroup_id: this.stepForm.get('selectedSubGroup')?.value?.id || null
        }
      });

      // MEJORA CRÍTICA: Feedback de éxito con información contextual
      const courseName = this.selectedCourse?.name || 'curso seleccionado';
      const dateFormatted = moment(this.selectedDate).format('DD/MM/YYYY');

      this.feedback.success(`✅ ${courseName} seleccionado para el ${dateFormatted}`, {
        duration: 2000
      });

      // Pequeña pausa para mostrar el feedback antes de continuar
      setTimeout(() => {
        this.stepCompleted.emit(this.stepForm);
      }, 500);
    } else {
      // Mostrar feedback solo cuando el usuario intenta avanzar
      this.provideFormValidationFeedback();
    }
  }

  autoSelectFirstDayIfCurrentMonth() {
    const currentMonth = moment();
    const selectedMonth = moment(this.selectedDate);

    if (selectedMonth.isSame(currentMonth, "month")) {
      this.selectedDate = new Date();
      this.selectedDateMoment = moment(this.selectedDate );
    }
  }

  updateNextMonth() {
    // Calculamos la fecha del último día del próximo mes
    this.nextMonthDate = moment(this.selectedDate)
      .add(1, "month")
      .endOf("month")
      .toDate();

    if (this.secondCalendar) {
      this.secondCalendar.activeDate = this.nextMonthDate;
    }
  }

  filterCoursesCollective() {
    const degreeId = this.sportLevel?.id;
    const neededSlots = (this.utilizers?.length ?? 1);
    const allowPastDates = this.isSelectedDateInPast();

    const hasCapacityForLevel = (dateInfo: any): boolean => {
      const groups = Array.isArray(dateInfo?.course_groups) ? dateInfo.course_groups : [];
      const matching = groups.find((g: any) => g?.degree_id === degreeId);
      if (!matching) return false;

      const subgroups = Array.isArray(matching?.course_subgroups) ? matching.course_subgroups : [];
      return subgroups.some((sg: any) => {
        const current = Array.isArray(sg?.booking_users) ? sg.booking_users.length : 0;
        const max = Number(sg?.max_participants ?? 0);
        if (!max || Number.isNaN(max)) {
          // Si max no está definido o es 0, tratamos como capacidad ilimitada
          return true;
        }
        return current + neededSlots <= max;
      });
    };

    this.courses = this.courses
      .map(course => {
        const dates = Array.isArray(course?.course_dates) ? course.course_dates : [];

        // Filtrar fechas por capacidad del nivel Y fechas futuras
        const filteredDates = dates.filter((d: any) => {
          // Verificar capacidad para el nivel
          if (!hasCapacityForLevel(d)) return false;

          // Para cursos no flexibles (FIX), filtrar fechas pasadas individualmente
          if (!course.is_flexible) {
            const courseDateMoment = moment(d.date, "YYYY-MM-DD");
            return courseDateMoment.isSameOrAfter(moment(), "day");
          }

          // Para cursos flexibles, mantener todas las fechas con capacidad
          return true;
        });

        return {
          ...course,
          course_dates: filteredDates
        };
      })
      .filter(course => {
        // Excluir cursos sin fechas con capacidad disponibles
        return Array.isArray(course.course_dates) && course.course_dates.length > 0;
      });
  }

  async handleDateChange(event: any) {
    const previousDate = this.selectedDate;
    const canProceed = await this.confirmPastDateIfNeeded(event);
    if (!canProceed) {
      const fallback = previousDate || this.minDate || new Date();
      this.selectedDate = fallback;
      this.selectedDateMoment = moment(this.selectedDate);
      this.stepForm.get("date").patchValue(this.selectedDateMoment, { emitEvent: false });
      return;
    }
    // MEJORA CRÍTICA: Track cambio de fecha en calendario
    this.analytics.trackEvent({
      category: 'booking',
      action: 'date_changed',
      label: 'calendar_selection',
      metadata: {
        selected_date: moment(event).format('YYYY-MM-DD'),
        sport_level: this.sportLevel?.name,
        previous_date: this.selectedDate ? moment(this.selectedDate).format('YYYY-MM-DD') : null
      }
    });

    this.selectedDate = event;
    this.selectedDateMoment = moment(event);
    this.stepForm.get("date").patchValue(this.selectedDateMoment);
    this.selectedCourse = null;
    this.stepForm.get('course').setValue(null);
    this.cursesInSelectedDate = this.courses.filter(course =>
      course.course_dates.some(d => {
        const courseDateMoment = moment(d.date, "YYYY-MM-DD");
        const currentTime = moment(); // Definir la hora actual aquí

        if (courseDateMoment.isSame(moment(), "day")) {
          if(course.course_type == 1) {
            const hourStart = moment(d.hour_start, "HH:mm");
            return this.selectedDateMoment.isSame(courseDateMoment, 'day') && currentTime.isBefore(hourStart);
          } else {
            const hourEnd = moment(d.hour_end, "HH:mm");
            return this.selectedDateMoment.isSame(courseDateMoment, 'day') && currentTime.isBefore(hourEnd);
          }
        } else {
          return this.selectedDateMoment.isSame(courseDateMoment, 'day');
        }
      })
    );
    if (this.isSelectedDateInPast()) {
      this.getCourses(this.sportLevel);
    }
    this.queueAvailabilityPreview(event);
  }

  compareCourseDates() {
    let ret = [];
    const currentTime = moment(); // Hora actual
    this.coursesDateByInterval.clear(); // Limpiar el mapa de intervalos

    this.courses.forEach((course) => {
      course.course_dates.forEach((courseDate) => {
        const courseDateMoment = moment(courseDate.date, "YYYY-MM-DD");
        const formattedDate = courseDateMoment.format("YYYY-MM-DD");
        let shouldAdd = false;

        // Si la fecha del curso es hoy, comprobar las horas
        if (courseDateMoment.isSame(moment(), "day")) {
          if(course.course_type == 1) {
          const hourStart = moment(courseDate.hour_start, "HH:mm");

          // Solo añadir la fecha si el curso aún no ha empezado
          if (currentTime.isBefore(hourStart)) {
            shouldAdd = true;
          }
          } else {
            const hourEnd = moment(courseDate.hour_end, "HH:mm");
            if (currentTime.isBefore(hourEnd)) {
              shouldAdd = true;
            }
          }
        } else {
          // Si la fecha no es hoy, añadirla sin comprobación de hora
          shouldAdd = true;
        }

        // Si la fecha es válida, añadirla al array general y al mapa por intervalo
        if (shouldAdd) {
          ret.push(formattedDate);

          // Si tiene interval_id, añadirla al mapa de intervalos
          if (courseDate.interval_id) {
            const intervalId = String(courseDate.interval_id);
            if (!this.coursesDateByInterval.has(intervalId)) {
              this.coursesDateByInterval.set(intervalId, []);
            }
            this.coursesDateByInterval.get(intervalId).push(formattedDate);
          }
        }
      });
    });

    this.coursesDate = Array.from(new Set(ret));
  }

  dateClass() {
    return (date: Date): MatCalendarCellCssClasses => {
      const currentDate = moment(date, "YYYY-MM-DD").format("YYYY-MM-DD");
      if (
        this.coursesDate.indexOf(currentDate) !== -1 &&
        moment(this.minDate, "YYYY-MM-DD")
          .startOf("day")
          .isSameOrBefore(moment(date, "YYYY-MM-DD").startOf("day"))
      ) {
        const colorClass = this.tabs.find(
          (tab) => tab.courseTypeId === this.courseTypeId
        )?.class;

        return `with-course ${colorClass}`;
      } else {
        return;
      }
    };
  }

  getCourses(sportLevel: any) {
    if (!sportLevel || !this.utilizers?.length) {
      this.courses = [];
      this.cursesInSelectedDate = [];
      this.feedback.setLoading('courses', false);
      this.isLoading = false;
      return;
    }

    const loadingMessage = `Buscando cursos de ${sportLevel?.name || 'este nivel'}...`;
    const { request, cacheKey } = this.buildAvailabilityRequest(sportLevel);

    const cached = this.availabilityCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.availabilityTtlMs) {
      this.processAvailabilityResponse(cached.courses, sportLevel);
      return;
    }

    this.feedback.setLoading('courses', true, loadingMessage);
    this.isLoading = true;

    const inFlight = this.availabilityRequests.get(cacheKey);
    if (inFlight) {
      inFlight.subscribe({
        next: (courses) => this.processAvailabilityResponse(courses, sportLevel),
        error: (error) => this.handleAvailabilityError(error, sportLevel, cacheKey)
      });
      return;
    }

    const request$ = this.crudService
      .post("/availability", request)
      .pipe(
        map((response: any) => response?.data ?? []),
        shareReplay(1)
      );

    this.availabilityRequests.set(cacheKey, request$);

    request$.subscribe({
      next: (courses: any[]) => {
        this.availabilityCache.set(cacheKey, { timestamp: Date.now(), courses });
        this.processAvailabilityResponse(courses, sportLevel);
      },
      error: (error) => {
        this.availabilityRequests.delete(cacheKey);
        this.handleAvailabilityError(error, sportLevel, cacheKey);
      },
      complete: () => this.availabilityRequests.delete(cacheKey)
    });
  }

  /**
   * MEJORA CRÍTICA: Feedback contextual para resultados de búsqueda de cursos
   */
  private provideCourseLoadingFeedback(courseCount: number, sportName: string): void {
    const selectedDateFormatted = moment(this.selectedDate).format('DD/MM/YYYY');

    if (courseCount === 0) {
      this.feedback.warning(`No hay cursos de ${sportName} disponibles para el ${selectedDateFormatted}`, {
        duration: 5000,
        action: 'Cambiar fecha',
        onAction: () => this.feedback.info('Selecciona otra fecha en el calendario', { duration: 3000 })
      });
    } else if (courseCount === 1) {
      this.feedback.info(`1 curso de ${sportName} encontrado para el ${selectedDateFormatted}`, {
        duration: 3000
      });
    } else {
      this.feedback.success(`${courseCount} cursos de ${sportName} disponibles para el ${selectedDateFormatted}`, {
        duration: 2000,
        showIcon: false
      });
    }
  }

  private buildAvailabilityRequest(sportLevel: any): { request: any; cacheKey: string } {
    const start = moment(this.selectedDateMoment || this.selectedDate || this.minDate);
    const end = moment(this.nextMonthDate);
    const clientIds = Array.from(
      new Set(
        (this.utilizers || [])
          .map(item => Number(item?.id))
          .filter(id => !Number.isNaN(id))
      )
    ).sort((a: number, b: number) => a - b);

    const request = {
      start_date: start.format('YYYY-MM-DD'),
      end_date: end.format('YYYY-MM-DD'),
      course_type: this.courseTypeId,
      sport_id: sportLevel?.sport_id,
      client_id: clientIds,
      get_lower_degrees: false,
      school_id: this.user.schools[0].id
    };

    const cacheKey = JSON.stringify({
      start: request.start_date,
      end: request.end_date,
      type: request.course_type,
      sport: request.sport_id,
      degree: sportLevel?.id,
      clients: clientIds
    });

    return { request, cacheKey };
  }

  private processAvailabilityResponse(courses: any[], sportLevel: any): void {
    let filteredCourses = this.filterConflictingCourses(courses || []);

    // Para cursos privados, filtrar por disponibilidad de price_range
    if (this.courseTypeId === 2) {
      filteredCourses = this.filterPrivateFlexCoursesByPaxCapacity(filteredCourses);
    }

    this.courses = filteredCourses;

    if (this.courseTypeId === 1) {
      this.filterCoursesCollective();
    }

    this.compareCourseDates();
    this.cursesInSelectedDate = this.filterCoursesBySelectedDate(this.courses);
    this.stepForm.get("date").patchValue(this.selectedDateMoment, { emitEvent: false });

    this.provideCourseLoadingFeedback(this.cursesInSelectedDate.length, sportLevel?.name);
    this.feedback.setLoading('courses', false);
    this.isLoading = false;
  }

  /**
   * DEBUG: Método simple para verificar
   */
  debugPrice(course: any): number {
    return course?.minPrice || 0;
  }

  /**
   * Check if a course has intervals configuration
   */
  hasIntervals(course: any): boolean {
    const intervals = course?.settings?.intervals;
    return intervals && Array.isArray(intervals) && intervals.length > 0;
  }

  /**
   * Get intervals from a course - filtra solo intervalos con fechas futuras disponibles
   */
  getIntervals(course: any): any[] {
    if (!this.hasIntervals(course)) {
      return [];
    }

    // Filtrar solo intervalos que tengan al menos una fecha futura
    return course.settings.intervals.filter(interval => {
      const hasFutureDates = course.course_dates?.some(courseDate =>
        String(courseDate.interval_id) === String(interval.id) &&
        this.shouldShowCourseDate(courseDate)
      );
      return hasFutureDates;
    });
  }

  /**
   * Helper function to convert to String (for template)
   */
  String(value: any): string {
    return String(value);
  }

  /**
   * MEJORA CRÍTICA: Calcular precio correcto para cursos privados flexibles
   */
  getCorrectPriceForPrivateFlex(course: any): number {

    if (!course?.is_flexible || course?.course_type !== 2) {
      const fallback = course?.price || course?.minPrice || 0;
      return fallback;
    }

    const currentUtilizers = this.utilizers?.length || 1;
    const priceRangeCourse = typeof course?.price_range === 'string'
      ? JSON.parse(course.price_range)
      : course?.price_range;

    if (!Array.isArray(priceRangeCourse) || priceRangeCourse.length === 0) {
      const fallback = course?.price || course?.minPrice || 0;
      return fallback;
    }

    // Buscar el precio mínimo para el número actual de participantes
    let minPrice = Infinity;

    priceRangeCourse.forEach((priceRange: any, index: number) => {
      const priceForCurrentPax = priceRange[currentUtilizers.toString()];

      if (priceForCurrentPax && !isNaN(parseFloat(priceForCurrentPax))) {
        const price = parseFloat(priceForCurrentPax);
        if (price < minPrice) {
          minPrice = price;
        }
      }
    });

    const finalPrice = minPrice === Infinity ? (course?.price || course?.minPrice || 0) : minPrice;
    return finalPrice;
  }

  /**
   * Filtrar cursos privados flexibles que no tengan precios configurados para el número actual de utilizadores
   */
  private filterPrivateFlexCoursesByPaxCapacity(courses: any[]): any[] {
    const currentUtilizers = this.utilizers?.length || 1;

    return courses.filter(course => {
      // Si no es flexible, mantenerlo (cursos privados fijos)
      if (!course?.is_flexible) {
        return true;
      }

      // Si no tiene price_range, mantenerlo con el precio base
      const priceRangeCourse = typeof course?.price_range === 'string'
        ? JSON.parse(course.price_range)
        : course?.price_range;

      if (!Array.isArray(priceRangeCourse) || priceRangeCourse.length === 0) {
        return true;
      }

      // Verificar si existe al menos una duración con precio para el número actual de utilizadores
      const hasValidPrice = priceRangeCourse.some((priceRange: any) => {
        const priceForCurrentPax = priceRange[currentUtilizers.toString()];
        return priceForCurrentPax && !isNaN(parseFloat(priceForCurrentPax));
      });

      return hasValidPrice;
    });
  }

  private filterConflictingCourses(courses: any[]): any[] {
    if (!Array.isArray(this.activitiesBooked) || this.activitiesBooked.length === 0) {
      return courses;
    }

    return courses.filter(course => {
      return !this.activitiesBooked.some(activity => {
        if (!Array.isArray(activity?.utilizers) || activity.utilizers.length === 0) {
          return false;
        }

        const hasParticipantOverlap = activity.utilizers.some(utilizer =>
          this.utilizers?.some(selected => selected.id === utilizer.id)
        );

        if (!hasParticipantOverlap) {
          return false;
        }

        const sameCourse = activity.course?.course_type === 1 && activity.course?.id === course.id;
        const sameDegree = this.selectedForm?.value?.step3?.sportLevel?.id === activity.sportLevel?.id;

        const selectedFormDates = this.selectedForm?.value?.step5?.course_dates?.map(d => d.date) || [];
        const activityDates = activity.dates?.map(d => d.date) || [];
        const sameDates = JSON.stringify(selectedFormDates) === JSON.stringify(activityDates);
        const isEditing = !!this.selectedForm && sameCourse && sameDegree && sameDates;

        if (isEditing) {
          return false;
        }

        if (sameCourse && hasParticipantOverlap) {
          return true;
        }

        return this.hasTimeOverlap(activity, course);
      });
    });
  }

  private filterCoursesBySelectedDate(courses: any[]): any[] {
    const selectedDateMoment = moment(this.selectedDate);
    const today = moment();

    return courses.filter(course =>
      course.course_dates?.some(dateInfo => {
        const courseDateMoment = moment(dateInfo.date, 'YYYY-MM-DD');

        if (!selectedDateMoment.isSame(courseDateMoment, 'day')) {
          return false;
        }

        if (courseDateMoment.isSame(today, 'day')) {
          if (course.course_type === 1) {
            const hourStart = moment(dateInfo.hour_start, 'HH:mm');
            return today.isBefore(hourStart);
          }
          const hourEnd = moment(dateInfo.hour_end, 'HH:mm');
          return today.isBefore(hourEnd);
        }

        return true;
      })
    );
  }

  shouldShowCourseDate(courseDate: any): boolean {
    if (this.isSelectedDateInPast()) {
      return true;
    }
    return this.utilsService.isFutureDate(courseDate);
  }

  private isSelectedDateInPast(): boolean {
    if (!this.selectedDate) {
      return false;
    }
    return moment(this.selectedDate).isBefore(moment(), 'day');
  }

  private async confirmPastDateIfNeeded(date: Date): Promise<boolean> {
    if (!date || !moment(date).isBefore(moment(), 'day')) {
      return true;
    }

    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      data: {
        title: this.translateWithFallback('monitor_assignment.past_warning_title', 'Past date'),
        message: this.translateWithFallback(
          'monitor_assignment.past_warning_message',
          'Selected date is before today. Continue?'
        ),
        confirmButtonText: this.translateWithFallback('continue', 'Continue'),
        cancelButtonText: this.translateWithFallback('cancel', 'Cancel')
      }
    });

    const confirmed = await firstValueFrom(dialogRef.afterClosed());
    return !!confirmed;
  }

  private translateWithFallback(key: string, fallback: string): string {
    const translated = this.translateService.instant(key);
    if (!translated || translated === key) {
      return fallback;
    }
    return translated;
  }
  private handleAvailabilityError(error: any, sportLevel: any, cacheKey?: string): void {
    this.feedback.setLoading('courses', false);
    this.isLoading = false;
    this.feedback.error('Error al cargar los cursos. Inténtalo de nuevo.', {
      action: 'Reintentar',
      onAction: () => this.getCourses(sportLevel)
    });
    if (cacheKey) {
      this.availabilityRequests.delete(cacheKey);
    }
    console.error('Error loading courses:', error);
  }

  private hasTimeOverlap(activity: any, course: any): boolean {
    if (!Array.isArray(course?.course_dates) || course.course_dates.length === 0) {
      return false;
    }

    const courseDuration = Number(course?.duration_minutes || course?.duration || course?.minutes) || null;

    return course.course_dates.some((courseDate) => {
      const courseRange = this.buildDateRange(courseDate, courseDuration);
      if (!courseRange) {
        return false;
      }

      return activity?.dates?.some((activityDate: any) => {
        const activityDuration = Number(activity?.duration_minutes || activity?.duration || activity?.minutes) || null;
        const activityRange = this.buildDateRange(activityDate, activityDuration);
        if (!activityRange) {
          return false;
        }

        const sameDay = courseRange.start.isSame(activityRange.start, 'day');
        return sameDay && this.timeRangesOverlap(courseRange, activityRange);
      });
    });
  }

  private buildDateRange(dateEntry: any, fallbackDurationMinutes: number | null): { start: moment.Moment; end: moment.Moment } | null {
    const date = dateEntry?.date;
    const startTime = dateEntry?.hour_start || dateEntry?.startHour;
    const endTime = dateEntry?.hour_end || dateEntry?.endHour;
    if (!date || !startTime) {
      return null;
    }

    const start = moment(`${date} ${startTime}`, 'YYYY-MM-DD HH:mm', true);
    if (!start.isValid()) {
      return null;
    }

    let end: moment.Moment | null = null;
    if (endTime) {
      end = moment(`${date} ${endTime}`, 'YYYY-MM-DD HH:mm', true);
    }

    if (!end || !end.isValid() || !end.isAfter(start)) {
      const duration = Number(dateEntry?.duration || fallbackDurationMinutes) || 60;
      end = start.clone().add(duration, 'minutes');
    }

    return { start, end };
  }

  private timeRangesOverlap(rangeA: { start: moment.Moment; end: moment.Moment }, rangeB: { start: moment.Moment; end: moment.Moment }): boolean {
    return rangeA.start.isBefore(rangeB.end) && rangeB.start.isBefore(rangeA.end);
  }

  onTabChange(event) {
    this.courseTypeId = this.tabs[event.index].courseTypeId;
    this.getCourses(this.sportLevel);
    this.queueAvailabilityPreview();
  }

  preventTabChange(event: Event) {
    if (this.isLoading) {
      event.stopPropagation(); // Evita el cambio de pestaña cuando isLoading es true
      event.preventDefault();
    }
  }

  protected readonly CustomHeader = CustomHeader;
}


interface AvailabilityPreviewParams {
  sport_id: number;
  degree_id?: number;
  course_type?: number;
  date_from: string;
  date_to: string;
}

interface AvailabilityPreviewResponse {
  courses?: any[];
  summary?: {
    total_courses?: number;
    total_dates?: number;
    [key: string]: any;
  };
}

type AvailabilityPreviewStreamResult =
  | { status: 'skip' }
  | { status: 'success'; data: AvailabilityPreviewResponse | null }
  | { status: 'error' };











