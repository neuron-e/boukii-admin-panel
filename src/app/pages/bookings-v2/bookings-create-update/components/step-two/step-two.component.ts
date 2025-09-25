import { Component, Input, OnInit, Output, EventEmitter } from "@angular/core";
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import * as moment from 'moment/moment';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';

import { LangService } from "src/service/langService";
import { UtilsService } from "src/service/utils.service";
import { CreateUserDialogComponent } from "../create-user-dialog/create-user-dialog.component";
import { ApiCrudService } from '../../../../../../service/crud.service';

@Component({
  selector: "booking-step-two",
  templateUrl: "./step-two.component.html",
  styleUrls: ["./step-two.component.scss"],
})
export class StepTwoComponent implements OnInit {
  @Input() initialData: any;
  @Input() client: any;
  @Input() allLevels: any;
  @Output() stepCompleted = new EventEmitter<FormGroup>();
  @Output() prevStep = new EventEmitter();

  stepForm: FormGroup;
  utilizers: any[] = [];
  selectedUtilizers: any[] = [];
  userAvatar = "../../../../assets/img/avatar.png";

  searchControl = new FormControl('');
  filteredUtilizers$: Observable<any[]>;

  private utilizersSubject = new BehaviorSubject<any[]>([]);

  constructor(
    private fb: FormBuilder,
    protected langService: LangService,
    protected utilsService: UtilsService,
    public dialog: MatDialog,
    private crudService: ApiCrudService
  ) { }

  ngOnInit(): void {
    this.utilizers = this.buildUtilizerList();
    this.utilizersSubject.next(this.utilizers);

    const initialUtilizers = this.extractInitialUtilizers();
    this.selectedUtilizers = initialUtilizers.filter((utilizer) =>
      this.utilizers.some(validUtilizer => validUtilizer?.id === utilizer?.id)
    );

    if (initialUtilizers.length !== this.selectedUtilizers.length && initialUtilizers.length > 0) {
      console.warn('Se filtraron utilizers que no pertenecen al cliente principal');
    }

    const controls = this.selectedUtilizers.map(utilizer => this.fb.control(utilizer));
    this.stepForm = this.fb.group({
      utilizers: this.fb.array(controls, Validators.required),
    });

    this.filteredUtilizers$ = combineLatest([
      this.utilizersSubject.asObservable(),
      this.searchControl.valueChanges.pipe(startWith(''), debounceTime(200), distinctUntilChanged())
    ]).pipe(
      map(([utilizers, term]) => this.filterUtilizers(utilizers, term))
    );
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

  onCheckboxChange(event: any) {
    const checkArray: FormArray = this.stepForm.get("utilizers") as FormArray;

    if (event.checked) {
      if (!checkArray.controls.some(ctrl => ctrl.value.id === event.source.value.id)) {
        checkArray.push(this.fb.control(event.source.value));
      }
    } else {
      const index = checkArray.controls.findIndex(control => control.value === event.source.value);
      if (index !== -1) {
        checkArray.removeAt(index);
      }
    }
  }

  isChecked(utilizer: any) {
    const currentUtilizers = (this.stepForm.get("utilizers") as FormArray).value as any[];
    return currentUtilizers.some(u => u.id === utilizer.id);
  }

  clearSearch(): void {
    if (this.searchControl.value) {
      this.searchControl.setValue('', { emitEvent: true });
    }
  }

  openBookingDialog() {
    const dialogRef = this.dialog.open(CreateUserDialogComponent, {
      width: "670px",
      panelClass: "",
      data: {
        utilizers: this.utilizers,
      },
    });

    dialogRef.afterClosed().subscribe((data: any) => {
      if (data?.action === 'new') {
        const payload = {
          email: this.client.email,
          first_name: data.data.name,
          last_name: data.data.surname,
          birth_date: moment(data.data.birthDate).format('DD.MM.yyyy'),
          phone: this.client.phone,
          telephone: this.client.telephone,
          address: this.client.address,
          cp: this.client.cp,
          city: this.client.city,
          province: this.client.province,
          country: this.client.country,
          image: null,
          language1_id: data.data.lenguages[0]?.id,
          language2_id: data.data.lenguages[1]?.id,
          language3_id: data.data.lenguages[2]?.id,
          language4_id: data.data.lenguages[3]?.id,
          language5_id: data.data.lenguages[4]?.id,
          language6_id: data.data.lenguages[5]?.id,
          station_id: this.client.station_id
        };

        this.crudService.create('/clients', payload)
          .subscribe((clientCreated: any) => {
            const newUtilizer = {
              ...clientCreated.data,
              client_sports: [],
              main_client: this.client
            };

            this.crudService.create('/clients-utilizers', {
              client_id: newUtilizer.id,
              main_id: this.client.id
            }).subscribe(() => {
              this.client.utilizers = [...(this.client.utilizers || []), newUtilizer];
              this.utilizers = this.buildUtilizerList();
              this.utilizersSubject.next(this.utilizers);
              this.addUtilizerControl(newUtilizer);
              this.searchControl.setValue('', { emitEvent: true });
            });
          });
      }
    });
  }

  private extractInitialUtilizers(): any[] {
    if (!this.initialData) {
      return [];
    }

    if (Array.isArray(this.initialData)) {
      return this.initialData as any[];
    }

    if (Array.isArray(this.initialData?.utilizers)) {
      return this.initialData.utilizers;
    }

    return this.initialData?.utilizers ? [this.initialData.utilizers] : [];
  }

  private buildUtilizerList(): any[] {
    if (!this.client) {
      return [];
    }

    const clientUtilizers = Array.isArray(this.client.utilizers) ? this.client.utilizers : [];
    const ordered = [this.client, ...clientUtilizers];
    const unique = new Map<number, any>();
    ordered.forEach(utilizer => {
      if (utilizer?.id != null) {
        unique.set(utilizer.id, utilizer);
      }
    });

    const result = Array.from(unique.values()).sort((a, b) => {
      if (a.id === this.client.id) return -1;
      if (b.id === this.client.id) return 1;
      const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
      const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
    });

    return result;
  }

  private filterUtilizers(utilizers: any[], term: string): any[] {
    const normalized = (term || '').toString().trim().toLowerCase();
    if (!normalized) {
      return utilizers;
    }

    return utilizers.filter(utilizer => {
      const fullName = `${utilizer.first_name || ''} ${utilizer.last_name || ''}`.toLowerCase();
      const email = (utilizer.email || '').toLowerCase();
      const language = this.langService.getLanguage(utilizer.language1_id)?.toLowerCase() || '';
      return fullName.includes(normalized) ||
        email.includes(normalized) ||
        language.includes(normalized);
    });
  }

  private addUtilizerControl(utilizer: any): void {
    const checkArray: FormArray = this.stepForm.get("utilizers") as FormArray;
    if (!checkArray.controls.some(ctrl => ctrl.value.id === utilizer.id)) {
      checkArray.push(this.fb.control(utilizer));
    }
  }
}
