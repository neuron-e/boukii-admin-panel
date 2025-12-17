import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatStepper } from '@angular/material/stepper';
import { _MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { Observable, forkJoin, map, startWith, switchMap, tap } from 'rxjs';
import { fadeInUp400ms } from 'src/@vex/animations/fade-in-up.animation';
import { stagger20ms } from 'src/@vex/animations/stagger.animation';
import { MOCK_COUNTRIES } from 'src/app/static-data/countries-data';
import { MOCK_LANGS } from 'src/app/static-data/language-data';
import { LEVELS } from 'src/app/static-data/level-data';
import { MOCK_PROVINCES } from 'src/app/static-data/province-data';
import { MOCK_SPORT_DATA } from 'src/app/static-data/sports-data';
import { ApiCrudService } from 'src/service/crud.service';
import { DateAdapter } from '@angular/material/core';

@Component({
  selector: 'vex-client-create-update',
  templateUrl: './client-create-update.component.html',
  styleUrls: ['./client-create-update.component.scss'],
  animations: [fadeInUp400ms, stagger20ms]

})
export class ClientCreateUpdateComponent implements OnInit {

  displayedColumns: string[] = ['name', 'date'];
  maxSelection = 6;
  imagePreviewUrl: string | ArrayBuffer;
  formInfoAccount: UntypedFormGroup;
  formPersonalInfo: UntypedFormGroup;
  formSportInfo: UntypedFormGroup;
  myControlStations = new FormControl();
  myControlCountries = new FormControl();
  myControlProvinces = new FormControl();
  levelForm = new FormControl();

  filteredStations: Observable<any[]>;
  filteredCountries: Observable<any[]>;
  filteredProvinces: Observable<any[]>;
  filteredLevel: Observable<any[]>;

  sportsControl = new FormControl();
  selectedSports: any[] = [];
  filteredSports: Observable<any[]>;
  schoolSports: any[] = [];
  sportsData = new _MatTableDataSource([]);

  languagesControl = new FormControl([]);
  languages = [];
  filteredLanguages: Observable<any[]>;
  selectedLanguages = [];

  stations = [];

  today: Date;
  minDate: Date;

  mockCivilStatus: string[] = ['Single', 'MariÃ©e', 'Veuf', 'DivorcÃ©'];
  mockCountriesData = MOCK_COUNTRIES;
  mockProvincesData = MOCK_PROVINCES;
  mockLevelData = LEVELS;

  defaults = {
    email: null,
    first_name: null,
    last_name: null,
    birth_date: null,
    phone: null,
    telephone: null,
    address: null,
    cp: null,
    city: null,
    province: null,
    country: null,
    image: null,
    language1_id: null,
    language2_id: null,
    language3_id: null,
    language4_id: null,
    language5_id: null,
    language6_id: null,
    user_id: null,
    station_id: null,
    accepts_newsletter: false,
    is_vip: false
  }

  defaultsObservations = {
    general: null,
    notes: null,
    historical: null,
    client_id: null,
    school_id: null
  }

  defaultsUser = {
    username: null,
    email: null,
    password: null,
    image: null,
    type: 'client',
    active: false,
  }

  loading: boolean = true;
  user: any;
  mode: 'create' | 'update' = 'create';
  schoolNewsletterSubscription: boolean = false;
  schoolVip: boolean = false;

  constructor(private fb: UntypedFormBuilder, private cdr: ChangeDetectorRef, private translateService: TranslateService,
    private crudService: ApiCrudService, private router: Router, private snackbar: MatSnackBar,
    private dateAdapter: DateAdapter<Date>) {
    this.dateAdapter.setLocale(this.translateService.getDefaultLang());
    this.dateAdapter.getFirstDayOfWeek = () => { return 1; }
    this.today = new Date();
    this.minDate = new Date(this.today);
    this.minDate.setFullYear(this.today.getFullYear() - 18);
  }

  ngOnInit(): void {

    this.user = JSON.parse(localStorage.getItem('boukiiUser'));

    this.formInfoAccount = this.fb.group({
      image: [''],
      name: ['', Validators.required],
      surname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['']

    });

    this.formPersonalInfo = this.fb.group({
      fromDate: ['', Validators.required],
      phone: [''],
      mobile: ['', Validators.required],
      address: [''],
      postalCode: [''],
      country: this.myControlCountries,
      province: this.myControlProvinces

    });

    this.formSportInfo = this.fb.group({
      sportName: [''],
      summary: [''],
      notes: [''],
      hitorical: ['']
    });

    this.filteredCountries = this.myControlCountries.valueChanges.pipe(
      startWith(''),
      map(value => typeof value === 'string' ? value : value.name),
      map(name => name ? this._filterCountries(name) : this.mockCountriesData.slice())
    );

    this.myControlCountries.valueChanges.subscribe(country => {
      this.myControlProvinces.setValue('');  // Limpia la selecciÃ³n anterior de la provincia
      this.filteredProvinces = this._filterProvinces(country.id);
    });

    this.filteredSports = this.sportsControl.valueChanges.pipe(
      startWith(''),
      map((sport: string | null) => sport ? this._filterSports(sport) : this.schoolSports.slice())
    );

    this.filteredLevel = this.levelForm.valueChanges.pipe(
      startWith(''),
      map((value: any) => typeof value === 'string' ? value : value?.annotation),
      map(annotation => annotation ? this._filterLevel(annotation) : this.mockLevelData.slice())
    );

    this.filteredLanguages = this.languagesControl.valueChanges.pipe(
      startWith(''),
      map(language => (language ? this._filterLanguages(language) : this.languages.slice()))
    );

    this.formPersonalInfo.get('fromDate')?.valueChanges.subscribe(date => {
      this.defaults.birth_date = date;
      this.applyAgeFilterToSports();
    });


    this.getSchoolSportDegrees();
    this.getLanguages();

    setTimeout(() => {
      this.getSports();
      this.loading = false;

    }, 500);
  }



  passwordValidator(formControl: FormControl) {
    const { value } = formControl;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);

    if (hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar) {
      return null;
    } else {
      return { passwordStrength: true };
    }
  }

  private _filterStations(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.stations.filter(option => option.name.toLowerCase().includes(filterValue));
  }

  /**Countries */

  private _filterCountries(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.mockCountriesData.filter(country => country.name.toLowerCase().includes(filterValue));
  }

  private _filterProvinces(countryId: number): Observable<any[]> {
    return this.myControlProvinces.valueChanges.pipe(
      startWith(''),
      map(value => typeof value === 'string' ? value : value.name),
      map(name => name ? this._filter(name, countryId) : this.mockProvincesData.filter(p => p.country_id === countryId).slice())
    );
  }

  private _filter(name: string, countryId: number): any[] {
    const filterValue = name.toLowerCase();
    return this.mockProvincesData.filter(province => province.country_id === countryId && province.name.toLowerCase().includes(filterValue));
  }

  private _filterSports(value: any): any[] {
    const rawValue = typeof value === 'string' ? value : value?.name;
    const filterValue = rawValue ? rawValue.toLowerCase() : '';
    return this.schoolSports.filter(sport => sport?.name?.toLowerCase().indexOf(filterValue) === 0);
  }

  private _filterLevel(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.mockLevelData.filter(level => level.annotation.toLowerCase().includes(filterValue));
  }

  private _filterLanguages(value: any): any[] {
    const rawValue = typeof value === 'string' ? value : value?.name;
    const filterValue = rawValue ? rawValue.toLowerCase() : '';
    return this.languages.filter(language => language?.name?.toLowerCase().includes(filterValue));
  }

  displayFnCountry(country: any): string {
    return country && country.name ? country.name : '';
  }

  displayFnProvince(province: any): string {
    return province && province.name ? province.name : '';
  }

  displayFnLevel(level: any): string {
    return level && level?.name && level?.annotation ? level?.name + ' - ' + level?.annotation : level?.name;
  }

  updateSelectedSports(selected: any[]) {
    this.selectedSports = selected.map(sport => ({
      sportName: sport.name,
      sportId: sport.id,
      level: null
    }));
  }

  toggleSelection(sport: any): void {
    const index = this.selectedSports.findIndex(s => s.sport_id === sport.id);
    if (index >= 0) {
      this.selectedSports.splice(index, 1);
    } else {
      this.selectedSports.push(sport);
    }

    // Crear una nueva referencia para el array
    this.selectedSports = [...this.selectedSports];

    // Actualizar los datos de la tabla
    this.sportsData.data = this.selectedSports;

    // Detectar cambios manualmente para asegurarse de que Angular reconozca los cambios
    this.cdr.detectChanges();

  }

  getSelectedSportsNames(): string {
    return this.sportsControl.value?.map(sport => sport.name).join(', ') || '';
  }

  toggleSelectionLanguages(language: any): void {
    if (this.selectedLanguages.length < this.maxSelection) {

      const index = this.selectedLanguages.findIndex(l => l.code === language.code);
      if (index >= 0) {
        this.selectedLanguages.splice(index, 1);
      } else {
        this.selectedLanguages.push({ id: language.id, name: language.name, code: language.code });
      }
    } else {
      this.snackbar.open(this.translateService.instant('snackbar.admin.langs'), 'OK', { duration: 3000 });
    }
  }

  getSelectedLanguageNames(): string {
    return this.selectedLanguages.map(language => language.name).join(', ');
  }

  getStations() {
    this.crudService.list('/stations-schools', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id)
      .subscribe((station) => {
        station.data.forEach(element => {
          this.crudService.get('/stations/' + element.station_id)
            .subscribe((data) => {
              this.stations.push(data.data);
              this.loading = false;

            })
        });
      })
  }

  calculateAge(birthDateString) {
    if (!birthDateString) {
      return null;
    }
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  getSchoolSportDegrees() {
    this.crudService.list('/school-sports', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id)
      .subscribe((sport) => {
        this.schoolSports = sport.data.map((item: any) => ({
          ...item,
          allDegrees: [],
          degrees: item.degrees ?? []
        }));
        this.sportsControl.setValue(this.sportsControl.value, { emitEvent: true });

        this.schoolSports.forEach((element, idx) => {
          this.crudService.list('/degrees', 1, 10000, 'asc', 'degree_order', '&school_id=' + this.user.schools[0].id + '&sport_id=' + element.sport_id)
            .subscribe((data) => {
              this.schoolSports[idx].allDegrees = data.data;
              this.schoolSports[idx].degrees = this.filterDegreesForCurrentAge(data.data);
              this.refreshSelectedSportsDegrees(this.schoolSports[idx]);
            });
        });
      })
  }

  getSports() {
    this.crudService.list('/sports', 1, 1000)
      .subscribe((data) => {
        data.data.forEach(element => {
          this.schoolSports.forEach(sport => {
            if (element.id === sport.sport_id) {
              sport.name = element.name;
            }
          });
        });
      })
  }

  getLanguages() {
    this.crudService.list('/languages', 1, 1000)
      .subscribe((data) => {
        this.languages = data.data.reverse();
        const currentValue = this.languagesControl.value;
        const nextValue = Array.isArray(currentValue) ? [...currentValue] : currentValue;
        this.languagesControl.setValue(nextValue, { emitEvent: true });
      })
  }

  save() {

    if (this.mode === 'create') {
      this.create();
    } else if (this.mode === 'update') {
      this.update();
    }
  }
  formatDate = (date: Date): string => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  create() {
    this.loading = true;
    this.preparePayloads();

    this.crudService.create('/users', this.defaultsUser).pipe(
      switchMap((user) => {
        this.defaults.user_id = user.data.id;
        return this.crudService.create('/clients', this.defaults);
      }),
      switchMap((client) => {
        this.snackbar.open(this.translateService.instant('snackbar.client.create'), 'OK', { duration: 3000 });
        const clientId = client.data.id;
        const schoolId = this.user?.schools?.[0]?.id;
        this.defaultsObservations.client_id = clientId;
        this.defaultsObservations.school_id = schoolId;

        const sportsPayloads = this.sportsData.data
          .filter((element: any) => element?.level?.id)
          .map(element => ({
            client_id: clientId,
            sport_id: element.sport_id,
            degree_id: element.level.id,
            school_id: schoolId
          }));

        const dependentRequests = [
          this.crudService.create('/client-observations', this.defaultsObservations),
          this.crudService.create('/clients-schools', {
            client_id: clientId,
            school_id: schoolId,
            accepted_at: moment().toDate(),
            accepts_newsletter: this.schoolNewsletterSubscription,
            is_vip: this.schoolVip
          }),
          ...sportsPayloads.map(payload => this.crudService.create('/client-sports', payload))
        ];

        return forkJoin(dependentRequests).pipe(
          tap(() => {
            this.loading = false;
            setTimeout(() => {
              this.router.navigate(['/clients']);
            }, 500);
          })
        );
      })
    ).subscribe({
      error: (error) => this.handleCreateError(error)
    });
  }

  update() { }

  setLanguages() {
    if (this.selectedLanguages.length >= 1) {

      this.defaults.language1_id = this.selectedLanguages[0].id;
    } if (this.selectedLanguages.length >= 2) {

      this.defaults.language2_id = this.selectedLanguages[1].id;
    } if (this.selectedLanguages.length >= 3) {

      this.defaults.language3_id = this.selectedLanguages[2].id;
    } if (this.selectedLanguages.length >= 4) {

      this.defaults.language4_id = this.selectedLanguages[3].id;
    } if (this.selectedLanguages.length >= 5) {

      this.defaults.language5_id = this.selectedLanguages[4].id;
    } if (this.selectedLanguages.length === 6) {

      this.defaults.language6_id = this.selectedLanguages[5].id;
    }
  }

  goTo(route: string) {
    this.router.navigate([route]);
  }

  goToStep3(stepper: MatStepper) {
    if (this.selectedLanguages.length === 0) {
      this.snackbar.open(this.translateService.instant('snackbar.client.mandatory_language'), 'OK', { duration: 3000 });
      return;
    }

    stepper.next();
  }

  private preparePayloads() {
    const accountValues = this.formInfoAccount.value;
    const personalValues = this.formPersonalInfo.value;

    this.defaults.first_name = accountValues?.name;
    this.defaults.last_name = accountValues?.surname;
    this.defaults.email = accountValues?.email;
    this.defaultsUser.username = accountValues?.username;
    this.defaultsUser.email = accountValues?.email;
    this.defaultsUser.image = this.imagePreviewUrl;
    this.defaults.image = this.imagePreviewUrl;
    this.defaults.phone = personalValues?.phone;
    this.defaults.telephone = personalValues?.mobile;
    this.defaults.address = personalValues?.address;
    this.defaults.cp = personalValues?.postalCode;
    this.defaults.birth_date = personalValues?.fromDate;
    this.defaults.accepts_newsletter = this.schoolNewsletterSubscription;
    if ((this.defaults as any).hasOwnProperty('is_vip')) {
      delete (this.defaults as any).is_vip;
    }
    this.setLanguages();
  }

  private handleCreateError(error: any) {
    this.loading = false;
    let message = 'Error creating client';
    if (error?.status === 422 && error?.error?.errors) {
      const backendErrors:any = Object.values(error.error.errors as any).reduce((acc: string[], current: any) => {
        if (Array.isArray(current)) {
          acc.push(...current);
        } else if (current) {
          acc.push(current);
        }
        return acc;
      }, []);
      if (backendErrors.length) {
        message = backendErrors.join('\n');
      }
    } else if (error?.error?.message) {
      message = error.error.message;
    }
    this.snackbar.open(message, 'OK', { duration: 5000 });
  }

  private filterDegreesForCurrentAge(levels: any[]): any[] {
    if (!Array.isArray(levels)) {
      return [];
    }
    const birthDate = this.formPersonalInfo.get('fromDate')?.value || this.defaults.birth_date;
    if (!birthDate) {
      return [...levels];
    }
    const age = this.calculateAge(birthDate);
    if (age === null || age === undefined) {
      return [...levels];
    }
    return levels.filter(level => {
      const min = level.age_min ?? 1;
      const max = level.age_max ?? 99;
      return age >= min && age <= max;
    });
  }

  private applyAgeFilterToSports() {
    if (!this.schoolSports?.length) {
      return;
    }
    this.schoolSports.forEach((sport) => {
      const baseDegrees = sport.allDegrees ?? sport.degrees ?? [];
      sport.degrees = this.filterDegreesForCurrentAge(baseDegrees);
    });
    this.refreshSelectedSportsDegrees();
  }

  private refreshSelectedSportsDegrees(targetSport?: any) {
    if (!this.selectedSports.length || !this.schoolSports?.length) {
      return;
    }
    const matchId = (sport: any) => sport?.sport_id ?? sport?.id;
    this.selectedSports = this.selectedSports.map(selected => {
      const currentId = matchId(selected);
      const updated = targetSport && matchId(targetSport) === currentId
        ? targetSport
        : this.schoolSports.find(sport => matchId(sport) === currentId);

      if (updated) {
        selected.degrees = updated.degrees;
      }
      return selected;
    });
    this.sportsData.data = [...this.selectedSports];
    this.cdr.detectChanges();
  }
}

