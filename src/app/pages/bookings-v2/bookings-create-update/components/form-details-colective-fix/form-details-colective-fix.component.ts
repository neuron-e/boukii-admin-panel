import { Component, Input, OnChanges, OnInit, SimpleChanges } from "@angular/core";
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { MOCK_POSIBLE_EXTRAS } from "../../mocks/course";

@Component({
  selector: "booking-form-details-colective-fix",
  templateUrl: "./form-details-colective-fix.component.html",
  styleUrls: ["./form-details-colective-fix.component.scss"],
})
export class FormDetailsColectiveFixComponent implements OnInit, OnChanges {
  @Input() course: any;
  @Input() utilizer: any;
  @Input() sportLevel: any;
  @Input() initialData: any;
  @Input() stepForm: FormGroup;
  @Input() selectedForm: FormGroup;
  possibleExtras;
  selectedExtras = [];
  totalExtrasPrice: string = "0 CHF"; // Muestra el precio total de los extras
  isCourseExtrasOld = true;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['course'] && !changes['course'].firstChange) ||
      (changes['initialData'] && !changes['initialData'].firstChange)) {
      this.initializeForm(true);
    }
  }

  private filterExtrasByName(extras: any[]): any[] {
    const uniqueExtras: { [key: string]: any } = {};
    return extras.filter(extra => {
      if (!uniqueExtras[extra.name]) {
        uniqueExtras[extra.name] = true; // Marca el nombre como procesado
        return true; // Mantén este extra en el resultado
      }
      return false; // Descarta extras con nombres duplicados
    });
  }

  initializeForm(forceReset: boolean = false) {
    if (!this.stepForm) {
      return;
    }

    if (!this.course || !Array.isArray(this.course.course_dates)) {
      if (forceReset && this.stepForm.get('course_dates')) {
        this.stepForm.removeControl('course_dates');
      }
      return;
    }

    this.possibleExtras = this.course.course_extras || [];
    if (this.isCourseExtrasOld) {
      this.possibleExtras = this.filterExtrasByName(this.possibleExtras);
    }

    if (forceReset && this.stepForm.get('course_dates')) {
      this.stepForm.removeControl('course_dates');
    }

    const persistedDates = this.getInitialCourseDates();
    const courseDatesArray = this.fb.array(
      this.course.course_dates.map((date, index) => {
        const persisted = this.findPersistedDate(persistedDates, date, index);
        const initialExtras = persisted?.extras || [];
        const isSelected = typeof persisted?.selected === 'boolean' ? persisted.selected : true;
        return this.createCourseDateGroup(date, initialExtras, isSelected);
      })
    );

    this.stepForm.setControl('course_dates', courseDatesArray);
    this.selectedExtras = this.detectSharedExtras(courseDatesArray);
    if (this.selectedExtras.length) {
      this.updateExtrasInForm();
    } else {
      this.totalExtrasPrice = `0 ${this.course?.currency || 'CHF'}`;
    }
  }

  createCourseDateGroup(courseDate: any, extras: any[] = [], isSelected: boolean = true): FormGroup {
    const monitor = this.findMonitor(courseDate);
    return this.fb.group({
      selected: [isSelected],
      date: [courseDate.date],
      startHour: [courseDate.hour_start],
      endHour: [courseDate.hour_end],
      price: this.course.price,
      currency: this.course.currency,
      extras: [{ value: extras, disabled: !this.possibleExtras || !this.possibleExtras.length }] ,
      monitor: [monitor]
    });
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
  }

  onExtraChange(event: any) {
    this.selectedExtras = event.value; // Actualiza los extras seleccionados
    this.updateExtrasInForm();
  }

  updateExtrasInForm() {
    this.totalExtrasPrice = this.selectedExtras.reduce((acc, extra) => acc + parseFloat(extra.price || '0'), 0).toFixed(2) + ' ' + this.course.currency;

    const courseDatesArray = this.stepForm.get('course_dates') as FormArray;
    courseDatesArray.controls.forEach(group => {
      group.get('extras')?.setValue(this.selectedExtras);
    });
  }

  private getInitialCourseDates(): any[] {
    if (Array.isArray(this.initialData)) {
      return this.initialData;
    }

    if (Array.isArray(this.initialData?.course_dates)) {
      return this.initialData.course_dates;
    }

    return [];
  }

  private detectSharedExtras(courseDatesArray: FormArray): any[] {
    const firstExtras = courseDatesArray.at(0)?.get('extras')?.value;
    return Array.isArray(firstExtras) ? firstExtras : [];
  }

  private findPersistedDate(persistedDates: any[], courseDate: any, index: number) {
    return persistedDates.find((item: any) => item?.date === courseDate.date) ?? persistedDates[index];
  }
}
