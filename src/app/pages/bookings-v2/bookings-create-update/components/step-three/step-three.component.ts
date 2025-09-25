import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, shareReplay, startWith, switchMap } from 'rxjs/operators';
import { UtilsService } from 'src/service/utils.service';
import { PerformanceCacheService } from 'src/app/services/performance-cache.service';

@Component({
  selector: 'booking-step-three',
  templateUrl: './step-three.component.html',
  styleUrls: ['./step-three.component.scss'],
})
export class StepThreeComponent implements OnInit {
  @Input() initialData: any;
  @Input() utilizers: any;
  @Output() stepCompleted = new EventEmitter<FormGroup>();
  @Output() prevStep = new EventEmitter();

  selectedLevelColor: string = ''; // Variable para almacenar el color del nivel seleccionado
  stepForm: FormGroup;
  sportData: any[] = [];
  filteredLevels: Observable<any[]>;
  levels: any[] = [];
  private sportsCache$: Observable<any[]>;
  private levelsCache = new Map<number, any[]>();
  private userSchoolId: number;
  private maxUtilizerAge: number;
  private initialLevelApplied = false;

  constructor(
    private fb: FormBuilder,
    private utilsService: UtilsService,
    private performanceCache: PerformanceCacheService
  ) {}

  ngOnInit(): void {
    this.userSchoolId = this.getUserSchoolId();
    this.maxUtilizerAge = this.computeMaxUtilizerAge();
    this.initializeForm();
    this.loadSports();
  }

  initializeForm() {
    this.stepForm = this.fb.group({
      sport: [null, Validators.required],
      sportLevel: [null, Validators.required],
    });

    // Preseleccionar el deporte si existe `initialData`
    if (this.initialData?.sport) {
      this.stepForm.patchValue({
        sport: this.initialData.sport,
      });
      this.loadLevels(this.initialData.sport); // Cargar niveles para el deporte preseleccionado
    }

    // Cuando se selecciona un deporte, se cargan los grados (niveles)
    this.stepForm.get('sport').valueChanges
      .pipe(distinctUntilChanged())
      .subscribe((sport) => {
        if (sport) {
          this.stepForm.get('sportLevel').reset(); // Resetear el nivel al cambiar el deporte
          this.selectedLevelColor = '';
          this.loadLevels(sport);
        } else {
          this.levels = [];
          this.selectedLevelColor = '';
        }
      });

    this.stepForm.get('sportLevel').valueChanges.subscribe((level) => {
      if (level && level.color) {
        this.selectedLevelColor = level.color; // Guardar color del nivel seleccionado
      } else {
        this.selectedLevelColor = ''; // Resetear si no hay nivel seleccionado
      }
    });

    // Filtrar niveles en función de la búsqueda en el input
    this.filteredLevels = this.stepForm.get('sportLevel').valueChanges.pipe(
      startWith(''),
      map((value) => (typeof value === 'string' ? value : this.formatLevel(value))),
      debounceTime(200),
      distinctUntilChanged(),
      switchMap((value) => of(this.filterLevels(value || '')))
    );
  }

  formatLevel(level: any): string {
    // Asegurarse de que league, level, y name existen y no son nulos
    const league = level?.league || '';
    const levelName = level?.level || '';
    const name = level?.name || '';

    return `${league} ${levelName} ${name}`.trim();
  }

  // Método para cargar los deportes
  loadSports() {
    this.fetchSports()
      .subscribe((sports) => {
        this.sportData = sports;
      });
  }

  // Método para cargar los niveles (grados) según el deporte seleccionado
  loadLevels(selectedSport) {
    if (!selectedSport) {
      this.levels = [];
      return;
    }

    const cachedLevels = this.levelsCache.get(selectedSport.id);
    if (cachedLevels) {
      this.applyLevels(selectedSport, cachedLevels);
      return;
    }

    const rawLevels = Array.isArray(selectedSport.degrees) ? selectedSport.degrees : [];
    const availableLevels = rawLevels.filter((level) =>
      this.maxUtilizerAge >= level.age_min &&
      this.maxUtilizerAge <= level.age_max &&
      level.school_id === this.userSchoolId &&
      level.active
    );

    this.levelsCache.set(selectedSport.id, availableLevels);
    this.applyLevels(selectedSport, availableLevels);
  }

  private fetchSports(): Observable<any[]> {
    if (!this.sportsCache$) {
      const params = {
        with: ['sport.degrees'],
        school_id: this.userSchoolId,
        active: 1,
        perPage: 1000,
        order: 'asc',
        orderColumn: 'id'
      };

      this.sportsCache$ = this.performanceCache
        .get<any[]>('/school-sports', params)
        .pipe(shareReplay(1));
    }

    return this.sportsCache$;
  }

  private applyLevels(selectedSport: any, availableLevels: any[]): void {
    this.levels = availableLevels;

    if (!this.initialData?.sportLevel) {
      const lowestDegree = this.getLowestDegreeForSport(selectedSport.id);
      if (lowestDegree) {
        this.stepForm.patchValue({
          sportLevel: lowestDegree,
        }, { emitEvent: false });
        this.selectedLevelColor = lowestDegree?.color ?? '';
      }
    }

    if (!this.initialLevelApplied && this.initialData?.sportLevel) {
      const existsInCurrentSport = availableLevels.some(level => level.id === this.initialData.sportLevel.id);
      if (existsInCurrentSport) {
        this.stepForm.patchValue({
          sportLevel: this.initialData.sportLevel,
        }, { emitEvent: false });
        this.selectedLevelColor = this.initialData.sportLevel?.color ?? '';
        this.initialLevelApplied = true;
      }
    }
  }

  getLowestDegreeForSport(sportId: number) {
    if (!this.utilizers || this.utilizers.length === 0) return null;

    if (!this.userSchoolId) return null; // Asegurar que hay un schoolId válido

    const degrees = this.utilizers
      .flatMap(utilizer => utilizer.client_sports) // Obtener todos los client_sports
      .filter(cs => cs.sport_id === sportId && cs.school_id === this.userSchoolId) // Filtrar por sport y school
      .map(cs => cs.degree) // Obtener los degrees
      .filter(degree => degree); // Eliminar posibles `null`

    return degrees.length ? degrees.reduce((min, degree) => degree.id < min.id ? degree : min) : null;
  }

  // Filtro de niveles para el autocompletado
  filterLevels(value: string) {
    const filterValue = value.toLowerCase();
    const source = this.levels || [];
    return source.filter(option =>
      (option.league && option.league.toLowerCase().includes(filterValue)) ||
      (option.level && option.level.toLowerCase().includes(filterValue)) ||
      (option.name && option.name.toLowerCase().includes(filterValue))
    );
  }

  private computeMaxUtilizerAge(): number {
    if (!Array.isArray(this.utilizers) || this.utilizers.length === 0) {
      return 0;
    }

    return Math.max(
      ...this.utilizers.map((utilizer) =>
        this.utilsService.calculateYears(utilizer.birth_date)
      )
    );
  }

  // Obtener la edad máxima entre los utilizadores
  getMaxUtilizerAge(): number {
    return this.maxUtilizerAge;
  }

  // Obtener el ID de la escuela del usuario
  getUserSchoolId(): number {
    const schoolData = this.utilsService.getSchoolData();
    if (schoolData?.id) {
      return schoolData.id;
    }

    const user = JSON.parse(localStorage.getItem('boukiiUser'));
    return user?.schools?.[0]?.id ?? 0;
  }

  displayFnLevel(level: any): string {
    return level ? `${level.league} - ${level.name}` : '';
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
}
