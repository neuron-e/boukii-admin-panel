import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from "@angular/core";
import { FormArray, FormBuilder, FormGroup } from "@angular/forms";
import { BookingRentalInlineComponent, BookingRentalInlineDraft, BookingRentalInlineSummary } from "../booking-rental-inline/booking-rental-inline.component";

@Component({
  selector: "booking-form-stepper",
  templateUrl: "./form-stepper.component.html",
  styleUrls: ["./form-stepper.component.scss"],
})
export class BookingFormStepper implements OnChanges {
  @ViewChild(BookingRentalInlineComponent) bookingRentalInline?: BookingRentalInlineComponent;
  @Input() lockClient: boolean = false;
  @Input() rentalStepEnabled: boolean = false;
  @Input() rentalClient: any;
  @Input() rentalBookingDates: any[] = [];
  @Input() rentalInitialDraft: BookingRentalInlineDraft | null = null;
  @Output() changedCurrentStep = new EventEmitter<number>();
  @Output() changedFormData = new EventEmitter();
  @Output() formSaveAndCreateNew  = new EventEmitter();
  @Output() rentalDraftChange = new EventEmitter<BookingRentalInlineDraft>();
  @Output() rentalSummaryChange = new EventEmitter<BookingRentalInlineSummary>();
  @Input() forceStep: number;
  @Input() activitiesBooked: any;
  @Input() selectedDates: any;
  @Input() allLevels!: any;
  private _selectedForm: FormGroup;
  @Input()
  set selectedForm(value: FormGroup) {
    if (value) {
      this._selectedForm = value;
      this.stepperForm = this._selectedForm;
    }
  }

  get selectedForm() {
    return this._selectedForm;
  }

  stepperForm: FormGroup;
  currentStep = 0;

  get stepsLength(): number {
    return this.rentalStepEnabled ? 7 : 6;
  }

  constructor(private fb: FormBuilder) {
    // Inicializa el formulario vacío
/*    this.stepperForm = this.fb.group({
      step1: {},
      step2: {},
      step3: {},
      step4: {},
      step5: {},
      step6: {},
    });*/
  }

  ngOnChanges(changes: SimpleChanges) {
    if (
      changes["forceStep"] &&
      changes["forceStep"].currentValue !== undefined
    ) {
      const newStep = changes["forceStep"].currentValue;
      this.currentStep = newStep;
      this.changedCurrentStep.emit(newStep);
    }
  }

  nextStep() {
    if (this.currentStep < this.stepsLength - 1) {
      this.currentStep++;
    }
    this.changedCurrentStep.emit(this.currentStep);
  }

  previousStep() {
    // Bloquear volver al paso de cliente si está bloqueado
    if (this.currentStep === 1 && this.lockClient) {
      this.changedCurrentStep.emit(this.currentStep);
      return;
    }
    if (this.currentStep > 0) this.currentStep--;
    this.changedCurrentStep.emit(this.currentStep);
  }

  // Método para manejar "guardar y crear nuevo"
  handleSaveAndCreateNew(formGroup: FormGroup) {
    // Guardar el formulario actual para el paso 6
    this.stepperForm.setControl(this.rentalStepEnabled ? 'step7' : 'step6', formGroup);

    // Emitir el evento con el formulario completo
    this.formSaveAndCreateNew.emit(this.stepperForm);
  }

  // Manejar la finalización de cada paso

  handleStepCompletion(step: number, formGroup: FormGroup) {
    this.stepperForm.setControl(`step${step}`, formGroup);
    if (step < this.stepsLength) {
      for (let i = step + 1; i <= this.stepsLength; i++) {
        if(step != 6 && step == i) {
          this.stepperForm.setControl(`step${i}`, this.fb.group({}));
        }
      }
    }

    // MEJORA CRÍTICA: Saltar pantalla de detalles si es colectivo fijo sin extras
    if (step === 4) { // Completando step 4 (selección de curso)
      const courseData = formGroup.get('course')?.value;
      if (courseData && courseData.course_type === 1 && !courseData.is_flexible) {
        // Es un curso colectivo fijo, verificar si tiene extras
        const hasExtras = courseData.course_extras && courseData.course_extras.length > 0;
        if (!hasExtras) {
          // No tiene extras, construir los course_dates automáticamente y saltar el step 5
          this.stepperForm.setControl('step5', this.createFixedCollectiveDetailsForm(courseData));
          // Saltar directo al siguiente paso real (rental si existe, si no observaciones)
          this.currentStep = 5;
          this.changedCurrentStep.emit(this.currentStep);
          this.changedFormData.emit(this.stepperForm);
          return;
        }
      }
    }

    this.nextStep();
    this.changedFormData.emit(this.stepperForm);
  }

  handleRentalStepCompletion(): void {
    this.stepperForm.setControl('step6', this.fb.group({
      enabled: [!!this.bookingRentalInline?.hasSelection]
    }));
    this.nextStep();
    this.changedFormData.emit(this.stepperForm);
  }

  getRentalInlineComponent(): BookingRentalInlineComponent | undefined {
    return this.bookingRentalInline;
  }

  private createFixedCollectiveDetailsForm(courseData: any): FormGroup {
    const courseDates = Array.isArray(courseData?.course_dates) ? courseData.course_dates : [];
    const courseDatesArray = this.fb.array(
      courseDates.map((courseDate: any) =>
        this.fb.group({
          selected: [true],
          date: [courseDate.date],
          startHour: [courseDate.hour_start],
          endHour: [courseDate.hour_end],
          price: [courseData?.price || '0'],
          currency: [courseData?.currency || 'CHF'],
          extras: [[]],
          monitor: [null]
        })
      )
    ) as FormArray;

    return this.fb.group({
      course: [courseData],
      course_dates: courseDatesArray
    });
  }
}
