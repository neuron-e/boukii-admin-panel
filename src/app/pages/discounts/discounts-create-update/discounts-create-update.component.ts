import { Component, OnInit, ViewChild, ElementRef, Optional, Inject } from '@angular/core';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { debounceTime, startWith, switchMap } from 'rxjs/operators';
import { COMMA, ENTER } from '@angular/cdk/keycodes';

import { ApiCrudService } from 'src/service/crud.service';
import { fadeInUp400ms } from 'src/@vex/animations/fade-in-up.animation';
import { stagger20ms } from 'src/@vex/animations/stagger.animation';
import { TranslateService } from '@ngx-translate/core';
import { SchoolService } from 'src/service/school.service';

function discountValueValidator(control: AbstractControl): ValidationErrors | null {
  const formGroup = control.parent;
  if (!formGroup) {
    return null;
  }

  const discountType = formGroup.get('discount_type')?.value;
  const discountValue = control.value;

  if (discountValue === null || discountValue === undefined || discountValue === '') {
    return null;
  }

  const numValue = Number(discountValue);

  if (discountType === 'percentage') {
    if (numValue < 0 || numValue > 100) {
      return { percentageRange: true };
    }
  } else if (discountType === 'fixed_amount') {
    if (numValue <= 0) {
      return { minValue: true };
    }
  }

  return null;
}

function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const formGroup = control.parent;
  if (!formGroup) {
    return null;
  }

  const validFrom = formGroup.get('valid_from')?.value;
  const validUntil = control.value;

  if (validFrom && validUntil) {
    const fromDate = new Date(validFrom);
    const untilDate = new Date(validUntil);

    if (fromDate > untilDate) {
      return { dateRange: true };
    }
  }

  return null;
}

@Component({
  selector: 'vex-discounts-create-update',
  templateUrl: './discounts-create-update.component.html',
  styleUrls: ['./discounts-create-update.component.scss'],
  animations: [fadeInUp400ms, stagger20ms]
})
export class DiscountsCreateUpdateComponent implements OnInit {
  mode: 'create' | 'update' = 'create';

  defaults: any = {
    code: null,
    name: null,
    description: null,
    discount_type: 'percentage',
    discount_value: null,
    min_booking_amount: null,
    max_discount_amount: null,
    applicable_to: 'all',
    course_ids: [],
    client_ids: [],
    valid_from: null,
    valid_until: null,
    max_uses: null,
    max_uses_per_client: null,
    current_uses: 0,
    is_active: true,
    school_id: null
  };

  user: any;
  loading = true;
  form: UntypedFormGroup;
  id: number | null = null;

  courseCtrl = new FormControl('');
  filteredCourses$: Observable<any[]>;
  selectedCourses: any[] = [];
  allCourses: any[] = [];

  clientCtrl = new FormControl('');
  filteredClients$: Observable<any[]>;
  selectedClients: any[] = [];
  allClients: any[] = [];

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];

  private lastCourseSearch = '';
  private lastClientSearch = '';
  currencyCode: string;

  @ViewChild('courseInput') courseInput: ElementRef<HTMLInputElement>;
  @ViewChild('clientInput') clientInput: ElementRef<HTMLInputElement>;

  constructor(
    private fb: UntypedFormBuilder,
    private crudService: ApiCrudService,
    private snackbar: MatSnackBar,
    private router: Router,
    private translateService: TranslateService,
    private schoolService: SchoolService,
    @Optional() public dialogRef: MatDialogRef<DiscountsCreateUpdateComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
    this.mode = data?.mode || 'create';
    this.id = data?.id ?? null;
    this.currencyCode = this.getDefaultCurrency();

    this.form = this.fb.group({
      code: [null, Validators.required],
      name: [null, [Validators.maxLength(255)]],
      description: [null],
      discount_type: ['percentage', Validators.required],
      discount_value: [null, [Validators.required, discountValueValidator]],
      min_booking_amount: [null],
      max_discount_amount: [null],
      applicable_to: ['all', Validators.required],
      valid_from: [null],
      valid_until: [null, dateRangeValidator],
      max_uses: [null, Validators.min(1)],
      max_uses_per_client: [null, Validators.min(1)],
      is_stackable: [false],
      is_active: [true]
    });
  }

  ngOnInit(): void {
    this.loadCurrency();
    this.setupFilters();
    this.loadCourses();
    this.loadClients();

    if (this.mode === 'update' && this.id) {
      this.getDiscountCode();
    } else {
      this.loading = false;
    }
  }

  private setupFilters(): void {
    this.form.get('valid_from')?.valueChanges.subscribe(() => {
      this.form.get('valid_until')?.updateValueAndValidity();
    });

    this.form.get('applicable_to')?.valueChanges.subscribe(value => {
      if (value !== 'specific_courses') {
        this.selectedCourses = [];
      }
      if (value !== 'specific_clients') {
        this.selectedClients = [];
      }
    });

    this.filteredCourses$ = this.courseCtrl.valueChanges.pipe(
      startWith(''),
      debounceTime(250),
      switchMap(value => {
        const term = typeof value === 'string' ? value.toLowerCase() : '';
        if (term.length >= 3 && term !== this.lastCourseSearch) {
          this.loadCourses(term);
        }
        return typeof value === 'string' ? this.filterCourses(term) : of([]);
      })
    );

    this.filteredClients$ = this.clientCtrl.valueChanges.pipe(
      startWith(''),
      debounceTime(250),
      switchMap(value => {
        const term = typeof value === 'string' ? value.toLowerCase() : '';
        if (term.length >= 3 && term !== this.lastClientSearch) {
          this.loadClients(term);
        }
        return typeof value === 'string' ? this.filterClients(term) : of([]);
      })
    );
  }

  private loadCurrency(): void {
    this.schoolService.getSchoolData().subscribe({
      next: (response: any) => {
        const settings = this.parseSettingsPayload(response?.data?.settings ?? response?.settings);
        const currency = this.resolveCurrencyCandidate(
          response?.data?.taxes?.currency,
          response?.data?.currency,
          response?.currency,
          settings?.taxes?.currency,
          this.user?.schools?.[0]?.taxes?.currency,
          this.user?.schools?.[0]?.currency
        );
        this.currencyCode = currency || this.currencyCode;
      },
      error: () => {
        this.currencyCode = this.getDefaultCurrency();
      }
    });
  }

  private loadCourses(searchTerm: string = ''): void {
    this.lastCourseSearch = searchTerm;
    this.crudService.list('/courses', 1, 100, 'asc', 'name', searchTerm).subscribe({
      next: (res: any) => {
        const schoolId = this.user?.schools?.[0]?.id;
        const data = Array.isArray(res?.data) ? res.data : [];
        this.allCourses = schoolId ? data.filter(course => course.school_id === schoolId) : data;
        this.syncSelectedCourses();
      },
      error: (err) => {
        console.error('Error loading courses:', err);
        this.allCourses = [];
      }
    });
  }

  private loadClients(searchTerm: string = ''): void {
    this.lastClientSearch = searchTerm;
    this.crudService.list('/clients', 1, 100, 'asc', 'first_name', searchTerm).subscribe({
      next: (res: any) => {
        this.allClients = Array.isArray(res?.data) ? res.data : [];
        this.syncSelectedClients();
      },
      error: (err) => {
        console.error('Error loading clients:', err);
        this.allClients = [];
      }
    });
  }

  private filterCourses(value: string): Observable<any[]> {
    const lower = value.toLowerCase();
    const result = this.allCourses.filter(course => {
      if (this.selectedCourses.some(selected => selected.id === course.id)) {
        return false;
      }
      const name = (course.name || course.code || '').toLowerCase();
      return name.includes(lower);
    });
    return of(result);
  }

  private filterClients(value: string): Observable<any[]> {
    const lower = value.toLowerCase();
    const result = this.allClients.filter(client => {
      if (this.selectedClients.some(selected => selected.id === client.id)) {
        return false;
      }
      const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim().toLowerCase();
      const email = (client.email || '').toLowerCase();
      return fullName.includes(lower) || email.includes(lower);
    });
    return of(result);
  }

  selectedCourse(event: MatAutocompleteSelectedEvent): void {
    const course = event.option.value;
    if (course && !this.selectedCourses.some(c => c.id === course.id)) {
      this.selectedCourses.push(course);
    }
    if (this.courseInput?.nativeElement) {
      this.courseInput.nativeElement.value = '';
    }
    this.courseCtrl.setValue('');
  }

  removeCourse(course: any): void {
    this.selectedCourses = this.selectedCourses.filter(c => c.id !== course.id);
  }

  selectedClient(event: MatAutocompleteSelectedEvent): void {
    const client = event.option.value;
    if (client && !this.selectedClients.some(c => c.id === client.id)) {
      this.selectedClients.push(client);
    }
    if (this.clientInput?.nativeElement) {
      this.clientInput.nativeElement.value = '';
    }
    this.clientCtrl.setValue('');
  }

  removeClient(client: any): void {
    this.selectedClients = this.selectedClients.filter(c => c.id !== client.id);
  }

  displayCourseFn(course: any): string {
    return course ? (course.name || course.code || '') : '';
  }

  displayClientFn(client: any): string {
    if (!client) {
      return '';
    }
    const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim();
    return fullName || client.email || '';
  }

  save(): void {
    if (this.form.invalid) {
      this.snackbar.open(this.translateService.instant('error.form_invalid'), 'OK', { duration: 3000 });
      return;
    }

    if (this.mode === 'create') {
      this.create();
    } else {
      this.update();
    }
  }

  private create(): void {
    const payload = this.buildPayload();
    this.crudService.create('/discount-codes', payload).subscribe({
      next: (res) => {
        this.snackbar.open(this.translateService.instant('snackbar.discount.create'), 'OK', { duration: 3000 });
        this.closeAfterPersist(res);
      },
      error: (err) => this.handleError(err, 'error.create_failed')
    });
  }

  private update(): void {
    if (!this.id) {
      return;
    }
    const payload = this.buildPayload();
    this.crudService.update('/discount-codes', payload, this.id).subscribe({
      next: (res) => {
        this.snackbar.open(this.translateService.instant('snackbar.discount.update'), 'OK', { duration: 3000 });
        this.closeAfterPersist(res);
      },
      error: (err) => this.handleError(err, 'error.update_failed')
    });
  }

  private buildPayload(): any {
    const raw = this.form.value;
    const courseIds = this.showCourseSelection ? this.selectedCourses.map(course => course.id) : [];
    const clientIds = this.showClientSelection ? this.selectedClients.map(client => client.id) : [];

    const payload: any = {
      code: raw.code?.trim(),
      name: raw.name?.trim() || null,
      description: raw.description?.trim() || null,
      discount_type: raw.discount_type,
      discount_value: Number(raw.discount_value),
      min_purchase_amount: raw.min_booking_amount !== null && raw.min_booking_amount !== '' ? Number(raw.min_booking_amount) : null,
      max_discount_amount: raw.max_discount_amount !== null && raw.max_discount_amount !== '' ? Number(raw.max_discount_amount) : null,
      applicable_to: raw.applicable_to,
      course_ids: courseIds,
      client_ids: clientIds,
      valid_from: this.serializeDate(raw.valid_from),
      valid_to: this.serializeDate(raw.valid_until),
      total: raw.max_uses ? Number(raw.max_uses) : null,
      max_uses_per_user: raw.max_uses_per_client ? Number(raw.max_uses_per_client) : null,
      is_stackable: raw.is_stackable || false,
      is_active: raw.is_active,
      school_id: this.user?.schools?.[0]?.id ?? null
    };

    if (!payload.school_id) {
      delete payload.school_id;
    }

    if (!payload.total) {
      delete payload.total;
    } else if (!this.id) {
      payload.remaining = payload.total;
    }

    if (!payload.max_uses_per_user) {
      delete payload.max_uses_per_user;
    }

    return payload;
  }

  private closeAfterPersist(result?: any): void {
    if (this.dialogRef) {
      this.dialogRef.close(result || true);
    } else {
      this.navigateToList();
    }
  }

  private serializeDate(value: any): string | null {
    if (!value) {
      return null;
    }
    if (typeof value === 'string') {
      return value;
    }
    try {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      return date.toISOString().slice(0, 19).replace('T', ' ');
    } catch (e) {
      return null;
    }
  }

  private handleError(err: any, translationKey: string): void {
    console.error('Discount code error:', err);
    const errorMsg = err?.error?.message || this.translateService.instant(translationKey);
    this.snackbar.open(errorMsg, 'OK', { duration: 5000 });
  }

  generateRandomCode(): void {
    this.form.patchValue({ code: `DISC-${Math.floor(Math.random() * 90000000) + 10000000}` });
  }

  close(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.navigateToList();
    }
  }

  getDiscountCode(): void {
    this.crudService.get('/discount-codes/' + this.id).subscribe({
      next: (response: any) => {
        const discount = response?.data;
        if (!discount) {
          this.loading = false;
          return;
        }

        this.defaults = {
          ...this.defaults,
          ...discount,
          max_uses: discount.total ?? null,
          max_uses_per_client: discount.max_uses_per_user ?? null,
          current_uses: this.computeCurrentUses(discount)
        };

        this.form.patchValue({
          code: discount.code,
          name: discount.name,
          description: discount.description,
          discount_type: discount.discount_type || 'percentage',
          discount_value: discount.discount_value,
          min_booking_amount: discount.min_purchase_amount,
          max_discount_amount: discount.max_discount_amount,
          applicable_to: discount.applicable_to || 'all',
          valid_from: discount.valid_from,
          valid_until: discount.valid_to,
          max_uses: discount.total,
          max_uses_per_client: discount.max_uses_per_user,
          is_stackable: discount.is_stackable || false,
          is_active: discount.active !== false
        });

        this.setSelectedCourses(discount);
        this.setSelectedClients(discount);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading discount code:', err);
        this.snackbar.open(this.translateService.instant('error.load_failed'), 'OK', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  private computeCurrentUses(discount: any): number {
    if (discount?.total === null || discount?.total === undefined || discount?.remaining === null || discount?.remaining === undefined) {
      return 0;
    }
    return Number(discount.total) - Number(discount.remaining);
  }

  private setSelectedCourses(discount: any): void {
    if (Array.isArray(discount?.courses) && discount.courses.length) {
      this.selectedCourses = discount.courses;
    } else if (Array.isArray(discount?.course_ids)) {
      this.selectedCourses = discount.course_ids.map((id: number) => this.lookupCourse(id));
    } else {
      this.selectedCourses = [];
    }
    this.syncSelectedCourses();
  }

  private setSelectedClients(discount: any): void {
    if (Array.isArray(discount?.clients) && discount.clients.length) {
      this.selectedClients = discount.clients;
    } else if (Array.isArray(discount?.client_ids)) {
      this.selectedClients = discount.client_ids.map((id: number) => this.lookupClient(id));
    } else {
      this.selectedClients = [];
    }
    this.syncSelectedClients();
  }

  private syncSelectedCourses(): void {
    if (!this.selectedCourses.length && !Array.isArray(this.defaults?.course_ids)) {
      return;
    }
    const merged = [...this.selectedCourses];
    const courseIds = Array.isArray(this.defaults?.course_ids) ? this.defaults.course_ids : [];
    courseIds.forEach((id: number) => {
      if (!merged.some(c => c.id === id)) {
        merged.push(this.lookupCourse(id));
      }
    });
    this.selectedCourses = this.uniqueById(merged);
  }

  private syncSelectedClients(): void {
    if (!this.selectedClients.length && !Array.isArray(this.defaults?.client_ids)) {
      return;
    }
    const merged = [...this.selectedClients];
    const clientIds = Array.isArray(this.defaults?.client_ids) ? this.defaults.client_ids : [];
    clientIds.forEach((id: number) => {
      if (!merged.some(c => c.id === id)) {
        merged.push(this.lookupClient(id));
      }
    });
    this.selectedClients = this.uniqueById(merged);
  }

  private uniqueById(list: any[]): any[] {
    const seen = new Set<number>();
    const unique: any[] = [];
    list.forEach(item => {
      if (item && typeof item.id === 'number' && !seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    });
    return unique;
  }

  private lookupCourse(id: number): any {
    return this.allCourses.find(course => course.id === id) || { id, name: `#${id}` };
  }

  private lookupClient(id: number): any {
    return this.allClients.find(client => client.id === id) || { id, first_name: `#${id}` };
  }

  get showCourseSelection(): boolean {
    return this.form.get('applicable_to')?.value === 'specific_courses';
  }

  get showClientSelection(): boolean {
    return this.form.get('applicable_to')?.value === 'specific_clients';
  }

  getDiscountValueError(): string {
    const control = this.form.get('discount_value');
    if (control?.hasError('required')) {
      return this.translateService.instant('error.required');
    }
    if (control?.hasError('percentageRange')) {
      return this.translateService.instant('error.percentage_range');
    }
    if (control?.hasError('minValue')) {
      return this.translateService.instant('error.min_value');
    }
    return '';
  }

  getDateRangeError(): string {
    const control = this.form.get('valid_until');
    if (control?.hasError('dateRange')) {
      return this.translateService.instant('error.date_range');
    }
    return '';
  }

  navigateToList(): void {
    this.router.navigate(['/vouchers'], { queryParams: { tab: 'discounts' } });
  }

  private parseSettingsPayload(raw: any): any {
    if (!raw) {
      return null;
    }
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    if (typeof raw === 'object') {
      return raw;
    }
    return null;
  }

  private resolveCurrencyCandidate(...candidates: Array<string | null | undefined>): string | null {
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length) {
        return candidate;
      }
    }
    return null;
  }

  private getDefaultCurrency(): string {
    return (
      this.resolveCurrencyCandidate(
        this.user?.schools?.[0]?.taxes?.currency,
        this.user?.schools?.[0]?.currency
      ) || 'EUR'
    );
  }
}
