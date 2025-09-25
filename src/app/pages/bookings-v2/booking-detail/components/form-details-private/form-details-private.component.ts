import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as moment from 'moment';
import { UtilsService } from '../../../../../../service/utils.service';
import { changeMonitorOptions } from 'src/app/static-data/changeMonitorOptions';

@Component({
  selector: 'booking-detail-form-details-private',
  templateUrl: './form-details-private.component.html',
  styleUrls: ['./form-details-private.component.scss']
})
export class FormDetailsPrivateComponent implements OnInit {
  @Input() course: any;
  @Input() date: any;
  @Input() utilizers: any[] = [];
  @Input() sportLevel: any;
  @Input() initialData: any;
  @Input() activitiesBooked: any[] = [];
  @Output() stepCompleted = new EventEmitter<FormGroup>();
  @Output() prevStep = new EventEmitter<void>();

  stepForm: FormGroup;
  possibleHours: string[] = [];
  possibleDurations: string[] = [];
  possibleMonitors: any[] = [];
  possibleChangeMonitorSelection = changeMonitorOptions;
  possibleExtras: any[] = [];
  user: any;
  minDate: Date = new Date();
  season: any = [];
  holidays: any[] = [];
  myHolidayDates: Date[] = [];

  constructor(private fb: FormBuilder, public utilService: UtilsService) {
    this.stepForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.user = JSON.parse(localStorage.getItem('boukiiUser') || 'null');
    this.possibleExtras = this.course?.course_extras || [];

    this.initializeForm();

    const formatDate = moment(this.date).format('YYYY-MM-DD');
    const courseDate = (this.course?.course_dates || []).find((d: any) =>
      moment(d.date).format('YYYY-MM-DD') === formatDate
    );

    if (courseDate) {
      const minDur = (typeof this.course?.minDuration === 'string' && this.course.minDuration.length)
        ? this.course.minDuration
        : (typeof this.course?.duration === 'string' ? this.course.duration : '60min');

      this.possibleHours = this.utilService.generateCourseHours(
        courseDate.hour_start,
        courseDate.hour_end,
        minDur,
        '5min',
        [],
        formatDate,
        this.utilizers || []
      );

      this.possibleDurations = this.utilService.generateCourseDurations(
        courseDate.hour_start,
        courseDate.hour_end,
        this.course,
        [],
        formatDate,
        this.utilizers || []
      ) || [];
    }
  }

  initializeForm(): void {
    if (!this.stepForm.get('course_dates')) {
      this.stepForm.addControl('course_dates', this.fb.array([]));
    }

    this.addCourseDate();
  }

  get courseDates(): FormArray {
    return this.stepForm.get('course_dates') as FormArray;
  }

  addCourseDate(): void {
    const utilizerArray = this.fb.array(
      (this.utilizers || []).map(u => this.createUtilizer(u))
    );

    const formattedDate = moment(this.date).format('YYYY-MM-DD');

    const defaultDuration = !this.course?.is_flexible
      ? (this.course?.duration || null)
      : (this.possibleDurations && this.possibleDurations.length > 0 ? this.possibleDurations[0] : null);

    const group = this.fb.group({
      selected: [true],
      date: [formattedDate, Validators.required],
      startHour: [null, Validators.required],
      endHour: [null, Validators.required],
      duration: [defaultDuration, Validators.required],
      price: [0],
      currency: this.course?.currency,
      monitor: [null],
      changeMonitorOption: [null],
      utilizers: utilizerArray
    });

    this.courseDates.push(group);
    this.subscribeToFormChanges(group);
  }

  createUtilizer(utilizer: any): FormGroup {
    return this.fb.group({
      first_name: [utilizer?.first_name || ''],
      last_name: [utilizer?.last_name || ''],
      extras: [[]],
      totalExtraPrice: [0]
    });
  }

  isRow1Complete(index: number): boolean {
    const dateGroup = this.courseDates.at(index) as FormGroup;
    const date = dateGroup.get('date')?.value;
    const startHour = dateGroup.get('startHour')?.value;
    const duration = dateGroup.get('duration')?.value;
    return !!(date && startHour && duration);
  }

  updateEndHour(group: FormGroup): void {
    const startHour = group.get('startHour')?.value;
    const duration = group.get('duration')?.value;
    if (startHour && duration) {
      const endHour = this.utilService.calculateEndHour(startHour, duration);
      group.get('endHour')?.setValue(endHour, { emitEvent: false });
    }
  }

  getUtilizersArray(dateIndex: number): FormArray {
    return this.courseDates.at(dateIndex).get('utilizers') as FormArray;
  }

  removeDate(index: number): void {
    if (this.courseDates.length > 0) {
      this.courseDates.removeAt(index);
    }
  }

  inUseDatesFilter = (d: Date): boolean => {
    return this.utilService.inUseDatesFilter(d, this.myHolidayDates, this.course);
  };

  isPast(date: any): boolean {
    return moment(date).isBefore(moment(), 'day');
  }

  isFormValid(): boolean {
    return this.stepForm.valid;
  }

  calculateTotalExtraPrice(selectedExtras: any[]): number {
    return (selectedExtras || []).reduce((acc: number, e: any) => acc + (parseFloat(e?.price) || 0), 0);
  }

  subscribeToFormChanges(group: FormGroup): void {
    group.get('startHour')?.valueChanges.subscribe(() => this.updateEndHour(group));
    group.get('duration')?.valueChanges.subscribe(() => this.updateEndHour(group));
  }

  submitForm(): void {
    if (this.stepForm.valid) {
      this.stepCompleted.emit(this.stepForm);
    }
  }

  cancel(): void {
    this.prevStep.emit();
  }
}

