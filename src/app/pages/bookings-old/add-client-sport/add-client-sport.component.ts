import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { _MatTableDataSource } from '@angular/material/table';
import { Observable, map, startWith } from 'rxjs';
import { LEVELS } from 'src/app/static-data/level-data';
import { ApiCrudService } from 'src/service/crud.service';

@Component({
  selector: 'vex-add-client-sport',
  templateUrl: './add-client-sport.component.html',
  styleUrls: ['./add-client-sport.component.scss']
})
export class AddClientSportModalComponent implements OnInit {

  acceptCreate = false;
  displayedColumns: string[] = ['name', 'level'];
  levelForm = new FormControl();
  sportsControl = new FormControl();

  filteredLevel: Observable<any[]>;
  filteredSports: Observable<any[]>;

  mockLevelData = LEVELS;
  selectedSports: any[] = [];
  sportsData = new _MatTableDataSource([]);
  schoolSports: any[] = [];

  form: UntypedFormGroup;

  ret: any = null;
  loading: any = true;
  user: any;

  constructor(@Inject(MAT_DIALOG_DATA) public defaults: any, private crudService: ApiCrudService, private snackbar: MatSnackBar,
    private fb: UntypedFormBuilder, private dialogRef: MatDialogRef<any>, private cdr: ChangeDetectorRef) {

  }

  ngOnInit(): void {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));

    this.filteredSports = this.sportsControl.valueChanges.pipe(
      startWith(''),
      map((sport: string | null) => sport ? this._filterSports(sport) : this.schoolSports.slice())
    );


    this.filteredLevel = this.levelForm.valueChanges.pipe(
      startWith(''),
      map((value: any) => typeof value === 'string' ? value : value?.annotation),
      map(annotation => annotation ? this._filterLevel(annotation) : this.mockLevelData.slice())
    );


    this.getSchoolSportDegrees();
    setTimeout(() => {
      this.getSports();

      if (this.defaults && this.defaults.sport_id) {
        const sport = this.schoolSports.find((s) => s.sport_id === this.defaults.sport_id);
        this.selectedSports.push(sport);
        this.sportsData.data.push(sport);
      }

      this.loading = false;

    }, 500);
  }


  getSelectedSportsNames(): string {
    return this.sportsControl.value?.map(sport => sport.name).join(', ') || '';
  }

  toggleSelection(sport: any, event: any): void {
    if (event.isUserInput) {

      const index = this.selectedSports.findIndex(s => s.sport_id === sport.sport_id);
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
  }

  displayFnLevel(level: any): string {
    return level && level?.name && level?.annotation ? level?.name + ' - ' + level?.annotation : level?.name;
  }

  private _filterLevel(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.mockLevelData.filter(level => level.annotation.toLowerCase().includes(filterValue));
  }

  private _filterSports(value: any): any[] {
    const filterValue = typeof value === 'string' ? value.toLowerCase() : value?.name.toLowerCase();
    return this.schoolSports.filter(sport => sport?.name.toLowerCase().indexOf(filterValue) === 0);
  }


  getSchoolSportDegrees() {
    this.crudService.list('/school-sports', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id)
      .subscribe((sport) => {
        this.schoolSports = sport.data;
        sport.data.forEach((element, idx) => {
          this.crudService.list('/degrees', 1, 10000, 'asc', 'degree_order', '&school_id=' + this.user.schools[0].id + '&sport_id=' + element.sport_id + '&active=1')
            .subscribe((data) => {
              this.schoolSports[idx].degrees = data.data
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
}
