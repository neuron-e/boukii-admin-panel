import { Component, Input, Output, EventEmitter, OnChanges, OnInit, SimpleChanges } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: "booking-step-details",
  templateUrl: "./step-details.component.html",
  styleUrls: ["./step-details.component.scss"],
})
export class StepDetailsComponent implements OnInit, OnChanges {
  @Input() initialData: any;
  @Input() course: any;
  @Input() date: any;
  @Input() utilizers: any;
  @Input() activitiesBooked: any;
  @Input() selectedForm: FormGroup;
  @Input() dateForm: any;
  @Input() sportLevel: any;
  @Output() stepCompleted = new EventEmitter<FormGroup>();
  @Output() prevStep = new EventEmitter();
  addDateEvent = false;
  addParticipantEvent = false;
  stepForm: FormGroup;
  utilizer;

  constructor(private fb: FormBuilder) {
    this.stepForm = this.fb.group({
      course: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.syncUtilizer();
    this.syncCourseControl();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['utilizers']) {
      this.syncUtilizer();
    }

    if (changes['course']) {
      this.syncCourseControl();
    }
  }

  private syncUtilizer(): void {
    if (Array.isArray(this.utilizers) && this.utilizers.length > 0) {
      this.utilizer = this.utilizers[0];
    } else {
      this.utilizer = null;
    }
  }

  private syncCourseControl(): void {
    if (!this.stepForm) {
      return;
    }

    const control = this.stepForm.get('course');
    control?.setValue(this.course ?? null);
    control?.markAsPristine();
    control?.updateValueAndValidity({ emitEvent: false });
  }

  get isFormValid() {
    return this.stepForm?.valid ?? false;
  }

  handlePrevStep() {
    this.prevStep.emit();
  }

  addPrivateDate() {
    this.addDateEvent = true;  setTimeout(() => this.addDateEvent = false, 0);
  }

  addParticipant() {
    this.addParticipantEvent = true;  setTimeout(() => this.addParticipantEvent = false, 0);
  }

  completeStep() {
    if (this.isFormValid) {
      this.stepCompleted.emit(this.stepForm);
    }
  }


}
