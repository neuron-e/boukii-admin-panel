import {Component, EventEmitter, Inject, Input, OnInit, Output} from '@angular/core';
import { UtilsService } from "src/service/utils.service";
import {FormArray, FormBuilder, FormGroup, Validators} from '@angular/forms';
import moment from 'moment';
import {ApiCrudService} from '../../../../../../service/crud.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {TranslateService} from '@ngx-translate/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

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


  constructor(protected utilsService: UtilsService,
              private fb: FormBuilder,
              private crudService: ApiCrudService,
              public translateService: TranslateService,
              private snackbar: MatSnackBar,
              @Inject(MAT_DIALOG_DATA) public data: any,
              private dialogRef: MatDialogRef<FormDetailsColectiveFlexComponent>) {
    this.course = data.course;
    this.utilizer = data.utilizer;
    this.sportLevel = data.sportLevel;
    this.initialData = data.initialData;
    this.activitiesBooked = data.groupedActivities;
    this.stepForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.posibleExtras = this.course.course_extras;
    this.initializeForm();

    // Inicializa los precios a cero
    this.totalExtraPrice = new Array(this.course.course_dates.length).fill(0);
  }


  initializeForm() {
    // Obtener el FormArray existente
    const existingCourseDatesArray = this.stepForm.get('course_dates') as FormArray;

    // Si no existe el FormArray, lo inicializamos
    if (!existingCourseDatesArray) {
      const courseDatesArray = this.fb.array(
        this.course.course_dates.map((date, index) => {
          // Validar si la fecha es hoy o en el futuro y si cumple con la hora de inicio
          const dateMoment = moment(date.date, "");
          const currentTime = moment(); // Hora actual

          // Verificamos si la fecha es hoy
          const isToday = dateMoment.isSame(currentTime, "day");

          // Verificamos si es una fecha futura
          const isInFuture = dateMoment.isAfter(currentTime, "day");

          // Verificamos si la hora de inicio es posterior a la hora actual (solo si es hoy)
          const hourStartMoment = moment(date.hour_start, "HH:mm");
          const isValidToday = isToday && hourStartMoment.isAfter(currentTime);

          // Si es una fecha en el futuro o es hoy y cumple con la hora, añadimos el grupo
          if (isInFuture || isValidToday) {
            // Si hay datos iniciales, usamos esos datos para restaurar los valores seleccionados
            // Si hay datos iniciales, usamos esos datos para restaurar los valores seleccionados
            const initialSelected = this.initialData?.[index] || false;
            const initialExtras = this.initialData?.[index]?.extras || [];
            return this.createCourseDateGroup(date, initialSelected, initialExtras);
          } else {
            // Si la fecha no es válida (pasada o hoy pero la hora es menor a la actual), devolvemos null
            return null;
          }
        }).filter(group => group !== null), // Filtrar los null (fechas no válidas)
        this.atLeastOneSelectedValidator  // Validación personalizada
      );

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
        // Si hay solapamiento en la verificación local, mostramos mensaje y resolvemos como false
        this.snackbar.open(this.translateService.instant('snackbar.booking.localOverlap'), 'OK', { duration: 3000 });
        resolve(false);
        return;
      }
      // Llamamos al servicio para verificar la disponibilidad de la fecha
      this.crudService.post('/admin/bookings/checkbooking', checkAval)
        .subscribe((response: any) => {
          // Supongamos que la API devuelve un campo 'available' que indica la disponibilidad
          const isAvailable = response.success; // Ajusta según la respuesta real de tu API
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
        continue; // Saltamos la comparación si es el mismo FormGroup
      }
      // Verificamos si alguno de los utilizers de bookingUsers está en los utilizers de normalizedDates
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


  // Validación personalizada para asegurarse de que al menos una fecha esté seleccionada
  atLeastOneSelectedValidator(formArray: FormArray): { [key: string]: boolean } | null {
    const selectedDates = formArray.controls.some(control => control.get('selected')?.value);
    return selectedDates ? null : { noDatesSelected: true };
  }

  createCourseDateGroup(courseDate: any, selected: boolean = false, extras: any[] = []): FormGroup {
    const monitor = this.findMonitor(courseDate);
    const group = this.fb.group({
      selected: [selected],
      date: [courseDate.date],
      startHour: [courseDate.hour_start],
      endHour: [courseDate.hour_end],
      price: this.course.price,
      currency: this.course.currency,
      extras: [{ value: [], disabled: !selected || !this.posibleExtras || !this.posibleExtras.length }] ,
      monitor: [monitor]
    });
    if (extras.length > 0) {
      // Mapeamos los extras iniciales para obtener los objetos exactos de possibleExtras
      const validExtras = this.posibleExtras.filter(extra =>
        extras.some(initialExtra => initialExtra.id === extra.id)
      );

      // Actualizamos el FormControl con los objetos mapeados de possibleExtras
      group.get('extras')?.patchValue(validExtras);

    }

    return group;
  }

  findMonitor(courseDate: any): any {
    // Filtra los grupos que coinciden con el `degree_id` de this.sportLevel
    const matchingGroup = courseDate.course_groups.find(group => group.degree_id === this.sportLevel.id);

    if (matchingGroup) {
      // Busca el subgrupo que tiene menos participantes que el máximo permitido
const availableSubgroup = matchingGroup.course_subgroups.find(
  (subgroup) => ((subgroup.booking_users || []).length) < subgroup.max_participants
);

      // Retorna el monitor si lo encuentra
      return availableSubgroup?.monitor || null;
    }

    // Si no encuentra ningún grupo o subgrupo adecuado, retorna null
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
          courseDateGroup.get('selected').setValue(false);
          extrasControl.disable();
          extrasControl.setValue([]); // Limpia los extras seleccionados

        }
      });
    } else {
      extrasControl.disable();
      extrasControl.setValue([]);
    }
  }

  // Calcula el total de extras seleccionados para una fecha específica
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

  submitForm() {
    if (this.stepForm.valid) {
      // Cerrar el diálogo pasando los valores del formulario
      this.dialogRef.close(this.stepForm.value);

    } else {
      this.snackbar.open('Por favor completa todos los campos requeridos', 'OK', { duration: 3000 });
    }
  }
  isFormValid() {
    return this.stepForm.valid;
  }
  cancel() {
    this.dialogRef.close();
  }
}
