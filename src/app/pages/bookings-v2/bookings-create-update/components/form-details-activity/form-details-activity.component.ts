import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { ApiCrudService } from '../../../../../../service/crud.service';
import { changeMonitorOptions } from '../../../../../static-data/changeMonitorOptions';
import * as moment from 'moment';
import { UtilsService } from '../../../../../../service/utils.service';

@Component({
  selector: 'booking-form-details-activity',
  templateUrl: './form-details-activity.component.html',
  styleUrls: ['./form-details-activity.component.scss']
})
export class FormDetailsActivityComponent implements OnInit {
  @Input() course: any;
  @Input() date: any;
  @Input() utilizers: any;
  @Input() sportLevel: any;
  @Input() initialData: any;
  @Output() stepCompleted = new EventEmitter<FormGroup>();
  @Output() prevStep = new EventEmitter();
  @Input() stepForm: FormGroup; // Recibe el formulario desde el padre
  @Input() addParticipantEvent!: boolean; // Recibe el evento como Input
  @Input() removeDateEvent!: boolean; // Recibe el evento como Input
  possibleHours;
  possibleMonitors;
  possibleExtras;
  possibleChangeMonitorSelection = changeMonitorOptions;
  user;
  minDate: Date = new Date();
  season: any = [];
  holidays: any = [];
  myHolidayDates = [];
  currentGroups: any[] = []; // Para almacenar el grupo actual de cada índice
  filteredExtras: any[][] = []; // Para almacenar extras filtrados por índice


  constructor(
    private fb: FormBuilder,
    private snackbar: MatSnackBar,
    public translateService: TranslateService,
    private crudService: ApiCrudService,
    public utilService: UtilsService
  ) {
    this.possibleMonitors = [];
  }

  ngOnChanges() {
    // Reacciona cuando el Input cambia
    if (this.addParticipantEvent) {
      // this.addCourseDate(); // Llamamos a la función para añadir la fecha
    }
  }

  ngOnInit(): void {
    this.user = JSON.parse(localStorage.getItem("boukiiUser"));
    this.possibleExtras = this.course.course_extras;
    this.getSeason();
    this.initializeForm();
    this.possibleHours = this.utilService.generateCourseHours(
      this.course.hour_min,
      this.course.hour_max,
      this.course.minDuration,
      '5min'
    );
  }

  getSeason() {
    this.utilService.getSeason(this.user.schools[0].id).subscribe((season) => {
      this.season = season;
      this.holidays = this.utilService.getHolidays();
      this.holidays.forEach((element) => {
        this.myHolidayDates.push(moment(element).toDate());
      });
    });
  }

  isRow1Complete(): boolean {
    const dateGroup = this.courseDates.at(0);
    return dateGroup.get('date').valid && dateGroup.get('startHour').valid && dateGroup.get('duration').valid;
  }

  inUseDatesFilter = (d: Date): boolean => {
    return this.utilService.inUseDatesFilter(d, this.myHolidayDates, this.course, true);
  };

  initializeForm() {
    this.stepForm.addControl('course_dates', this.fb.array([this.createCourseDateGroup()]));
  }

  createCourseDateGroup(initialData: any = null): FormGroup {
    let formattedDate = this.date ? this.date.format('YYYY-MM-DD') : null;
    const courseDateGroup = this.fb.group({
      selected: [initialData ? initialData.selected : true],
      date: [initialData ? initialData.date : formattedDate, Validators.required],
      startHour: [initialData ? initialData.startHour : null, Validators.required],
      endHour: [initialData ? initialData.endHour : null, Validators.required],
      duration: [this.course.duration, Validators.required],
      price: [initialData ? initialData.price : null],
      currency: this.course.currency,
      monitor: [initialData ? initialData.monitor : null],
      changeMonitorOption: [initialData ? initialData.changeMonitorOption : null],
      groups: this.fb.array([this.createGroupForm()])
    });

    this.subscribeToFormChanges(courseDateGroup);
    return courseDateGroup;
  }

  onGroupChange(index: number) {
   // const selectedGroupName = this.formArray.at(index).get('groupName').value;
    /*const selectedGroup = this.course.settings.groups.find(group => group.groupName === selectedGroupName);

    // Actualiza el grupo actual para ese índice
    this.currentGroups[index] = selectedGroup;

    // Filtrar los extras para ese grupo
    this.filteredExtras[index] = this.course.course_extras.filter(extra => extra.group === selectedGroupName);
*/  }

  getGroupPrice(groupName: string): number {
    const group = this.course.settings.groups.find(g => g.groupName === groupName);
    return group ? group.price : 0;
  }

  createGroupForm(initialData: any = null): FormGroup {
    return this.fb.group({
      groupName: [initialData ? initialData.groupName : '', Validators.required],
      paxes: [initialData ? initialData.paxes : 1, [Validators.required, Validators.min(1)]],
      pricePerPax: [initialData ? initialData.pricePerPax : 0, Validators.required],
      price: [0], // Asegúrate de incluir este campo
      availableExtras: [[]],
      extras: [[]],
      totalExtraPrice: [0], // Campo para almacenar el precio total de extras
      totalPrice: [0] // Campo para almacenar el precio total
    });
  }

  removeGroup(courseIndex: number): void {
    const groupsArray = this.getGroupsArray(courseIndex);
    if (groupsArray.length > 1) {
      groupsArray.removeAt(groupsArray.length - 1); // Elimina el último grupo, por ejemplo.
    }
  }


  addGroup(courseIndex: number): void {
    const groupsArray = this.getGroupsArray(courseIndex);
    groupsArray.push(this.createGroupForm());
  }

  getGroupsArray(courseIndex: number): FormArray {
    return this.stepForm.get('course_dates')['controls'][courseIndex].get('groups') as FormArray;
  }

  // Acceso al form array de course_dates
  get courseDates(): FormArray {
    return this.stepForm.get('course_dates') as FormArray;
  }

  calculateTotalPrice(courseIndex: number) {
    const groupsArray = this.getGroupsArray(courseIndex);
    let totalPrice = 0;

    for (let i = 0; i < groupsArray.length; i++) {
      const group = groupsArray.at(i);
      const paxes = group.get('paxes').value;
      const pricePerPax = group.get('pricePerPax').value;
      const extras = group.get('extras').value;

      let totalExtraPrice = extras.reduce((acc, extra) => acc + extra.price, 0);
      totalPrice += paxes * (pricePerPax + totalExtraPrice);

      group.get('totalExtraPrice').setValue(totalExtraPrice);
    }

    return totalPrice;
  }

  updateGroupPrice(groupIndex: number): void {
    const courseIndex = 0; // Asumiendo que estás trabajando con el primer curso (índice 0)
    const group = this.getGroupsArray(courseIndex).at(groupIndex);

    // Obtener valores necesarios
    const paxes = group.get('paxes').value;
    const pricePerPax = group.get('price').value; // Asegúrate de que este campo esté definido en tu FormGroup
    const extras = group.get('extras').value;

    // Calcular el precio total de los extras
    const totalExtraPrice = extras.reduce((acc, extra) => acc + extra.price, 0);

    // Calcular el precio total
    const totalPrice = paxes * (pricePerPax + totalExtraPrice);

    // Establecer valores en el FormGroup
    group.get('totalExtraPrice').setValue(totalExtraPrice);
    group.get('totalPrice').setValue(totalPrice); // Asegúrate de que este campo esté definido en tu FormGroup
  }


  subscribeToFormChanges(courseDateGroup: FormGroup) {
    courseDateGroup.get('startHour').valueChanges.subscribe(() => {
      this.updateEndHour(courseDateGroup);
      this.getMonitorsAvailable(courseDateGroup);
    });

    courseDateGroup.get('date').valueChanges.subscribe(() => {
      const dateValue = courseDateGroup.get('date').value;
      this.warnPastDateIfNeeded(dateValue);
      if (courseDateGroup.get('duration').value && courseDateGroup.get('startHour').value) {
        this.getMonitorsAvailable(courseDateGroup);
      }
    });
  }

  calculateTotalExtrasPrice(utilizerGroup: FormGroup) {
    const selectedExtras = utilizerGroup.get('extras').value;
    let totalPrice = 0;
    selectedExtras.forEach((extra) => {
      totalPrice += extra.price;
    });
    utilizerGroup.get('totalExtraPrice').setValue(totalPrice);
  }

  private warnPastDateIfNeeded(dateValue: any): void {
    if (!dateValue) {
      return;
    }
    const isPast = moment(dateValue).isBefore(moment(), 'day');
    if (!isPast) {
      return;
    }

    const translated = this.translateService.instant('monitor_assignment.past_warning_message');
    const message = translated && translated !== 'monitor_assignment.past_warning_message'
      ? translated
      : 'Selected date is before today.';

    this.snackbar.open(message, this.translateService.instant('close'), { duration: 4000 });
  }
  getMonitorsAvailable(dateGroup) {
    const rq = {
      sportId: this.course.sport_id,
      minimumDegreeId: this.sportLevel.id,
      startTime: dateGroup.get('startHour').value,
      endTime: this.utilService.calculateEndHour(dateGroup.get('startHour').value, dateGroup.get('duration').value),
      date: moment(dateGroup.get('date').value).format('YYYY-MM-DD'),
      clientIds: this.utilizers.map((utilizer) => utilizer.id)
    };
    this.crudService.post('/admin/monitors/available', rq).subscribe((data) => {
      this.possibleMonitors = data.data;
      if (data.data.length === 0) {
        this.snackbar.open(
          this.translateService.instant('snackbar.booking.no_match'),
          'OK',
          { duration: 3000 }
        );
      }
    });
  }

  updateEndHour(courseDateGroup: FormGroup) {
    const startHour = courseDateGroup.get('startHour').value;
    const duration = courseDateGroup.get('duration').value;

    if (startHour && duration) {
      const endHour = this.utilService.calculateEndHour(startHour, duration);
      courseDateGroup.get('endHour').setValue(endHour, { emitEvent: false });
    }
  }

  getUtilizersArray(courseIndex: number): FormArray {
    return this.stepForm.get('course_dates').get(courseIndex.toString()).get('groups') as FormArray;
  }
}



