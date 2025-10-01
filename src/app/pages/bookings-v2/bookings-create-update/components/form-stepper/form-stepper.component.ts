import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";

@Component({
  selector: "booking-form-stepper",
  templateUrl: "./form-stepper.component.html",
  styleUrls: ["./form-stepper.component.scss"],
})
export class BookingFormStepper implements OnChanges {
  @Input() lockClient: boolean = false;
  @Output() changedCurrentStep = new EventEmitter<number>();
  @Output() changedFormData = new EventEmitter();
  @Output() formSaveAndCreateNew  = new EventEmitter();
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
  STEPS_LENGTH = 6;

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

  // Métodos para cambiar de paso
  nextStep() {
    if (this.currentStep < this.STEPS_LENGTH - 1) {
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
    this.stepperForm.setControl('step6', formGroup);

    // Emitir el evento con el formulario completo
    this.formSaveAndCreateNew.emit(this.stepperForm);
  }

  // Manejar la finalización de cada paso

  handleStepCompletion(step: number, formGroup: FormGroup) {
    this.stepperForm.setControl(`step${step}`, formGroup);
    if (step < this.STEPS_LENGTH) {
      for (let i = step + 1; i <= this.STEPS_LENGTH; i++) {
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
          // No tiene extras, saltar el step 5 (detalles) y crear un formulario vacío
          const emptyDetailsForm = this.fb.group({
            course: [courseData],
            course_dates: this.fb.array([])
          });
          this.stepperForm.setControl('step5', emptyDetailsForm);
          // Saltar directo al step 6 (observaciones)
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
}
