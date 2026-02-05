import {
  Component,
  OnInit,
  Output,
  EventEmitter,
  Input,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from "@angular/forms";

@Component({
  selector: "booking-step-observations",
  templateUrl: "./step-observations.component.html",
  styleUrls: ["./step-observations.component.scss"],
})
export class StepObservationsComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() initialData: any;
  @Output() stepCompleted = new EventEmitter<FormGroup>();
  @Output() saveAndCreateNew = new EventEmitter<FormGroup>();
  @Output() prevStep = new EventEmitter();
  stepForm: FormGroup;
  @ViewChild('clientObsField') clientObsField: ElementRef;
  private focusTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(private fb: FormBuilder, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.stepForm = this.fb.group({
      clientObs: [this.initialData ? this.initialData.clientObs : ''],
      schoolObs: [this.initialData ? this.initialData.schoolObs : ''],
    });
  }

  ngAfterViewInit(): void {
    this.setFocusOnClientObs();
  }

  ngOnDestroy(): void {
    if (this.focusTimeoutId) {
      clearTimeout(this.focusTimeoutId);
      this.focusTimeoutId = null;
    }
  }

  isFormValid() {
    return this.stepForm.valid;
  }

  handlePrevStep() {
    this.prevStep.emit();
  }

  completeStep() {
    if (this.isFormValid()) {
      this.stepCompleted.emit(this.stepForm);
    }
  }

  completeAndReset() {
    if (this.isFormValid()) {
      // Emitir el evento específico para guardar y crear nuevo
      this.saveAndCreateNew.emit(this.stepForm);
    }
  }


  private setFocusOnClientObs(): void {
    if (!this.clientObsField) {
      return;
    }

    // Delay the focus to the next task so Angular finishes CD before Material toggles the placeholder (avoids NG0100).
    this.focusTimeoutId = setTimeout(() => {
      this.clientObsField?.nativeElement?.focus();
      this.cdr.detectChanges();
      this.focusTimeoutId = null;
    });
  }
}
