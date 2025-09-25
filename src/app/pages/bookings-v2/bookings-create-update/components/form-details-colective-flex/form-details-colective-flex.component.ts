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
    this.posibleExtras = this.course.course_extras;
    if (this.isCoursExtrasOld) {
      this.posibleExtras = this.filterExtrasByName(this.posibleExtras);
    }
    this.initializeForm();
    // Inicializa los precios a cero
    this.totalExtraPrice = new Array(this.course.course_dates.length).fill(0);
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
          // Si es una fecha en el futuro o es hoy y cumple con la hora, aÃ±adimos el grupo
          if ((isInFuture || isValidToday) && hasCapacity) {
            // Si hay datos iniciales, usamos esos datos para restaurar los valores seleccionados
            const initialSelected = this.initialData?.[index]?.selected || false;
            const initialExtras = this.initialData?.[index]?.extras || [];
            return this.createCourseDateGroup(date, initialSelected, initialExtras);
          } else {
            // Si la fecha no es vÃ¡lida (pasada o hoy pero la hora es menor a la actual), devolvemos null
            return null;
          }
        }).filter(group => group !== null), // Filtrar los null (fechas no vÃ¡lidas)
        this.atLeastOneSelectedValidator  // ValidaciÃ³n personalizada
      );
      // AÃ±adir el FormArray al formulario del padre
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
    // Filtra los grupos que coinciden con el `degree_id` de this.sportLevel
    const matchingGroup = courseDate.course_groups.find(group => group.degree_id === this.sportLevel.id);
    if (matchingGroup) {
      // Busca el subgrupo que tiene menos participantes que el mÃ¡ximo permitido
const availableSubgroup = matchingGroup.course_subgroups.find(
  (subgroup) => ((subgroup.booking_users || []).length) < subgroup.max_participants
);
      // Retorna el monitor si lo encuentra
      return availableSubgroup?.monitor || null;
    }
    // Si no encuentra ningÃºn grupo o subgrupo adecuado, retorna null
    return null;
  }
  onDateSelect(event: any, index: number) {
    const isChecked = event.checked;
    const courseDateGroup = this.courseDatesArray.at(index) as FormGroup;
    const extrasControl = courseDateGroup.get('extras');
    if (isChecked) {
      // Llamamos a checkAval para verificar la disponibilidad de la fecha seleccionada
      this.checkAval(index).then((isAvailable) => {
        if (isAvailable) {
          extrasControl.enable();
        } else {
          // Si no hay disponibilidad, deshabilitamos la fecha de nuevo
          // Usamos setTimeout para evitar conflictos con el evento del checkbox
          setTimeout(() => {
            courseDateGroup.get('selected').setValue(false, { emitEvent: false });
          }, 0);
          extrasControl.disable();
          extrasControl.setValue([]); // Limpia los extras seleccionados
        }
      });
    } else {
      extrasControl.disable();
      extrasControl.setValue([]);
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
}



