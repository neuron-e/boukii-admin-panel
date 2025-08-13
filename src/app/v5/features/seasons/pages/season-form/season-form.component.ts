import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { FormBuilderService } from '../../../../core/services/form-builder.service';
import { SeasonService, CreateSeasonRequest } from '../../services/season.service';
import { Season } from '../../../../core/models/season.interface';
import { NotificationService } from '../../../../core/services/notification.service';
import { requiredTrimmed } from '../../../../core/utils/validators';

@Component({
  selector: 'vex-season-form',
  templateUrl: './season-form.component.html',
  styleUrls: ['./season-form.component.scss']
})
export class SeasonFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private fbs = inject(FormBuilderService);
  private seasonService = inject(SeasonService);
  private notification = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  form: FormGroup;
  loading = false;
  isEditMode = false;
  isCloneMode = false;
  seasonId: number | null = null;

  constructor() {
    this.form = this.createForm();
  }

  ngOnInit(): void {
    // Handle route params (for edit mode)
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.seasonId = +params['id'];
        this.loadSeasonForEdit();
      }
    });

    // Handle query params (for clone mode)
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(queryParams => {
      if (queryParams['clone'] && !this.isEditMode) {
        this.isCloneMode = true;
        this.loadSeasonForClone(+queryParams['clone'], queryParams['cloneName']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fbs.group({
      name: ['', [Validators.required, Validators.minLength(3), requiredTrimmed()]],
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      set_as_active: [false]
    }, { 
      validators: [this.dateRangeValidator] 
    });
  }

  private dateRangeValidator(control: AbstractControl): ValidationErrors | null {
    const startDate = control.get('start_date')?.value;
    const endDate = control.get('end_date')?.value;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start >= end) {
        return { dateRange: true };
      }
    }
    
    return null;
  }

  private loadSeasonForEdit(): void {
    if (!this.seasonId) return;
    
    this.loading = true;
    this.seasonService.getSeason(this.seasonId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (season) => {
          this.populateForm(season);
        },
        error: (error) => {
          console.error('❌ Error loading season for edit:', error);
          this.notification.error('Error al cargar la temporada');
          this.router.navigate(['/v5/seasons']);
        }
      });
  }

  private populateForm(season: Season): void {
    this.form.patchValue({
      name: season.name,
      start_date: new Date(season.start_date),
      end_date: new Date(season.end_date)
      // Note: set_as_active is only for creation, not editing
    });
  }

  private loadSeasonForClone(seasonId: number, cloneName?: string): void {
    this.loading = true;
    this.seasonService.getSeason(seasonId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (season) => {
          // Pre-fill form with cloned season data but allow editing
          this.form.patchValue({
            name: cloneName || `${season.name} (Copia)`,
            start_date: null, // Don't clone dates - user should set new ones
            end_date: null,
            set_as_active: false // Default to false for cloned seasons
          });
          
          this.notification.info(`Clonando temporada "${season.name}". Ajusta las fechas y nombre según necesites.`);
        },
        error: (error) => {
          console.error('❌ Error loading season for clone:', error);
          this.notification.error('Error al cargar la temporada a clonar');
          this.router.navigate(['/v5/seasons']);
        }
      });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    
    const formValue = this.form.value;
    const seasonData: CreateSeasonRequest = {
      name: formValue.name.trim(),
      start_date: this.formatDateForAPI(formValue.start_date),
      end_date: this.formatDateForAPI(formValue.end_date)
    };

    // Add set_as_active flag for creation only
    if (!this.isEditMode && formValue.set_as_active) {
      (seasonData as any).set_as_active = true;
    }

    const operation = this.isEditMode 
      ? this.seasonService.updateSeason(this.seasonId!, seasonData)
      : this.seasonService.createSeason(seasonData);

    operation
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (season) => {
          const message = this.isEditMode 
            ? `Temporada "${season.name}" actualizada exitosamente`
            : `Temporada "${season.name}" creada exitosamente`;
          
          this.notification.success(message);
          this.router.navigate(['/v5/seasons']);
        },
        error: (error) => {
          console.error('❌ Error saving season:', error);
          const message = this.isEditMode 
            ? 'Error al actualizar la temporada'
            : 'Error al crear la temporada';
          
          this.notification.error(message);
          
          // Handle specific validation errors
          if (error.error?.errors) {
            this.handleValidationErrors(error.error.errors);
          }
        }
      });
  }

  private handleValidationErrors(errors: any): void {
    Object.keys(errors).forEach(field => {
      const control = this.form.get(field);
      if (control) {
        control.setErrors({ serverError: errors[field][0] });
      }
    });
  }

  private formatDateForAPI(date: Date): string {
    if (!date) return '';
    
    // Format as YYYY-MM-DD for API
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  formatPreviewDate(date: Date | null): string {
    if (!date) return 'Seleccionar fecha';
    
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  }

  onCancel(): void {
    this.router.navigate(['/v5/seasons']);
  }

  getPageTitle(): string {
    if (this.isEditMode) return 'Editar Temporada';
    if (this.isCloneMode) return 'Clonar Temporada';
    return 'Nueva Temporada';
  }

  getPageSubtitle(): string {
    if (this.isEditMode) return 'Modifica los datos de la temporada';
    if (this.isCloneMode) return 'Crea una nueva temporada basada en una existente';
    return 'Crea una nueva temporada para tu escuela';
  }
}
