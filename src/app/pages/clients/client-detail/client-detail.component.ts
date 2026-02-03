import {ChangeDetectorRef, Component, OnInit, ViewChild} from '@angular/core';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatTable, _MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, map, startWith, forkJoin, tap, from, mergeMap, toArray, retry, catchError, of } from 'rxjs';
import { fadeInRight400ms } from 'src/@vex/animations/fade-in-right.animation';
import { fadeInUp400ms } from 'src/@vex/animations/fade-in-up.animation';
import { scaleIn400ms } from 'src/@vex/animations/scale-in.animation';
import { stagger20ms } from 'src/@vex/animations/stagger.animation';
import { MOCK_COUNTRIES } from 'src/app/static-data/countries-data';
import { MOCK_LANGS } from 'src/app/static-data/language-data';
import { LEVELS } from 'src/app/static-data/level-data';
import { MOCK_PROVINCES } from 'src/app/static-data/province-data';
import { MOCK_SPORT_DATA } from 'src/app/static-data/sports-data';
import { ApiCrudService } from 'src/service/crud.service';
import { ConfirmModalComponent } from '../../monitors/monitor-detail/confirm-dialog/confirm-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { AddClientUserModalComponent } from '../add-client-user/add-client-user.component';
import moment from 'moment';
import { PasswordService } from 'src/service/password.service';
import { MatStepper } from '@angular/material/stepper';
import { TableColumn } from 'src/@vex/interfaces/table-column.interface';
import { TranslateService } from '@ngx-translate/core';
import { DateAdapter } from '@angular/material/core';
import { switchMap } from 'rxjs/operators';
import { SchoolService } from 'src/service/school.service';
import { EvaluationEditorComponent } from './evaluation-editor/evaluation-editor.component';
import { EvaluationHistoryComponent } from './evaluation-history/evaluation-history.component';


@Component({
  selector: 'vex-client-detail',
  templateUrl: './client-detail.component.html',
  styleUrls: ['./client-detail.component.scss'],
  animations: [fadeInUp400ms, stagger20ms, scaleIn400ms, fadeInRight400ms]

})
export class ClientDetailComponent {

  @ViewChild('sportsCurrentTable') currentSportsTable: MatTable<any>;

  showInfo = true;
  showPersonalInfo = true;
  showAddressInfo: boolean = true;
  showSportInfo: boolean = true;
  editInfo = false;
  editPersonalInfo = false;
  editAddressInfo: boolean = false;
  editSportInfo: boolean = false;
  countries = MOCK_COUNTRIES;
  provinces = MOCK_PROVINCES;

  displayedCurrentColumns: string[] = ['name', 'level', 'delete'];
  displayedColumns: string[] = ['name', 'date'];

  imagePreviewUrl: string | ArrayBuffer;
  formInfoAccount: UntypedFormGroup;
  formPersonalInfo: UntypedFormGroup;
  formSportInfo: UntypedFormGroup;
  formOtherInfo: UntypedFormGroup;
  myControlStations = new FormControl();
  myControlCountries = new FormControl();
  myControlProvinces = new FormControl();
  levelForm = new FormControl();

  filteredStations: Observable<any[]>;
  filteredCountries: Observable<any[]>;
  filteredProvinces: Observable<any[]>;
  filteredLevel: Observable<any[]>;
  filteredSports: Observable<any[]>;

  sportsControl = new FormControl();
  selectedNewSports: any[] = [];
  selectedSports: any[] = [];
  sportsData = new _MatTableDataSource([]);
  sportsCurrentData = new _MatTableDataSource([]);
  stations: any = [];

  languagesControl = new FormControl([]);
  languages = [];
  schoolSports = [];
  filteredLanguages: Observable<any[]>;
  selectedLanguages = [];
  deletedItems = [];
  clientUsers = [];
  selectedGoal = [];
  evaluations = [];
  evaluationFullfiled = [];
  evaluationComments: {[key: number]: any[]} = {};
  evaluationCommentsLoading: {[key: number]: boolean} = {};
  evaluationHistory: {[key: number]: any[]} = {};
  evaluationHistoryLoading: {[key: number]: boolean} = {};
  maxSelection = 6;
  today: Date;
  minDate: Date;
  loading = true;
  editing = false;
  coloring = true;
  selectedTabIndex = 0;
  selectedTabPreviewIndex = 0;

  mockCivilStatus: string[] = ['Single', 'Mariée', 'Veuf', 'Divorcé'];
  mockLevelData: any = LEVELS;

  mainClient: any;
  currentImage: any;
  defaults = {
    id: null,
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
    active_station: null,
    is_vip: false
  }

  defaultsObservations = {
    id: null,
    notes: '',
    client_id: null,
    school_id: null
  }
  observationHistory: string[] = [];
  newObservationNote = '';

  defaultsUser = {
    id: null,
    username: null,
    email: null,
    password: null,
    image: null,
    type: 'client',
    active: false,
  }

  groupedByColor = {};
  colorKeys: string[] = []; // Aquí almacenaremos las claves de colores
  user: any;
  id: any;
  active: false;

  allLevels: any = [];
  allClientLevels: any = [];
  sportIdx: any = -1;
  selectedSport: any;
  clientSport = [];
  clients = [];
  clientSchool = [];
  goals = [];
  sportCardGroups: Array<{ label: string; color: string; items: any[] }> = [];
  bookingUsersUnique = [];
  bonus = [];
  mainId: any;
  schoolNewsletterSubscription: boolean = false;
  schoolVip: boolean = false;
  showDetail: boolean = false;
  detailData: any;
  entity = '/booking-users';
  columns: TableColumn<any>[] = [
    { label: 'Id', property: 'id', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'type', property: 'booking', type: 'booking_users_image_monitors', visible: true },
    { label: 'course', property: 'course', type: 'course_type_data', visible: true },
    { label: 'client', property: 'client', type: 'client', visible: true },
    { label: 'register', property: 'created_at', type: 'date', visible: true },
    //{ label: 'Options', property: 'options', type: 'text', visible: true },
    { label: 'bonus', property: 'bonus', type: 'light', visible: true },
    //{ label: 'OP. Rem', property: 'has_cancellation_insurance', type: 'light_data', visible: true },
    //{ label: 'B. Care', property: 'has_boukii_care', type: 'light_data', visible: true },
    { label: 'price', property: 'price', type: 'price', visible: true },
    //{ label: 'M. Paiment', property: 'payment_method', type: 'text', visible: true },
    //{ label: 'Status', property: 'paid', type: 'payment_status_data', visible: true },
    //{ label: 'Status 2', property: 'cancelation', type: 'cancelation_status', visible: true },
    { label: 'Actions', property: 'actions', type: 'button', visible: true }
  ];


  constructor(private fb: UntypedFormBuilder, private cdr: ChangeDetectorRef, private crudService: ApiCrudService, private router: Router,
              private activatedRoute: ActivatedRoute, private snackbar: MatSnackBar, private dialog: MatDialog, private passwordGen: PasswordService,
              private translateService: TranslateService, private dateAdapter: DateAdapter<Date>, private schoolService: SchoolService) {
    this.today = new Date();
    this.minDate = new Date(this.today);
    this.minDate.setFullYear(this.today.getFullYear() - 18);
    this.dateAdapter.setLocale(this.translateService.getDefaultLang());
    this.dateAdapter.getFirstDayOfWeek = () => { return 1; }
    this.mockLevelData.forEach(level => {
      if (!this.groupedByColor[level.color]) {
        this.groupedByColor[level.color] = [];
      }
      this.groupedByColor[level.color].push(level);
    });

    this.colorKeys = Object.keys(this.groupedByColor);
  }

  ngOnInit(): void {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
    this.id = this.activatedRoute.snapshot.params.id;
    this.mainId = this.activatedRoute.snapshot.params.id;
    this.getDegrees();
    this.getInitialData().pipe(
      switchMap(() => this.getData())
    ).subscribe(() => {
      this.crudService.get('/evaluation-fulfilled-goals').subscribe((data) => this.evaluationFullfiled = data.data)
      // Aquí puedes realizar cualquier lógica adicional después de obtener los datos iniciales y los datos principales.
    });
  }

  getInitialData() {

    const requestsInitial = {
      languages: this.getLanguages().pipe(retry(3), catchError(error => {
        console.error('Error fetching languages:', error);
        return of([]); // Devuelve un array vacío en caso de error
      })),
      stations: this.getStations().pipe(retry(3), catchError(error => {
        console.error('Error fetching stations:', error);
        return of([]); // Devuelve un array vacío en caso de error
      })),
      /*      clients: this.getClients().pipe(retry(3), catchError(error => {
              console.error('Error fetching clients:', error);
              return of([]); // Devuelve un array vacío en caso de error
            })),*/
    };

    return forkJoin(requestsInitial).pipe(tap((results) => {
      this.formInfoAccount = this.fb.group({
        image: [''],
        first_name: ['', Validators.required],
        last_name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        username: [''],
        password: [''],
      });

      this.formPersonalInfo = this.fb.group({
        fromDate: [''],
        phone: [''],
        mobile: ['', Validators.required],
        address: [''],
        postalCode: [''],
        lang: [''],
        country: this.myControlCountries,
        province: this.myControlProvinces

      });

      this.formSportInfo = this.fb.group({
        sportName: [''],
      });

      this.formOtherInfo = this.fb.group({
        observation: ['']
      });

    }));

  }

  changeClientData(id: any) {
    this.loading = true;
    this.id = id;
    if (id === this.mainId) {
      this.minDate.setFullYear(this.today.getFullYear() - 18);
    } else {
      this.minDate.setFullYear(this.today.getFullYear());
    }
    this.getData(id, true).subscribe();
  }



  orderBookingUsers(users: any[]) {
    return users.sort((a, b) => {
      // Ordenar por fecha
      const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateComparison !== 0) {
        return dateComparison;
      }

      // Si la fecha es la misma, ordenar por hora de inicio
      return a.hour_start.localeCompare(b.hour_start);
    });
  }


  getData(id = null, onChangeUser = false) {
    const getId = id === null ? this.mainId : id;


    return this.crudService.get('/clients/' + getId, ['user', 'clientSports.degree', 'clientSports.sport',
      'evaluations.evaluationFulfilledGoals.degreeSchoolSportGoal', 'evaluations.degree', 'observations'])
      .pipe(
        tap((data) => {

          this.defaults = data.data;

          this.evaluations = data.data.evaluations;
          this.evaluationFullfiled = [];
          this.evaluations.forEach(ev => {
            ev.evaluation_fulfilled_goals.forEach(element => {
              ;
              this.evaluationFullfiled.push(element);
            });
          });
          const observations = Array.isArray(data.data.observations) ? data.data.observations : [];
          this.observationHistory = observations
            .map((obs: any) => this.normalizeObservationText(obs))
            .filter((text: string) => text.length > 0);
          this.defaultsObservations = {
            id: null,
            notes: '',
            client_id: null,
            school_id: null
          };
          this.currentImage = data.data.image;
          if (!onChangeUser) {
            this.mainClient = data.data;
          }

          const requestsClient = {
            clientSchool: this.getClientSchool().pipe(retry(3), catchError(error => {
              console.error('Error fetching client school:', error);
              return of([]); // Devuelve un array vacío en caso de error
            })),
            clientSport: this.getClientSport().pipe(retry(3), catchError(error => {
              console.error('Error fetching client sport:', error);
              return of([]); // Devuelve un array vacío en caso de error
            }))
          };

          forkJoin(requestsClient).subscribe((results) => {
            if (!onChangeUser) this.getClientUtilisateurs();

            if (data.data.user) this.defaultsUser = data.data.user;

            const langs = [];
            this.languages.forEach(element => {
              if (element.id === this.defaults?.language1_id || element.id === this.defaults?.language2_id || element.id === this.defaults?.language3_id ||
                element.id === this.defaults?.language4_id || element.id === this.defaults?.language5_id || element.id === this.defaults?.language6_id) {
                langs.push(element);
              }
            });

            this.languagesControl.setValue(langs);

            if (!onChangeUser) {

              this.filteredCountries = this.myControlCountries.valueChanges.pipe(
                startWith(''),
                map(value => typeof value === 'string' ? value : value.name),
                map(name => name ? this._filterCountries(name) : this.countries.slice())
              );

              this.myControlCountries.valueChanges.subscribe(country => {
                this.myControlProvinces.setValue('');  // Limpia la selección anterior de la provincia
                this.filteredProvinces = this._filterProvinces(country?.id);
              });

              this.filteredLevel = this.levelForm.valueChanges.pipe(
                startWith(''),
                map((value: any) => typeof value === 'string' ? value : value?.annotation),
                map(annotation => annotation ? this._filterLevel(annotation) : this.mockLevelData.slice())
              );
              this.filteredLanguages = this.languagesControl.valueChanges.pipe(
                startWith(''),
                map(language => (language ? this._filterLanguages(language) : this.languages.slice()))
              );

            }

            this.myControlStations.setValue(this.stations.find((s) => s.id === this.defaults.active_station)?.name);
            this.myControlCountries.setValue(this.countries.find((c) => c.id === +this.defaults.country));
            this.myControlProvinces.setValue(this.provinces.find((c) => c.id === +this.defaults.province));
            this.patchForms();

            this.loading = false;
          });

        }))
  }

  private patchForms(): void {
    this.patchAccountForm();
    this.patchPersonalInfoForm();
    this.patchOtherInfoForm();
  }

  private patchAccountForm(): void {
    if (!this.formInfoAccount) {
      return;
    }

    this.formInfoAccount.patchValue({
      image: this.defaults?.image || '',
      first_name: this.defaults?.first_name || '',
      last_name: this.defaults?.last_name || '',
      email: this.defaults?.email || '',
      username: this.defaultsUser?.username || '',
      password: ''
    }, { emitEvent: false });
  }

  private patchPersonalInfoForm(): void {
    if (!this.formPersonalInfo) {
      return;
    }

    this.formPersonalInfo.patchValue({
      fromDate: this.formatDateForInput(this.defaults?.birth_date),
      phone: this.defaults?.telephone || '',
      mobile: this.defaults?.phone || '',
      address: this.defaults?.address || '',
      postalCode: this.defaults?.cp || ''
    }, { emitEvent: false });
  }

  private patchOtherInfoForm(): void {
    if (!this.formOtherInfo) {
      return;
    }

    this.formOtherInfo.patchValue({
      observation: ''
    }, { emitEvent: false });
  }

  private formatDateForInput(value: any): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.substring(0, 10);
    }

    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) {
      return null;
    }

    const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
    const day = `${parsed.getDate()}`.padStart(2, '0');
    return `${parsed.getFullYear()}-${month}-${day}`;
  }

  private syncFormsToModel(): void {
    if (this.formInfoAccount) {
      const account = this.formInfoAccount.getRawValue();
      this.defaults.first_name = account.first_name?.trim() || this.defaults.first_name;
      this.defaults.last_name = account.last_name?.trim() || this.defaults.last_name;
      this.defaults.email = account.email?.trim() || this.defaults.email;
      this.defaultsUser.username = account.username?.trim() || this.defaultsUser.username;
      if (account.password && account.password.trim().length > 0) {
        this.defaultsUser.password = account.password.trim();
      } else {
        this.defaultsUser.password = '';
      }
    }

    if (this.formPersonalInfo) {
      const personal = this.formPersonalInfo.getRawValue();
      this.defaults.birth_date = personal.fromDate || this.defaults.birth_date;
      this.defaults.telephone = personal.phone || '';
      this.defaults.phone = personal.mobile || '';
      this.defaults.address = personal.address || '';
      this.defaults.cp = personal.postalCode || '';
    }

    if (this.formOtherInfo) {
      const other = this.formOtherInfo.getRawValue();
      this.newObservationNote = (other.observation || '').trim();
    }
  }

  getSchoolSportDegrees() {
    return this.crudService.list('/school-sports', 1, 10000, 'desc', 'id', '&school_id=' +
      this.user.schools[0].id, null, null, null, ['sport', 'degrees.degreesSchoolSportGoals'])
      .pipe(
        map((sport) => {
          this.goals = []
          this.schoolSports = sport.data;
          this.schoolSports.forEach(sport => {
            sport.name = sport.sport.name;
            sport.icon_selected = sport.sport.icon_selected;
            sport.icon_unselected = sport.sport.icon_unselected;
            sport.degrees = sport.degrees.filter((level: any) => this.isDegreeActive(level));
            if (this.defaults?.birth_date) {
              const age = this.calculateAge(this.defaults.birth_date);
              sport.degrees = sport.degrees.filter((level: any) => age >= level.age_min && age <= level.age_max);
            }
            sport.degrees.forEach(degree => {
              degree.degrees_school_sport_goals.forEach(goal => {
                this.goals.push(goal);
              });
            });

            this.clientSport.forEach(element => {
              if (element.sport_id === sport.sport_id) {
                element.name = sport.name;
                element.icon_selected = sport.icon_selected;
                element.icon_unselected = sport.icon_unselected;
                element.degrees = sport.degrees;
                element.degrees = element.degrees.filter(level => {
                  const age = this.calculateAge(this.defaults.birth_date);
                  return this.isDegreeActive(level) && age >= level.age_min && age <= level.age_max;
                });
              }
            });
          });
          this.sportsCurrentData.data = this.clientSport;
          const availableSports = [];
          this.schoolSports.forEach(element => {
            element.degrees = element.degrees.filter(level => {
              const age = this.calculateAge(this.defaults.birth_date);
              return this.isDegreeActive(level) && age >= level.age_min && age <= level.age_max;
            });
            if (!this.sportsCurrentData.data.find((s) => s.sport_id === element.sport_id)) {
              availableSports.push(element);
            }
          });

          this.filteredSports = this.sportsControl.valueChanges.pipe(
            startWith(''),
            map((sport: string | null) => sport ? this._filterSports(sport) : availableSports.slice())
          );


          //return this.getGoals();
        })
      );
  }

  checkClientStatus(data: any) {
    let ret = false;
    data.forEach(element => {
      if (element.school_id === this.user.schools[0].id) {
        ret = element.accepted_at !== null;
      }
    });

    return ret;
  }

  getClientSchool() {
    return this.crudService.list('/clients-schools', 1, 10000, 'desc', 'id', '&client_id=' + this.id)
      .pipe(
        map((data) => {
          this.clientSchool = data.data;
          // Load newsletter subscription for current school
          const currentSchoolRelation = this.clientSchool.find(relation => relation.school_id === this.user.schools[0].id);
          this.schoolNewsletterSubscription = currentSchoolRelation?.accepts_newsletter || false;
          this.schoolVip = currentSchoolRelation?.is_vip || false;
        })
      );
  }

  getClientSport() {
    return this.crudService.list('/client-sports', 1, 10000, 'desc', 'id', '&client_id='
      + this.id + "&school_id=" + this.user.schools[0].id, null, null, null, ['degree.degreesSchoolSportGoals'])
      .pipe(
        switchMap((data) => {
          this.clientSport = data.data;
          this.selectedSport = this.clientSport[0];
          this.goals = [];
          this.clientSport.forEach(element => {
            element.level = element.degree;
          });
          return this.getSchoolSportDegrees();
        })
      );
  }

  getStations() {
    return this.crudService.list('/stations-schools', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id)
      .pipe(
        switchMap((station) => {
          const stationRequests = station.data.map(element =>
            this.crudService.get('/stations/' + element.station_id).pipe(
              map(data => data.data)
            )
          );
          return forkJoin(stationRequests);
        }),
        tap((stations) => {
          this.stations = stations;
        })
      );
  }



  getLanguages() {
    return this.crudService.list('/languages', 1, 1000).pipe(
      tap((data) => {
        this.languages = data.data.reverse();

      })
    );
  }

  getClients() {
    return this.crudService.list('/admin/clients/mains', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id).pipe(
      tap((client) => {
        this.clients = client.data;
      })
    );
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

  /**Countries */

  private _filterCountries(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.countries.filter(country => country.name.toLowerCase().includes(filterValue));
  }

  private _filterProvinces(countryId: number): Observable<any[]> {
    return this.myControlProvinces.valueChanges.pipe(
      startWith(''),
      map(value => typeof value === 'string' ? value : value.name),
      map(name => name ? this._filter(name, countryId) : this.provinces.filter(p => p.country_id === countryId).slice())
    );
  }

  private _filter(name: string, countryId: number): any[] {
    const filterValue = name.toLowerCase();
    return this.provinces.filter(province => province.country_id === countryId && province.name.toLowerCase().includes(filterValue));
  }
  private _filterLevel(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.mockLevelData.filter(level => level.annotation.toLowerCase().includes(filterValue));
  }

  private _filterLanguages(value: any): any[] {
    const filterValue = value.toLowerCase();
    return this.languages.filter(language => language?.name.toLowerCase().includes(filterValue));
  }

  private _filterSports(value: any): any[] {
    const filterValue = typeof value === 'string' ? value.toLowerCase() : value?.name?.toLowerCase();
    return this.schoolSports.filter(sport => sport?.name.toLowerCase().indexOf(filterValue) === 0);
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

  toggleSelection(event: any, sport: any): void {

    if (event.isUserInput) {

      const index = this.selectedNewSports.findIndex(s => s.sport_id === sport.sport_id);
      if (index >= 0) {
        this.selectedNewSports.splice(index, 1);
      } else {
        // Check if sport already exists in current sports (without level check at this stage)
        const existsInCurrent = this.sportsCurrentData.data.find(s => s.sport_id === sport.sport_id);
        if (existsInCurrent) {
          this.snackbar.open(
            this.translateService.instant('Este deporte ya está en tu lista. Puedes editar su nivel en la tabla superior.'),
            'OK',
            { duration: 4000 }
          );
          return;
        }

        this.selectedNewSports.push(sport);
      }

      // Crear una nueva referencia para el array
      this.selectedNewSports = [...this.selectedNewSports];

      // Actualizar los datos de la tabla
      this.sportsData.data = this.selectedNewSports;

      // Detectar cambios manualmente para asegurarse de que Angular reconozca los cambios
      this.cdr.detectChanges();
    }
  }

  /**
   * Asignar nivel a un deporte nuevo y validar duplicados
   */
  assignLevelToNewSport(element: any, level: any): void {
    if (!element || !level) {
      return;
    }

    // Validar si ya existe este deporte con este nivel
    const duplicateInCurrent = this.sportsCurrentData.data.find(
      s => s.sport_id === element.sport_id && s.level?.id === level.id
    );

    if (duplicateInCurrent) {
      this.snackbar.open(
        this.translateService.instant('Ya tienes este deporte con este nivel en tu lista actual'),
        'OK',
        { duration: 4000 }
      );
      return;
    }

    const duplicateInNew = this.sportsData.data.find(
      s => s.sport_id === element.sport_id && s !== element && s.level?.id === level.id
    );

    if (duplicateInNew) {
      this.snackbar.open(
        this.translateService.instant('Ya seleccionaste este deporte con este nivel'),
        'OK',
        { duration: 4000 }
      );
      return;
    }

    // Asignar nivel al elemento
    element.level = level;
    this.cdr.detectChanges();
  }

  getSelectedSportsNames(): string {
    return this.sportsControl.value?.map(sport => sport.name).join(', ') || '';
  }

  toggleSelectionLanguages(event: any, language: any): void {
    if (event.isUserInput) {

      if (this.selectedLanguages.length < this.maxSelection) {

        const index = this.selectedLanguages.findIndex(l => l.id === language.id);
        if (index >= 0) {
          this.selectedLanguages.splice(index, 1);
        } else {
          this.selectedLanguages.push({ id: language.id, name: language.name, code: language.code });
        }
      } else {
        this.snackbar.open(this.translateService.instant('snackbar.admin.langs'), 'OK', { duration: 3000 });
      }
    }
  }

  getSelectedLanguageNames(): string {
    return this.selectedLanguages.map(language => language.name).join(', ');
  }

  getClientUtilisateurs() {
    this.crudService.list('/admin/clients/' + this.id + '/utilizers', 1, 10000, 'desc', 'id', '&client_id=' + this.id)
      .subscribe((data) => {
        this.clientUsers = data.data;
        this.crudService.list('/clients-utilizers', 1, 10000, 'desc', 'id', '&main_id=' + this.id)
          .subscribe((data) => {
            data.data.forEach(element => {
              this.clientUsers.forEach(cl => {
                if (element.client_id === cl.id) {
                  cl.utilizer_id = element.id;
                }
              });
            });
          })

      })
  }

  goTo(route: string) {
    this.router.navigate([route]);
  }

  setLanguages() {
    if (this.selectedLanguages.length >= 1) {

      this.defaults.language1_id = this.selectedLanguages[0].id;
    } else {
      this.defaults.language1_id = null;
    }
    if (this.selectedLanguages.length >= 2) {

      this.defaults.language2_id = this.selectedLanguages[1].id;
    } else {
      this.defaults.language2_id = null;
    }
    if (this.selectedLanguages.length >= 3) {

      this.defaults.language3_id = this.selectedLanguages[2].id;
    } else {
      this.defaults.language3_id = null;
    }
    if (this.selectedLanguages.length >= 4) {

      this.defaults.language4_id = this.selectedLanguages[3].id;
    } else {
      this.defaults.language4_id = null;
    }
    if (this.selectedLanguages.length >= 5) {

      this.defaults.language5_id = this.selectedLanguages[4].id;
    } else {
      this.defaults.language5_id = null;
    }
    if (this.selectedLanguages.length === 6) {

      this.defaults.language6_id = this.selectedLanguages[5].id;
    } else {
      this.defaults.language6_id = null;
    }
  }

  setInitLanguages() {
    this.selectedLanguages = [];
    this.languages.forEach(element => {
      if (element.id === this.defaults.language1_id || element.id === this.defaults.language2_id || element.id === this.defaults.language3_id
        || element.id === this.defaults.language4_id || element.id === this.defaults.language5_id || element.id === this.defaults.language6_id) {
        this.selectedLanguages.push(element);
      }
    });
  }

  removeSport(idx: number, element: any) {

    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      maxWidth: '100vw',  // Asegurarse de que no haya un ancho máximo
      panelClass: 'full-screen-dialog',  // Si necesitas estilos adicionales,
      data: { message: this.translateService.instant('delete_text'), title: this.translateService.instant('delete_title') }
    });

    dialogRef.afterClosed().subscribe((data: any) => {
      if (data) {

        this.crudService.delete('/client-sports', element.id)
          .subscribe(() => {
            this.deletedItems.push(this.sportsCurrentData.data[idx]);
            this.sportsCurrentData.data.splice(idx, 1);
            this.currentSportsTable.renderRows();
          })
      }
    });
  }

  deleteUserClient(id: number) {

    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      maxWidth: '100vw',  // Asegurarse de que no haya un ancho máximo
      panelClass: 'full-screen-dialog',  // Si necesitas estilos adicionales,
      data: { message: this.translateService.instant('delete_text'), title: this.translateService.instant('delete_title') }
    });


    dialogRef.afterClosed().subscribe((data: any) => {
      if (data) {

        this.crudService.delete('/clients-utilizers', id)
          .subscribe(() => {
            this.snackbar.open(this.translateService.instant('snackbar.client.removed_user'), 'OK', { duration: 3000 });
            window.location.reload();
          })
      }
    });
  }

  updateLevel(clientSport, level) {
    this.crudService.update('/client-sports', { client_id: clientSport.client_id, sport_id: clientSport.sport_id, degree_id: level.id, school_id: this.user.schools[0].id }, clientSport.id)
      .subscribe((data) => {
        this.snackbar.open(this.translateService.instant('snackbar.client.level_updated'), 'OK', { duration: 3000 });
      })
  }

  setActive(event) {
    this.active = event.checked;
  }

  formatDate = (date: Date | string): string => {
    // Convertir a objeto Date si es un string
    const validDate = typeof date === 'string' ? new Date(date) : date;

    // Verificar si el objeto Date es válido
    if (isNaN(validDate.getTime())) {
      throw new Error('Invalid date format');
    }

    const day = validDate.getDate().toString().padStart(2, '0');
    const month = (validDate.getMonth() + 1).toString().padStart(2, '0');
    const year = validDate.getFullYear();

    return `${year}-${month}-${day}`;
  };

  private normalizeObservationText(obs: any): string {
    if (!obs) return '';
    const parts: string[] = [];
    const notes = (obs.notes || '').trim();
    const general = (obs.general || '').trim();
    const historical = (obs.historical || '').trim();
    if (notes) {
      parts.push(notes);
    }
    if (general) {
      parts.push(`General: ${general}`);
    }
    if (historical) {
      parts.push(`Historial: ${historical}`);
    }
    return parts.join('\n').trim();
  }

  save() {
    this.syncFormsToModel();
    this.setLanguages();

    if (this.currentImage === this.defaults.image) {
      delete this.defaults.image;
      delete this.defaultsUser.image;
    } else {
      this.defaultsUser.image = this.imagePreviewUrl;
      this.defaults.image = this.imagePreviewUrl;
    }
    if (this.defaultsUser.password === '') delete this.defaultsUser.password;
    this.defaultsUser.email = this.defaults.email;
    this.crudService.update('/users', this.defaultsUser, this.defaultsUser.id)
      .subscribe((user) => {
        this.defaults.user_id = user.data.id;
        this.defaults.birth_date = this.formatDate(this.defaults.birth_date)
        // Do not update global is_vip at client level anymore (school-scoped now)
        if (this.defaults.hasOwnProperty('is_vip')) {
          delete (this.defaults as any).is_vip;
        }
        this.crudService.update('/clients', this.defaults, this.id)
          .subscribe((client) => {
            this.snackbar.open(this.translateService.instant('snackbar.client.update'), 'OK', { duration: 3000 });
            this.defaultsObservations.client_id = client.data.id;
            this.defaultsObservations.school_id = this.user.schools[0].id;
            if (this.newObservationNote) {
              this.crudService.create('/client-observations', {
                ...this.defaultsObservations,
                notes: this.newObservationNote
              }).subscribe(() => { });
            }
            this.sportsData.data.forEach(element => {
              this.crudService.create('/client-sports', {
                client_id: client.data.id,
                sport_id: element.sport_id,
                degree_id: element.level.id,
                school_id: this.user.schools[0].id
              }).subscribe(() => { })
            });

            // Actualizar deportes actuales del cliente
            this.sportsCurrentData.data.forEach(element => {
              this.crudService.update('/client-sports', {
                client_id: client.data.id,
                sport_id: element.sport_id,
                degree_id: element.level.id,
                school_id: this.user.schools[0].id
              }, element.id).subscribe(() => { })
            });

            // Verificar el valor de 'active' y manejar el 'accepted_at'
            if (this.active) {  // Si 'active' es true
              // Buscar si existe una relación cliente-escuela
              const existingSchool = this.clientSchool.find(element => element.school_id === this.user.schools[0].id);
              if (existingSchool) {
                // Si ya existe, actualizar el 'accepted_at' y newsletter subscription
                if (existingSchool.accepted_at === null) {
                  this.crudService.update('/clients-schools', {
                    accepted_at: moment().toDate(),
                    accepts_newsletter: this.schoolNewsletterSubscription,
                    is_vip: this.schoolVip
                  }, existingSchool.id)
                    .subscribe(() => { });
                } else {
                  // Update newsletter subscription even if already accepted
                  this.crudService.update('/clients-schools', {
                    accepts_newsletter: this.schoolNewsletterSubscription,
                    is_vip: this.schoolVip
                  }, existingSchool.id)
                    .subscribe(() => { });
                }
              } else {
                // Si no existe, crear la relación
                this.crudService.create('/clients-schools', {
                  client_id: client.data.id,
                  school_id: this.user.schools[0].id,
                  accepted_at: moment().toDate(),
                  accepts_newsletter: this.schoolNewsletterSubscription,
                  is_vip: this.schoolVip
                })
                  .subscribe(() => { });
              }
            } else {  // Si 'active' es false
              // Buscar si existe la relación y actualizar 'accepted_at' a null pero mantener newsletter subscription
              const existingSchool = this.clientSchool.find(element => element.school_id === this.user.schools[0].id);
              if (existingSchool) {
                this.crudService.update('/clients-schools', {
                  accepted_at: null,
                  accepts_newsletter: this.schoolNewsletterSubscription,
                  is_vip: this.schoolVip
                }, existingSchool.id)
                  .subscribe(() => { });
              }
            }

            // Redirigir después de 2 segundos
            setTimeout(() => {
              this.router.navigate(['/clients']);
            }, 2000);
          });
      });
  }


  onTabChange(event: any) {
    if (event.index === 1) {
      this.selectedSport = this.clientSport[0];
      this.selectSportEvo(this.selectedSport);
      this.selectedTabIndex = 0;
      this.selectedTabPreviewIndex = 1;
      this.editing = false;
    }
  }

  selectSportEvo(sport: any) {
    this.coloring = true;
    this.allClientLevels = [];
    this.selectedGoal = [];
    this.selectedSport = sport;

    this.schoolSports.forEach(element => {
      if (this.selectedSport.sport_id === element.sport_id) {
        this.selectedSport.degrees = element.degrees;
      }
    });

    this.selectedSport.degrees.forEach(element => {
      element.inactive_color = this.lightenColor(element.color, 30);
      this.allClientLevels.push(element);
    });

    this.sportIdx = this.allClientLevels.findIndex((al) => al.id === sport.level.id);
    this.allClientLevels.sort((a, b) => a.degree_order - b.degree_order);

    this.goals.forEach(element => {
      if (element.degree_id === sport.level.id) {

        this.selectedGoal.push(element);
      }
    });
    if (sport && sport?.level) {
      for (const i in this.allClientLevels) {
        // Inicializa el array para cada grado (degree)
        this.sportCard[+i] = {
          degree: this.allClientLevels[i], // Almacenar el degree
          goals: [] // Inicializar los goals como un array vacío
        };

        // Buscar los goals correspondientes a cada degree y asignarlos
        this.goals.forEach((element: any) => {
          if (element.degree_id === this.allClientLevels[i].id) {
            this.sportCard[+i].goals.push(element);
          }
        });
      }
    }
    this.sportCardGroups = this.groupSportCardsByColor(this.sportCard);
    this.coloring = false;
  }

  changeLevel(nextLevel: any) {
    this.selectedGoal = [];
    this.sportIdx = this.sportIdx + nextLevel;

    if (this.sportIdx < 0) {
      this.sportIdx = this.allClientLevels.length - 1;
    } else if (this.sportIdx >= this.allClientLevels.length) {
      this.sportIdx = 0;
    }
    this.allClientLevels.sort((a: any, b: any) => a.degree_order - b.degree_order);
    this.selectedSport.level = this.allClientLevels[this.sportIdx];
    this.goals.forEach((element: any) => {
      if (element.degree_id === this.allClientLevels[this.sportIdx].id) {
        this.selectedGoal.push(element);
      }
    });
    this.sportCardGroups = this.groupSportCardsByColor(this.sportCard);
    this.coloring = false;
  }

  private isDegreeActive(level: any): boolean {
    if (!level) return false;
    if (level.active === 0 || level.active === false) return false;
    if (level.status === 0 || level.status === false) return false;
    if (level.is_active === 0 || level.is_active === false) return false;
    return true;
  }

  private groupSportCardsByColor(cards: any[]): Array<{ label: string; color: string; items: any[] }> {
    const groups: {[key: string]: any[]} = {};
    cards.forEach(card => {
      const league = card?.degree?.league || 'N/A';
      if (!groups[league]) {
        groups[league] = [];
      }
      groups[league].push(card);
    });

    return Object.keys(groups)
      .map(label => ({
        label,
        color: groups[label][0]?.degree?.color || '#9ca3af',
        items: groups[label].sort((a: any, b: any) => a.degree.degree_order - b.degree.degree_order)
      }))
      .sort((a, b) => a.items[0].degree.degree_order - b.items[0].degree.degree_order);
  }

  lightenColor(hexColor: any, percent: any) {

    let r: any = parseInt(hexColor.substring(1, 3), 16);
    let g: any = parseInt(hexColor.substring(3, 5), 16);
    let b: any = parseInt(hexColor.substring(5, 7), 16);

    // Increase the lightness
    r = Math.round(r + (255 - r) * percent / 100);
    g = Math.round(g + (255 - g) * percent / 100);
    b = Math.round(b + (255 - b) * percent / 100);

    // Convert RGB back to hex
    r = r.toString(16).padStart(2, '0');
    g = g.toString(16).padStart(2, '0');
    b = b.toString(16).padStart(2, '0');

    return '#' + r + g + b;
  }

  canAddUtilisateur(date: string): boolean {
    const dateBirth = moment(date);
    const today = moment();
    const diff = today.diff(dateBirth, 'years');

    return diff >= 18;
  }

  addUtilisateur() {

    if (this.canAddUtilisateur(this.defaults.birth_date)) {
      const dialogRef = this.dialog.open(AddClientUserModalComponent, {
        width: '600px',  // Asegurarse de que no haya un ancho máximo
        panelClass: 'full-screen-dialog',  // Si necesitas estilos adicionales,
        data: { id: this.user.schools[0].id }
      });

      dialogRef.afterClosed().subscribe((data: any) => {
        if (data) {

          if (data.action === 'add') {
            this.crudService.create('/clients-utilizers', { client_id: data.ret, main_id: parseInt(this.id) })
              .subscribe((res) => {
                this.getClientUtilisateurs();
              })
          } else {
            const user = {
              username: data.data.name,
              email: this.defaults.email,
              password: this.passwordGen.generateRandomPassword(12),
              image: null,
              type: 'client',
              active: true,
            }

            const client = {
              email: this.defaults.email,
              first_name: data.data.first_name,
              last_name: data.data.last_name,
              birth_date: moment(data.data.fromDate).format('YYYY-MM-DD'),
              phone: this.defaults.phone,
              telephone: this.defaults.telephone,
              address: this.defaults.address,
              cp: this.defaults.cp,
              city: this.defaults.city,
              province: this.defaults.province,
              country: this.defaults.country,
              image: null,
              language1_id: null,
              language2_id: null,
              language3_id: null,
              language4_id: null,
              language5_id: null,
              language6_id: null,
              user_id: null,
              station_id: this.defaults.station_id
            }

            this.setLanguagesUtilizateur(data.data.languages, client);

            this.crudService.create('/users', user)
              .subscribe((user) => {
                client.user_id = user.data.id;

                this.crudService.create('/clients', client)
                  .subscribe((clientCreated) => {
                    this.snackbar.open(this.translateService.instant('snackbar.client.create'), 'OK', { duration: 3000 });

                    this.crudService.create('/clients-schools', { client_id: clientCreated.data.id, school_id: this.user.schools[0].id, accepted_at: moment().toDate() })
                      .subscribe((clientSchool) => {

                        setTimeout(() => {
                          this.crudService.create('/clients-utilizers', { client_id: clientCreated.data.id, main_id: this.id })
                            .subscribe((res) => {
                              this.getClientUtilisateurs();
                            })
                        }, 1000);
                      });
                  })
              })
          }
        }
      });
    } else {
      this.snackbar.open(this.translateService.instant('snackbar.client.no_age'), 'OK', { duration: 3000 });
    }

  }

  setLanguagesUtilizateur(langs: any, dataToModify: any) {
    if (langs.length >= 1) {

      dataToModify.language1_id = langs[0].id;
    } if (langs.length >= 2) {

      dataToModify.language2_id = langs[1].id;
    } if (langs.length >= 3) {

      dataToModify.language3_id = langs[2].id;
    } if (langs.length >= 4) {

      dataToModify.language4_id = langs[3].id;
    } if (langs.length >= 5) {

      dataToModify.language5_id = langs[4].id;
    } if (langs.length === 6) {

      dataToModify.language6_id = langs[5].id;
    }
  }

  goToStep3(stepper: MatStepper) {
    if (this.selectedLanguages.length === 0) {
      this.snackbar.open(this.translateService.instant('snackbar.client.mandatory_language'), 'OK', { duration: 3000 });
      return;
    }

    stepper.next();
  }

  getGoals() {
    return from(this.clientSport).pipe(
      mergeMap(cs => from(cs.degrees || []).pipe(
        mergeMap((dg: any) => this.crudService.list('/degrees-school-sport-goals', 1, 10000, 'desc', 'id', '&degree_id=' + dg.id)),
        map(response => response.data)
      )),
      toArray(),
      tap(goalsArrays => {
        this.goals = goalsArrays.flat();  // Aplanamos el array de arrays en un solo array
      })
    );
  }



  calculateGoalsScore() {
    if (this.selectedSport?.level) {
      const goals = this.goals.filter((g) => g.degree_id == this.selectedSport.level.id);
      if (!goals.length) return 0;
      const maxPoints = goals.length * 10;
      let ret = 0;
      for (const goal of goals) {
        this.evaluationFullfiled.forEach(element => {
          if (element.degrees_school_sport_goals_id === goal.id) {
            ret += this.normalizeGoalScore(element.score);
          }
        });
      }
      ret = ret > maxPoints ? maxPoints : ret;
      return Math.round((ret / maxPoints) * 100);
    }
    return 0;
  }

  getDegrees() {
    this.crudService.list('/degrees', 1, 10000, 'asc', 'degree_order', '&school_id=' + this.user.schools[0].id + '&active=1')
      .subscribe((data) => {
        this.allLevels = data.data;
      })
  }

  getDegreeScore(goal: any) {
    const d = this.evaluationFullfiled.find(element => element.degrees_school_sport_goals_id === goal)
    if (d) return this.normalizeGoalScore(d.score)
    return 0
  }

  showInfoEvent(event: boolean) {
    this.showInfo = event;
  }

  showInfoEditEvent(event: boolean) {
    this.editInfo = event;
    this.selectedTabIndex = 0;
    this.selectedTabPreviewIndex = 0;
    this.editing = true;
  }

  showPersonalInfoEvent(event: boolean) {
    this.showPersonalInfo = event;
  }


  showPersonalInfoEditEvent(event: boolean) {
    this.editPersonalInfo = event;
    this.selectedTabIndex = 0;
    this.selectedTabPreviewIndex = 0;
    this.editing = true;
  }

  showAddressInfoEvent(event: boolean) {
    this.showAddressInfo = event;
  }

  showAddressInfoEditEvent(event: boolean) {
    this.editAddressInfo = event;
    this.selectedTabIndex = 1;
    this.selectedTabPreviewIndex = 0;
    this.editing = true;
  }

  showSportInfoEvent(event: boolean) {
    this.showSportInfo = event;
  }

  showSportInfoEditEvent(event: boolean) {
    this.editSportInfo = event;
    this.selectedTabIndex = 2;
    this.selectedTabPreviewIndex = 0;
    this.editing = true;
  }

  getCountry(id: any) {
    const country = this.countries.find((c) => c.id == +id);
    return country ? country.name : 'NDF';
  }

  getProvince(id: any) {
    const province = this.provinces.find((c) => c.id == +id);
    return province ? province.name : 'NDF';
  }

  calculateAge(birthDateString) {
    if (birthDateString && birthDateString !== null) {
      const today = new Date();
      const birthDate = new Date(birthDateString);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();

      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age;
    } else {
      return 0;
    }

  }

  getPaymentMethod(id: number) {
    switch (id) {
      case 1:
        return 'CASH';
      case 2:
        return this.schoolService.getPaymentProvider() === 'payyo' ? 'PAYYO' : 'BOUKII PAY';
      case 3:
        return 'ONLINE';
      case 4:
        return 'AUTRE';
      case 5:
        return 'payment_no_payment';
      case 6:
        return 'bonus';

      default:
        return 'payment_no_payment'
    }
  }

  getHighestAuthorizedDegree(monitor, sport_id: number): any | null {
    // Encuentra los deportes asociados al monitor
    const degrees = monitor.monitor_sports_degrees
      .filter(degree =>
        degree.sport_id === sport_id &&
        degree.school_id === this.user?.schools[0]?.id
      )
      .map(degree => degree.monitor_sport_authorized_degrees)
      .flat(); // Aplanamos el array para obtener todos los grados autorizados

    if (degrees.length === 0) {
      return null; // Si no hay grados autorizados, retornamos null
    }

    // Buscamos el degree autorizado con el degree_order más alto
    const highestDegree = degrees.reduce((prev, current) => {
      return current.degree.degree_order > prev.degree.degree_order ? current : prev;
    });

    return highestDegree;
  }


  isActiveBookingUser(bu: any): boolean {
    // Compara la fecha más futura con la fecha actual
    return bu.status === 1 &&
      new Date(bu.date) > new Date();
  }

  isFinishedBookingUser(bu: any): boolean {
    // Compara la fecha más futura con la fecha actual
    return bu.status === 1 &&
      new Date(bu.date) < new Date();
  }

  getExtrasPrice() {
    let ret = 0;
    this.detailData.bookingusers.forEach(element => {
      if (element.courseExtras && element.courseExtras.length > 0 && !ret) {
        element.courseExtras.forEach(ce => {
          ret = ret + parseFloat(ce.course_extra.price);
        });
      }
    });

    return ret;
  }



  existExtras() {
    let ret = false;

    this.detailData.bookingusers.forEach(element => {
      if (element.courseExtras && element.courseExtras.length > 0 && !ret) {
        ret = true;
      }
    });

    return ret;
  }

  getBonusPrice() {
    let ret = 0;
    this.bonus.forEach(element => {
      ret = ret + element.currentPay;
    });
    return ret;
  }

  async showDetailEvent(event: any) {

    if (event.showDetail || (!event.showDetail && this.detailData !== null && this.detailData.id !== event.item.id)) {
          this.detailData = event.item.booking;

          this.bonus = [];
         // this.detailData = booking.data;

          // Ordenar los usuarios de la reserva
          this.detailData.bookingusers = this.orderBookingUsers(this.detailData.booking_users);

          // Obtener usuarios únicos de la reserva
          this.getUniqueBookingUsers(this.detailData.bookingusers);

          this.getSchoolSportDegrees();

          // Obtener los logs de los vouchers directamente desde detailData
          if (this.detailData.vouchers_logs.length > 0) {
            this.detailData.vouchers_logs.forEach(voucherLog => {
              let voucher = voucherLog.voucher;
              voucher.currentPay = parseFloat(voucherLog.amount);
              this.bonus.push(voucher);
            });
          }

          // Procesar los extras de los usuarios de la reserva
          this.detailData.bookingusers.forEach(book => {
            book.courseExtras = [];
            book.booking_user_extras.forEach(extra => {
              // Se asume que los extras están directamente en el objeto book
              book.courseExtras.push(extra);
            });
          });
          this.showDetail = true;


    } else {

      this.showDetail = event.showDetail;
      this.detailData = null;
    }

  }

  getUniqueBookingUsers(data: any) {
    const uniqueEntriesMap = new Map();

    data.forEach((item: any) => {
      const key = `${item.client_id}-${item.course_id}`;

      if (!uniqueEntriesMap.has(key)) {
        uniqueEntriesMap.set(key, {
          ...item,
          bookingusers: [] // Crea un array de bookingusers para almacenar cada fecha
        });
      }

      // Agrega la fecha actual al array de bookingusers
      uniqueEntriesMap.get(key).bookingusers.push(item);
    });

    // Convertir el Map en un array de objetos únicos con fechas agrupadas
    this.bookingUsersUnique = Array.from(uniqueEntriesMap.values());
  }

  getLanguage(id: any) {
    const lang = this.languages.find((c) => c.id == +id);
    return lang ? lang.code.toUpperCase() : 'NDF';
  }


  getAllLevelsBySport() {
    let ret = [];
    const clientData = this.detailData || this.defaults;
    
    // Try to get sport info from selectedSport or detailData
    const sportId = this.selectedSport?.sport_id || this.detailData?.sport?.id;
    
    // First try with schoolSports
    if (sportId && this.schoolSports && clientData) {
      this.schoolSports.forEach(element => {
        if (element.sport_id === sportId) {
          // Apply age filtering using the client's birth date
          if (clientData.birth_date) {
            const age = this.calculateAge(clientData.birth_date);
            ret = element.degrees.filter(level =>
              this.isDegreeActive(level) && age >= level.age_min && age <= level.age_max
            );
          } else {
            ret = element.degrees.filter(level => this.isDegreeActive(level));
          }
        }
      });
    }
    
    // Fallback: use allLevels filtered by sport
    if (ret.length === 0 && this.allLevels && sportId && clientData) {
      if (clientData.birth_date) {
        const age = this.calculateAge(clientData.birth_date);
        ret = this.allLevels.filter(level =>
          level.sport_id === sportId &&
          this.isDegreeActive(level) &&
          age >= level.age_min &&
          age <= level.age_max
        );
      } else {
        ret = this.allLevels.filter(level => level.sport_id === sportId && this.isDegreeActive(level));
      }
    }
    
    // Last fallback: return all levels if we still have nothing
    if (ret.length === 0 && this.allLevels) {
      ret = this.allLevels.filter(level => this.isDegreeActive(level));
    }

    return ret;
  }

  getFilteredLevelsBySport() {
    const clientData = this.detailData || this.defaults;
    
    // If we don't have client data or sport selection, return all levels
    if (!clientData || !clientData.birth_date || !this.detailData?.sport) {
      return this.allLevels.filter(level => this.isDegreeActive(level));
    }
    
    const age = this.calculateAge(clientData.birth_date);
    
    // Filter all levels by sport and age
    return this.allLevels.filter(level => 
      level.sport_id === this.detailData.sport.id && 
      this.isDegreeActive(level) &&
      age >= level.age_min && 
      age <= level.age_max
    );
  }

  getClient(id: any) {
    if (id && id !== null) {
      return this.clients.find((c) => c.id === id);
    }
  }



  getDateIndex() {
    let ret = 0;
    if (this.detailData.course && this.detailData.course.course_dates) {
      this.detailData.course.course_dates.forEach((element, idx) => {
        if (moment(element.date).format('YYYY-MM-DD') === moment(this.detailData.date).format('YYYY-MM-DD')) {
          ret = idx + 1;
        }
      });
    }

    return ret;
  }

  getGroupsQuantity() {
    let ret = 0;
    if (this.detailData.course && this.detailData.course.course_dates) {
      this.detailData.course.course_dates.forEach((element, idx) => {
        if (moment(element.date).format('YYYY-MM-DD') === moment(this.detailData.date).format('YYYY-MM-DD')) {
          ret = element.course_groups.length;
        }
      });
    }

    return ret;
  }


  getSubGroupsIndex() {
    let ret = 0;
    if (this.detailData.course && this.detailData.course.course_dates) {

      this.detailData.course.course_dates.forEach((element, idx) => {
        const group = element.course_groups.find((g) => g.id === this.detailData.course_group_id);

        if (group) {
          group.course_subgroups.forEach((s, sindex) => {
            if (s.id === this.detailData.course_subgroup_id) {
              ret = sindex + 1;
            }
          });
        }
      });
    }
    return ret;
  }

  getDateFormatLong(date: string) {
    return moment(date).format('dddd, D MMMM YYYY');
  }

  getHoursMinutes(hour_start: string, hour_end: string) {
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return { hours, minutes };
    };

    const startTime = parseTime(hour_start);
    const endTime = parseTime(hour_end);

    let durationHours = endTime.hours - startTime.hours;
    let durationMinutes = endTime.minutes - startTime.minutes;

    if (durationMinutes < 0) {
      durationHours--;
      durationMinutes += 60;
    }

    return `${durationHours}h${durationMinutes}m`;
  }

  getHourRangeFormat(hour_start: string, hour_end: string) {
    return hour_start.substring(0, 5) + ' - ' + hour_end.substring(0, 5);
  }

  getClientDegreeObject(client: any) {
    if (!client || !client.client_sports || !client.client_sports.length) {
      return 0;
    }
    const sportId = this.detailData.bookingusers && this.detailData.bookingusers[0] ? this.detailData.bookingusers[0].course.sport_id : null;
    if (!sportId) {
      return 0;
    }
    const clientSport = client.client_sports.find(cs => cs.sport_id === sportId && cs.school_id == this.user.schools[0].id);
    if (!clientSport || !clientSport.degree_id) {
      return 0;
    }
    return clientSport.degree;
  }



  getClientBookingDegree(client: any) {
    if (!client || !client.client_sports || !client.client_sports.length) {
      return 0;
    }
    const sportId = this.detailData.bookingusers && this.detailData.bookingusers[0] ? this.detailData.bookingusers[0].course.sport_id : null;
    if (!sportId) {
      return 0;
    }
    const clientSport = client.client_sports.find(cs => cs.sport_id === sportId && cs.school_id == this.user.schools[0].id);
    if (!clientSport || !clientSport.degree_id) {
      return 0;
    }
    return clientSport.degree_id;
  }

  get isActive(): boolean {
    if (!this.detailData.booking_users || this.detailData.booking_users.length === 0) {
      return false;
    }

    // Encuentra la fecha más futura en booking_users
    const maxDate = this.detailData.booking_users.reduce((latest, user) => {
      const userDate = new Date(user.date); // Asumiendo que cada `user` tiene una propiedad `date`
      return userDate > latest ? userDate : latest;
    }, new Date(0)); // Inicializamos con una fecha muy pasada

    // Compara la fecha más futura con la fecha actual
    return this.detailData.status === 1 &&
      maxDate > new Date();
  }

  get isFinished(): boolean {
    if (!this.detailData.booking_users || this.detailData.booking_users.length === 0) {
      return false;
    }

    // Encuentra la fecha más futura en booking_users
    const maxDate = this.detailData.booking_users.reduce((latest, user) => {
      const userDate = new Date(user.date); // Asumiendo que cada `user` tiene una propiedad `date`
      return userDate > latest ? userDate : latest;
    }, new Date(0)); // Inicializamos con una fecha muy pasada

    // Compara la fecha más futura con la fecha actual
    return this.detailData.status === 1 &&
      maxDate < new Date();
  }

  getClientDegree(sport_id: any, sports: any) {
    const sportObject = sports.find(sport => sport.sport_id === sport_id);
    if (sportObject) {
      return sportObject.degree_id;
    }
    else {
      return 0;
    }
  }

  getBirthYears(date: string) {
    const birthDate = moment(date);
    return moment().diff(birthDate, 'years');
  }

  getLanguageById(languageId: number): string {
    const language = this.languages.find(c => c.id === languageId);
    return language ? language.code.toUpperCase() : '';
  }

  getCountryById(countryId: number): string {
    const country = MOCK_COUNTRIES.find(c => c.id === countryId);
    return country ? country.code : 'Aucun';
  }

  calculateHourEnd(hour: any, duration: any) {
    if (duration.includes('h') && (duration.includes('min') || duration.includes('m'))) {
      const hours = duration.split(' ')[0].replace('h', '');
      const minutes = duration.split(' ')[1].replace('min', '').replace('m', '');

      return moment(hour, 'HH:mm').add(hours, 'h').add(minutes, 'm').format('HH:mm');
    } else if (duration.includes('h')) {
      const hours = duration.split(' ')[0].replace('h', '');

      return moment(hour, 'HH:mm').add(hours, 'h').format('HH:mm');
    } else {
      const minutes = duration.split(' ')[0].replace('min', '').replace('m', '');

      return moment(hour, 'HH:mm').add(minutes, 'm').format('HH:mm');
    }
  }

  close() {
    this.showDetail = false;
    this.detailData = null;
  }

  openEvaluationEditor(level: any, goals: any[], sport: any): void {
    const evaluations = this.getEvaluationsData(level);
    const sportId = sport?.sport_id || sport?.id;
    const levels = sportId ? this.allLevels.filter(item => item.sport_id === sportId) : [];
    const dialogRef = this.dialog.open(EvaluationEditorComponent, {
      width: '900px',
      data: {
        clientId: this.id,
        level,
        goals,
        sport,
        evaluations,
        clientSport: this.clientSport,
        levels
      }
    });

    dialogRef.afterClosed().subscribe((changed) => {
      if (changed) {
        this.getData(this.id, true).subscribe();
      }
    });
  }

  async openEvaluationHistory(level: any, goals: any[], sport: any): Promise<void> {
    const evaluation = this.getEvaluationForLevel(level);
    if (evaluation?.id) {
      await this.loadEvaluationHistory(evaluation.id);
    }
    this.dialog.open(EvaluationHistoryComponent, {
      width: '900px',
      data: {
        level,
        sport,
        goals,
        evaluation,
        history: evaluation?.id ? this.getEvaluationHistory(evaluation.id) : []
      }
    });
  }

  getGoalImage(goal: any): string {
    let ret = '';
    if (goal.length > 0) {
      this.allClientLevels.forEach((element: any) => {
        if (element.id === goal[0].degree_id) {
          ret = element.image;
        }
      });
    }
    return ret;
  }



  getEvaluationsData(level:any): any {
    let ret: any = [];

    this.evaluations.forEach((element: any) => {
      if (element.degree_id === level.id) {
        ret.push(element);
      }
    });

    return ret;
  }

  getEvaluationForLevel(level: any): any {
    const evaluations = this.getEvaluationsData(level);
    if (!evaluations.length) return null;
    return evaluations.sort((a: any, b: any) => b.id - a.id)[0];
  }

  getGoalsNotStartedCount(goals: any[]): number {
    if (!goals?.length) return 0;
    let completed = 0;
    goals.forEach(goal => {
      if (this.getDegreeScore(goal.id) >= 10) {
        completed += 1;
      }
    });
    return Math.max(0, goals.length - completed);
  }

  getGoalsCompletedCount(goals: any[]): number {
    if (!goals?.length) return 0;
    let completed = 0;
    goals.forEach(goal => {
      if (this.getDegreeScore(goal.id) >= 10) {
        completed += 1;
      }
    });
    return completed;
  }

  getMediaCounts(level: any): { images: number; videos: number } {
    const evaluation = this.getEvaluationForLevel(level);
    const files = evaluation?.files || [];
    let images = 0;
    let videos = 0;
    files.forEach((file: any) => {
      if (file.type === 'image') images += 1;
      if (file.type === 'video') videos += 1;
    });
    return { images, videos };
  }

  getEvaluationComments(evaluationId: number): any[] {
    return this.evaluationComments[evaluationId] || [];
  }

  async loadEvaluationComments(evaluationId: number): Promise<void> {
    if (!evaluationId || this.evaluationCommentsLoading[evaluationId]) return;
    this.evaluationCommentsLoading[evaluationId] = true;
    try {
      const response: any = await this.crudService.get(`/admin/evaluations/${evaluationId}/comments`).toPromise();
      this.evaluationComments[evaluationId] = response.data || [];
    } catch (error) {
      console.error('Error loading evaluation comments:', error);
      this.evaluationComments[evaluationId] = [];
    } finally {
      this.evaluationCommentsLoading[evaluationId] = false;
    }
  }

  async addEvaluationComment(evaluationId: number, comment: string): Promise<void> {
    if (!evaluationId || !comment?.trim()) return;
    await this.crudService.post(`/admin/evaluations/${evaluationId}/comments`, { comment }).toPromise();
    await this.loadEvaluationComments(evaluationId);
  }

  async addEvaluationFilesForLevel(level: any, files: File[]): Promise<void> {
    if (!files?.length) return;
    const evaluation = await this.ensureEvaluation(level);
    for (const file of files) {
      const base64 = await this.readFileAsBase64(file);
      if (!base64) continue;
      const payload = {
        evaluation_id: evaluation.id,
        name: '',
        type: file.type.startsWith('video/') ? 'video' : 'image',
        file: base64
      };
      await this.crudService.create('/evaluation-files', payload).toPromise();
    }
    await this.getData(this.id, true).toPromise();
  }

  getEvaluationHistory(evaluationId: number): any[] {
    return this.evaluationHistory[evaluationId] || [];
  }

  async loadEvaluationHistory(evaluationId: number): Promise<void> {
    if (!evaluationId || this.evaluationHistoryLoading[evaluationId]) return;
    this.evaluationHistoryLoading[evaluationId] = true;
    try {
      const response: any = await this.crudService.get(`/admin/evaluations/${evaluationId}/history`).toPromise();
      this.evaluationHistory[evaluationId] = response.data || [];
    } catch (error) {
      console.error('Error loading evaluation history:', error);
      this.evaluationHistory[evaluationId] = [];
    } finally {
      this.evaluationHistoryLoading[evaluationId] = false;
    }
  }

  async ensureEvaluation(level: any): Promise<any> {
    const existing = this.getEvaluationForLevel(level);
    if (existing) return existing;
    const payload = {
      client_id: this.id,
      degree_id: level.id,
      observations: ''
    };
    const response: any = await this.crudService.create('/evaluations', payload).toPromise();
    return response.data;
  }

  async updateGoalScore(level: any, goalId: number, score: number): Promise<void> {
    const evaluation = await this.ensureEvaluation(level);
    const existing = this.evaluationFullfiled.find((element: any) => element.degrees_school_sport_goals_id === goalId && element.evaluation_id === evaluation.id);
    const normalizedScore = this.normalizeGoalScore(score);
    const payload = {
      evaluation_id: evaluation.id,
      degrees_school_sport_goals_id: goalId,
      score: normalizedScore
    };
    if (existing?.id) {
      await this.crudService.update('/evaluation-fulfilled-goals', payload, existing.id).toPromise();
    } else {
      await this.crudService.create('/evaluation-fulfilled-goals', payload).toPromise();
    }
    await this.getData(this.id, true).toPromise();
  }

  async clearGoalScore(level: any, goalId: number): Promise<void> {
    const evaluation = this.getEvaluationForLevel(level);
    if (!evaluation?.id) return;
    const existing = this.evaluationFullfiled.find((element: any) => element.degrees_school_sport_goals_id === goalId && element.evaluation_id === evaluation.id);
    if (!existing?.id) return;
    await this.crudService.delete('/evaluation-fulfilled-goals', existing.id).toPromise();
    await this.getData(this.id, true).toPromise();
  }

  private readFileAsBase64(file: File): Promise<string | null> {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  sportCard: any[] = [];

  getProgressClass(progress: number): string {
    if (progress >= 100) return 'progress--complete';
    if (progress > 0) return 'progress--partial';
    return 'progress--empty';
  }

  private normalizeGoalScore(score: number): number {
    return Number(score) >= 10 ? 10 : 0;
  }
}
