import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import { MOCK_POSIBLE_EXTRAS } from "../../mocks/course";
import { UtilsService } from "src/service/utils.service";
import {FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import moment from 'moment';
import {ApiCrudService} from '../../../../../../service/crud.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {TranslateService} from '@ngx-translate/core';
@Component({
  selector: "booking-form-details-colective-flex",
  templateUrl: "./form-details-colective-flex.component.html",
  styleUrls: ["./form-details-colective-flex.component.scss"],
})
export class FormDetailsColectiveFlexComponent implements OnInit {
  @Input() course: any;
  @Input() utilizer: any;
  @Input() sportLevel: any;
  @Input() initialData: any;
  @Input() activitiesBooked: any;
  @Output() stepCompleted = new EventEmitter<FormGroup>();
  @Output() prevStep = new EventEmitter();
  @Input() stepForm: FormGroup; // Recibe el formulario desde el padre
  @Input() selectedForm: FormGroup; // Recibe el formulario desde el padre
  posibleExtras;
  totalExtraPrice: number[] = [];
  isCoursExtrasOld = true;
  private checkAvailabilityCache = new Map<string, Promise<boolean>>();

  constructor(protected utilsService: UtilsService,
              private fb: FormBuilder,
              private crudService: ApiCrudService,
              public translateService: TranslateService,
              private snackbar: MatSnackBar) {
  }
  ngOnInit(): void {
    console.log('FLEX DATES DEBUG: Component initializing');
    console.log('FLEX DATES DEBUG: Course:', this.course);
    console.log('FLEX DATES DEBUG: Sport level:', this.sportLevel);
    console.log('FLEX DATES DEBUG: Utilizer:', this.utilizer);

    this.posibleExtras = this.course.course_extras;
    if (this.isCoursExtrasOld) {
      this.posibleExtras = this.filterExtrasByName(this.posibleExtras);
    }

    console.log('FLEX DATES DEBUG: Possible extras:', this.posibleExtras?.length);

    this.initializeForm();
    // Inicializa los precios a cero
    this.totalExtraPrice = new Array(this.course.course_dates?.length || 0).fill(0);

    console.log('FLEX DATES DEBUG: Component initialization complete');
    console.log('FLEX DATES DEBUG: Form controls count:', this.courseDatesArray?.controls?.length);
  }
  private filterExtrasByName(extras: any[]): any[] {
    const uniqueExtras: { [key: string]: any } = {};
    return extras.filter(extra => {
      if (!uniqueExtras[extra.name]) {
        uniqueExtras[extra.name] = true; // Marca el nombre como procesado
        return true; // MantÃ©n este extra en el resultado
      }
      return false; // Descarta extras con nombres duplicados
    });
  }
  initializeForm() {
    console.log('FLEX DATES DEBUG: Initializing form for course:', this.course?.name);
    console.log('FLEX DATES DEBUG: Course dates available:', this.course?.course_dates?.length);
    console.log('FLEX DATES DEBUG: Sport level:', this.sportLevel);

    // Obtener el FormArray existente
    const existingCourseDatesArray = this.stepForm.get('course_dates') as FormArray;
    // Si no existe el FormArray, lo inicializamos
    if (!existingCourseDatesArray) {
      const courseDatesArray = this.fb.array(
        this.course.course_dates.map((date, index) => {
          // Validar si la fecha es hoy o en el futuro y si cumple con la hora de inicio
          const dateMoment = moment(date.date, "YYYY-MM-DD");
          const currentTime = moment(); // Hora actual
          // Verificamos si la fecha es hoy
          const isToday = dateMoment.isSame(currentTime, "day");
          // Verificamos si es una fecha futura
          const isInFuture = dateMoment.isAfter(currentTime, "day");
          // Verificamos si la hora de inicio es posterior a la hora actual (solo si es hoy)
          const hourStartMoment = moment(date.hour_start, "HH:mm");
          const isValidToday = isToday && hourStartMoment.isAfter(currentTime);
          // Comprobar capacidad por nivel (subgrupo con hueco) y autoasignar monitor
          const monitor = this.findMonitor(date);
          const hasCapacity = !!monitor;
          // MEJORA CRÍTICA: Ser más permisivo con las fechas - mostrar todas las fechas válidas
          console.log(`FLEX DATES DEBUG: Date ${index} - isToday: ${isToday}, isInFuture: ${isInFuture}, isValidToday: ${isValidToday}, hasCapacity: ${hasCapacity}`);

          // Si es una fecha en el futuro o es hoy y cumple con la hora, añadimos el grupo
          if (isInFuture || isValidToday) {
            // Si hay datos iniciales, usamos esos datos para restaurar los valores seleccionados
            const initialSelected = this.initialData?.[index]?.selected || false;
            const initialExtras = this.initialData?.[index]?.extras || [];
            const dateGroup = this.createCourseDateGroup(date, initialSelected, initialExtras);

            // Si no hay capacidad, agregar información pero mantener el control habilitado
            if (!hasCapacity) {
              dateGroup.get('monitor')?.setValue(null);
              console.log(`FLEX DATES DEBUG: Date ${index} has no capacity but control stays enabled`);
            }

            return dateGroup;
          } else {
            // Si la fecha no es válida (pasada o hoy pero la hora es menor a la actual), devolvemos null
            console.log(`FLEX DATES DEBUG: Date ${index} excluded - not valid date`);
            return null;
          }
        }).filter(group => group !== null), // Filtrar los null (fechas no válidas)
        this.atLeastOneSelectedValidator  // Validación personalizada
      );

      console.log('FLEX DATES DEBUG: Final dates array length:', courseDatesArray.controls.length);
      console.log('FLEX DATES DEBUG: Dates array controls:', courseDatesArray.controls);

      // Añadir el FormArray al formulario del padre
      this.stepForm.addControl('course_dates', courseDatesArray);
    }
  }
  checkAval(index: number): Promise<boolean> {
    return new Promise((resolve) => {
      const courseDateGroup = this.courseDatesArray.at(index) as FormGroup;
      // Preparamos el objeto con los datos de la fecha seleccionada
      const checkAval = {
        bookingUsers: [{
          client_id: this.utilizer.id,
          hour_start: courseDateGroup.get('startHour').value.replace(':00', ''), // Reemplaza ":00" si es necesario
          hour_end: courseDateGroup.get('endHour').value.replace(':00', ''), // Reemplaza ":00" si es necesario
          date: moment(courseDateGroup.get('date').value).format('YYYY-MM-DD') // Formateamos la fecha
        }],
        bookingUserIds: []
      };
      const hasLocalOverlap = this.checkLocalOverlap(checkAval.bookingUsers);
      if (hasLocalOverlap) {
        // Si hay solapamiento en la verificaciÃ³n local, mostramos mensaje y resolvemos como false
        this.snackbar.open(this.translateService.instant('snackbar.booking.localOverlap'), 'OK', { duration: 3000 });
        resolve(false);
        return;
      }
      // Llamamos al servicio para verificar la disponibilidad de la fecha
      this.crudService.post('/admin/bookings/checkbooking', checkAval)
        .subscribe((response: any) => {
          // Supongamos que la API devuelve un campo 'available' que indica la disponibilidad
          const isAvailable = response.success; // Ajusta segÃºn la respuesta real de tu API
          resolve(isAvailable); // Resolvemos la promesa con el valor de disponibilidad
        }, (error) => {
          this.snackbar.open(this.translateService.instant('snackbar.booking.overlap') +
            moment(error.error.data[0].date).format('YYYY-MM-DD') +
            ' | ' + error.error.data[0].hour_start + ' - ' +
            error.error.data[0].hour_end, 'OK', { duration: 3000 })
          resolve(false); // En caso de error, rechazamos la promesa
        });
    });
  }
  checkLocalOverlap(bookingUsers: any[]): boolean {
    // Recorremos cada normalizedDate
    for (let normalized of this.activitiesBooked) {
      if (this.selectedForm && this.selectedForm === normalized) {
        continue; // Saltamos la comparaciÃ³n si es el mismo FormGroup
      }
      // Verificamos si alguno de los utilizers de bookingUsers estÃ¡ en los utilizers de normalizedDates
      for (let bookingUser of bookingUsers) {
        const matchingUtilizer = normalized.utilizers.find(
          (utilizer: any) => utilizer.id === bookingUser.client_id
        );
        // Si encontramos un utilizer coincidente, verificamos las fechas
        if (matchingUtilizer) {
          for (let normalizedDate of normalized.dates) {
            // Comprobar si hay solapamiento entre la fecha seleccionada y la fecha de normalizedDates
            const formattedNormalizedDate = moment(normalizedDate.date).format('YYYY-MM-DD');
            const formattedBookingUserDate = moment(bookingUser.date).format('YYYY-MM-DD');
            if (formattedBookingUserDate === formattedNormalizedDate) {
              // Verificamos solapamiento en las horas
              if (bookingUser.hour_start < normalizedDate.endHour &&
                normalizedDate.startHour < bookingUser.hour_end) {
                return true; // Si hay solapamiento, retornamos true
              }
            }
          }
        }
      }
    }
    return false; // Si no encontramos solapamientos, retornamos false
  }
  // ValidaciÃ³n personalizada para asegurarse de que al menos una fecha estÃ© seleccionada
  // y que se cumplan las reglas de reserva del curso
  atLeastOneSelectedValidator = (formArray: FormArray): { [key: string]: boolean } | null => {
    const selectedDates = formArray.controls.filter(control => control.get('selected')?.value);
    if (selectedDates.length === 0) {
      return { noDatesSelected: true };
    }
    // Obtener las reglas de reserva del curso
    const courseSettings = this.course.settings || {};
    const mustBeConsecutive = courseSettings.mustBeConsecutive || false;
    const mustStartFromFirst = courseSettings.mustStartFromFirst || false;
    // Aplicar validaciÃ³n de "debe empezar desde el primer dÃ­a"
    if (mustStartFromFirst) {
      const firstAvailableDate = formArray.controls[0]; // El primer control es la primera fecha disponible
      if (!firstAvailableDate.get('selected')?.value) {
        return { mustStartFromFirstDay: true };
      }
    }
    // Aplicar validaciÃ³n de "fechas consecutivas"
    if (mustBeConsecutive && selectedDates.length > 1) {
      // Obtener los Ã­ndices de las fechas seleccionadas
      const selectedIndices = formArray.controls
        .map((control, index) => control.get('selected')?.value ? index : null)
        .filter(index => index !== null)
        .sort((a, b) => a - b);
      // Verificar que los Ã­ndices sean consecutivos
      for (let i = 1; i < selectedIndices.length; i++) {
        if (selectedIndices[i] - selectedIndices[i - 1] !== 1) {
          return { datesNotConsecutive: true };
        }
      }
    }
    return null;
  }
  createCourseDateGroup(courseDate: any, selected: boolean = false, extras: any[] = []): FormGroup {
    const monitor = this.findMonitor(courseDate);
    return this.fb.group({
      selected: [selected],
      date: [courseDate.date],
      startHour: [courseDate.hour_start],
      endHour: [courseDate.hour_end],
      price: this.course.price,
      currency: this.course.currency,
      extras: [{ value: extras, disabled: !selected || !this.posibleExtras || !this.posibleExtras.length }] ,
      monitor: [monitor]
    });
  }
  findMonitor(courseDate: any): any {
    console.log('FLEX DATES DEBUG: Finding monitor for date:', courseDate.date);
    console.log('FLEX DATES DEBUG: Available groups:', courseDate.course_groups?.length);
    console.log('FLEX DATES DEBUG: Looking for sport level ID:', this.sportLevel?.id);

    // Filtra los grupos que coinciden con el `degree_id` de this.sportLevel
    const matchingGroup = courseDate.course_groups?.find(group => group.degree_id === this.sportLevel?.id);

    console.log('FLEX DATES DEBUG: Matching group found:', !!matchingGroup);

    if (matchingGroup) {
      console.log('FLEX DATES DEBUG: Subgroups in matching group:', matchingGroup.course_subgroups?.length);

      // Busca el subgrupo que tiene menos participantes que el máximo permitido
      const availableSubgroup = matchingGroup.course_subgroups?.find(
        (subgroup) => ((subgroup.booking_users || []).length) < subgroup.max_participants
      );

      console.log('FLEX DATES DEBUG: Available subgroup found:', !!availableSubgroup);
      console.log('FLEX DATES DEBUG: Monitor found:', !!availableSubgroup?.monitor);

      // Retorna el monitor si lo encuentra
      return availableSubgroup?.monitor || null;
    }

    console.log('FLEX DATES DEBUG: No matching group found for sport level');
    // Si no encuentra ningún grupo o subgrupo adecuado, retorna null
    return null;
  }
  onDateSelect(event: any, index: number) {
    const isChecked = event.checked;
    const courseDateGroup = this.courseDatesArray.at(index) as FormGroup;
    const extrasControl = courseDateGroup.get('extras');

    console.log('FLEX DATES DEBUG: Date selection changed:', {
      index,
      isChecked,
      dateValue: courseDateGroup.get('date')?.value,
      currentFormValid: this.stepForm.valid
    });

    if (isChecked) {
      console.log('FLEX DATES DEBUG: Checking availability for date index:', index);

      // Llamamos a checkAval para verificar la disponibilidad de la fecha seleccionada
      this.checkAval(index).then((isAvailable) => {
        console.log('FLEX DATES DEBUG: Availability check result:', isAvailable);

        if (isAvailable) {
          extrasControl?.enable();
          console.log('FLEX DATES DEBUG: Date enabled and extras control enabled');

          // Feedback positivo
          if (this.snackbar) {
            this.snackbar.open('Fecha seleccionada correctamente', 'OK', { duration: 2000 });
          }
        } else {
          // Si no hay disponibilidad, deshabilitamos la fecha de nuevo
          console.log('FLEX DATES DEBUG: Date not available, reverting selection');

          // Usamos setTimeout para evitar conflictos con el evento del checkbox
          setTimeout(() => {
            courseDateGroup.get('selected')?.setValue(false, { emitEvent: false });
          }, 0);
          extrasControl?.disable();
          extrasControl?.setValue([]); // Limpia los extras seleccionados
        }

        // Actualizar validación del formulario
        this.stepForm.updateValueAndValidity();
      }).catch((error) => {
        console.error('FLEX DATES DEBUG: Error checking availability:', error);
        // En caso de error, permitir la selección pero mostrar advertencia
        extrasControl?.enable();
        if (this.snackbar) {
          this.snackbar.open('No se pudo verificar la disponibilidad, pero se permite la selección', 'OK', { duration: 3000 });
        }
      });
    } else {
      console.log('FLEX DATES DEBUG: Date unselected, disabling extras');
      extrasControl?.disable();
      extrasControl?.setValue([]);
      this.stepForm.updateValueAndValidity();
    }
  }
  // Calcula el total de extras seleccionados para una fecha especÃ­fica
  onExtraChange(index: number) {
    const selectedExtras = this.courseDatesArray.at(index).get('extras').value || [];
    this.totalExtraPrice[index] = selectedExtras.reduce((acc, extra) => acc*1 + extra.price*1, 0);
  }
  get courseDatesArray(): FormArray {
    return this.stepForm.get('course_dates') as FormArray;
  }
  isSelected(index: number): boolean {
    return (this.courseDatesArray.at(index) as FormGroup).get('selected').value;
  }
  formatDate(date: string) {
    return this.utilsService.formatDate(date);
  }

  /**
   * Check if the course has intervals configuration
   */
  hasIntervals(): boolean {
    const intervals = this.course?.settings?.intervals;
    return intervals && Array.isArray(intervals) && intervals.length > 0;
  }

  /**
   * Get the list of intervals from course settings
   * Only returns intervals that have at least one available date
   */
  getIntervals(): any[] {
    if (!this.hasIntervals()) {
      return [];
    }
    // Filtrar solo intervalos que tengan fechas disponibles
    return this.course.settings.intervals.filter(interval => {
      const dateCount = this.getDateCountForInterval(interval.id);
      return dateCount > 0;
    });
  }

  /**
   * Track collapsed state of intervals
   */
  private collapsedIntervals: { [key: number]: boolean } = {};

  /**
   * Toggle interval collapse state
   */
  toggleInterval(intervalIdx: number): void {
    this.collapsedIntervals[intervalIdx] = !this.collapsedIntervals[intervalIdx];
  }

  /**
   * Check if interval is collapsed
   */
  isIntervalCollapsed(intervalIdx: number): boolean {
    return this.collapsedIntervals[intervalIdx] || false;
  }

  /**
   * Get interval_id for a specific date by index
   */
  getDateIntervalId(dateIndex: number): string | null {
    const courseDate = this.course.course_dates?.[dateIndex];
    return courseDate?.interval_id ? String(courseDate.interval_id) : null;
  }

  /**
   * Count dates for a specific interval
   * Only counts dates that are in the FormArray (available dates)
   */
  getDateCountForInterval(intervalId: string): number {
    if (!this.courseDatesArray || !this.course?.course_dates) {
      return 0;
    }
    // Contar solo las fechas que están en el FormArray (las disponibles)
    let count = 0;
    this.courseDatesArray.controls.forEach((control, index) => {
      const courseDate = this.course.course_dates[index];
      if (courseDate && String(courseDate.interval_id) === String(intervalId)) {
        count++;
      }
    });
    return count;
  }

  /**
   * Select/deselect all dates for a specific interval
   */
  selectAllForInterval(intervalId: string, select: boolean): void {
    this.courseDatesArray.controls.forEach((control, index) => {
      const dateIntervalId = this.getDateIntervalId(index);
      if (String(dateIntervalId) === String(intervalId)) {
        const courseDateGroup = control as FormGroup;
        const currentlySelected = courseDateGroup.get('selected')?.value;

        // If we're selecting and it's not already selected, simulate a selection
        if (select && !currentlySelected) {
          courseDateGroup.get('selected')?.setValue(true);
          this.onDateSelect({ checked: true }, index);
        } else if (!select && currentlySelected) {
          // If we're deselecting and it's currently selected
          courseDateGroup.get('selected')?.setValue(false);
          const extrasControl = courseDateGroup.get('extras');
          extrasControl?.disable();
          extrasControl?.setValue([]);
        }
      }
    });

    this.stepForm.updateValueAndValidity();
  }

  /**
   * Check if all dates in an interval are selected
   */
  areAllSelectedForInterval(intervalId: string): boolean {
    const intervalDates = this.courseDatesArray.controls.filter((control, index) => {
      const dateIntervalId = this.getDateIntervalId(index);
      return String(dateIntervalId) === String(intervalId);
    });

    if (intervalDates.length === 0) {
      return false;
    }

    return intervalDates.every(control => {
      const courseDateGroup = control as FormGroup;
      return courseDateGroup.get('selected')?.value === true;
    });
  }

  // ==================== SELECTOR DE GRUPOS POR FECHA ====================

  // Almacena los grupos disponibles por cada fecha (índice de fecha -> array de subgrupos)
  availableGroupsByDate: { [dateIndex: number]: any[] } = {};

  // Estado de carga de grupos por fecha
  loadingGroupsByDate: { [dateIndex: number]: boolean } = {};

  // Grupo seleccionado por fecha (índice de fecha -> subgrupo)
  selectedGroupByDate: { [dateIndex: number]: any } = {};

  // Estado de expansión del selector de grupos por fecha
  groupSelectorExpanded: { [dateIndex: number]: boolean } = {};

  /**
   * Carga los subgrupos disponibles para una fecha específica desde el objeto curso
   */
  loadGroupsForDate(dateIndex: number): void {
    const courseDate = this.course.course_dates[dateIndex];
    if (!courseDate || !this.course) {
      return;
    }

    this.loadingGroupsByDate[dateIndex] = true;

    // Obtener grupos del courseDate directamente
    const groups = courseDate.course_groups || [];

    if (groups.length === 0) {
      this.availableGroupsByDate[dateIndex] = [];
      this.loadingGroupsByDate[dateIndex] = false;
      return;
    }

    // Procesar subgrupos de todos los grupos
    const neededSlots = 1; // Para colectivo flex, siempre es 1 participante
    const allSubgroups = [];

    groups.forEach(group => {
      if (group.course_subgroups && group.course_subgroups.length > 0) {
        group.course_subgroups.forEach(subgroup => {
          const currentBookings = subgroup.booking_users?.length ?? 0;
          const maxParticipants = subgroup.max_participants ?? 999;
          const availableSlots = Math.max(0, maxParticipants - currentBookings);
          const hasCapacity = availableSlots >= neededSlots;

          allSubgroups.push({
            ...subgroup,
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

    this.availableGroupsByDate[dateIndex] = allSubgroups;
    this.loadingGroupsByDate[dateIndex] = false;

    // Auto-seleccionar el grupo que coincide con el nivel del usuario
    this.autoSelectGroupForDate(dateIndex);
  }

  /**
   * Auto-selecciona el grupo que coincide con el nivel del usuario
   */
  private autoSelectGroupForDate(dateIndex: number): void {
    const groups = this.availableGroupsByDate[dateIndex];
    if (!groups || groups.length === 0 || !this.sportLevel) {
      return;
    }

    // Buscar grupo que coincida con el nivel y tenga capacidad
    const matchingGroup = groups.find(g =>
      g.group_info?.degree_id === this.sportLevel.id &&
      g.capacity_info?.has_capacity
    );

    if (matchingGroup) {
      this.selectedGroupByDate[dateIndex] = matchingGroup;
      this.updateDateGroup(dateIndex, matchingGroup);
    } else {
      // Si no hay coincidencia, seleccionar el primero con capacidad
      const firstAvailable = groups.find(g => g.capacity_info?.has_capacity);
      if (firstAvailable) {
        this.selectedGroupByDate[dateIndex] = firstAvailable;
        this.updateDateGroup(dateIndex, firstAvailable);
      }
    }
  }

  /**
   * Actualiza el FormGroup de la fecha con el grupo seleccionado
   */
  private updateDateGroup(dateIndex: number, group: any): void {
    const dateControl = this.courseDatesArray.at(dateIndex) as FormGroup;
    if (dateControl) {
      dateControl.patchValue({
        subgroup_id: group?.id,
        monitor_id: group?.monitor_id
      });
    }
  }

  /**
   * Maneja el cambio de grupo seleccionado
   */
  onGroupChange(dateIndex: number, group: any): void {
    this.selectedGroupByDate[dateIndex] = group;
    this.updateDateGroup(dateIndex, group);
  }

  /**
   * Alterna la expansión del selector de grupos
   */
  toggleGroupSelector(dateIndex: number): void {
    this.groupSelectorExpanded[dateIndex] = !this.groupSelectorExpanded[dateIndex];

    // Cargar grupos si aún no se han cargado
    if (this.groupSelectorExpanded[dateIndex] && !this.availableGroupsByDate[dateIndex]) {
      this.loadGroupsForDate(dateIndex);
    }
  }

  /**
   * Verifica si el selector está expandido
   */
  isGroupSelectorExpanded(dateIndex: number): boolean {
    return this.groupSelectorExpanded[dateIndex] || false;
  }

  /**
   * Obtiene el nombre del grupo seleccionado para mostrar en el botón
   */
  getSelectedGroupName(dateIndex: number): string {
    const group = this.selectedGroupByDate[dateIndex];
    if (!group) {
      return this.translateService.instant('select_group');
    }

    // Mostrar nivel + nombre del subgrupo si existe
    const levelName = `${group.group_info?.league || ''} ${group.group_info?.name || ''}`.trim();
    const subgroupName = group.name ? ` - ${group.name}` : '';

    return levelName + subgroupName;
  }
}



