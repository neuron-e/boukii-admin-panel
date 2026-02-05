import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ApiCrudService } from 'src/service/crud.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import moment from 'moment';

interface ExportCoursesDialogData {
  lang: string;
}

interface SeasonOption {
  id: number;
  name?: string;
  start_date?: string;
  end_date?: string;
}

@Component({
  selector: 'vex-export-courses-dialog',
  templateUrl: './export-courses-dialog.component.html',
  styleUrls: ['./export-courses-dialog.component.scss']
})
export class ExportCoursesDialogComponent implements OnInit {
  form: FormGroup;
  seasons: SeasonOption[] = [];
  loadingSeasons = false;
  selectionError = false;

  constructor(
    private dialogRef: MatDialogRef<ExportCoursesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExportCoursesDialogData,
    private fb: FormBuilder,
    private crudService: ApiCrudService,
    private snackbar: MatSnackBar
  ) {
    this.form = this.fb.group({
      seasonId: [null],
      dateFrom: [null],
      dateTo: [null],
    });
  }

  ngOnInit(): void {
    this.loadSeasons();
  }

  confirm(): void {
    this.selectionError = false;
    const seasonId = this.form.value.seasonId;
    const dateFromRaw = this.form.value.dateFrom;
    const dateToRaw = this.form.value.dateTo;

    if (seasonId) {
      this.dialogRef.close({ seasonId });
      return;
    }

    const dateFrom = dateFromRaw ? moment(dateFromRaw).format('YYYY-MM-DD') : null;
    const dateTo = dateToRaw ? moment(dateToRaw).format('YYYY-MM-DD') : null;

    if (!dateFrom || !dateTo) {
      this.selectionError = true;
      return;
    }

    this.dialogRef.close({ dateFrom, dateTo });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  onSeasonSelected(): void {
    if (this.form.value.seasonId) {
      this.form.patchValue({ dateFrom: null, dateTo: null }, { emitEvent: false });
    }
  }

  onDatePicked(): void {
    if (this.form.value.dateFrom || this.form.value.dateTo) {
      this.form.patchValue({ seasonId: null }, { emitEvent: false });
    }
  }

  private loadSeasons(): void {
    const userRaw = localStorage.getItem('boukiiUser');
    const schoolId = userRaw ? JSON.parse(userRaw)?.schools?.[0]?.id : null;

    if (!schoolId) {
      this.snackbar.open('No school selected', 'OK', { duration: 3000 });
      return;
    }

    this.loadingSeasons = true;
    this.crudService.list('/seasons', 1, 1000, 'desc', 'id', `&school_id=${schoolId}`)
      .subscribe({
        next: (response: any) => {
          this.seasons = response?.data || [];
        },
        error: (error: any) => {
          console.error('Error loading seasons', error);
          this.snackbar.open('Error loading seasons', 'OK', { duration: 3000 });
        },
        complete: () => {
          this.loadingSeasons = false;
        }
      });
  }
}
