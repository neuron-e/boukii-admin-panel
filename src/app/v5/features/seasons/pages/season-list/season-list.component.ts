import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil, startWith, map } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute } from '@angular/router';
import { Season } from '../../../../core/models/season.interface';
import { SeasonService } from '../../services/season.service';
import { SeasonContextService } from '../../../../core/services/season-context.service';
import { LoadingService } from '../../../../core/services/loading.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'vex-season-list',
  templateUrl: './season-list.component.html',
  styleUrls: ['./season-list.component.scss']
})
export class SeasonListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private seasonService = inject(SeasonService);
  private seasonContext = inject(SeasonContextService);
  private loadingService = inject(LoadingService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);

  dataSource = new MatTableDataSource<Season>([]);
  displayedColumns = ['name', 'start_date', 'end_date', 'status', 'actions'];
  
  stats$ = this.seasonService.getSeasonsStats();
  loading$ = this.loadingService.loading$;
  currentSeasonId$ = this.seasonContext.currentSeason$.pipe(
    map(season => season?.id || null)
  );

  searchTerm = '';
  statusFilter = 'all'; // all, active, closed, historical

  ngOnInit(): void {
    this.loadSeasons();
    this.setupDataSourceFiltering();
    this.checkForRedirectReason();
  }

  private checkForRedirectReason(): void {
    const reason = this.route.snapshot.queryParams['reason'];
    
    if (reason === 'no-active-season') {
      this.notification.info('No se encontró una temporada activa. Por favor selecciona o crea una temporada.');
    } else if (reason === 'dashboard-needs-season-context') {
      this.notification.info('El dashboard requiere una temporada activa. Por favor selecciona una temporada para continuar.');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadSeasons(): void {
    this.seasonService.getSeasons()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (seasons) => {
          this.dataSource.data = seasons;
        },
        error: (error) => {
          console.error('Error loading seasons:', error);
        }
      });
  }

  private setupDataSourceFiltering(): void {
    this.dataSource.filterPredicate = (season: Season, filter: string) => {
      const searchData = `${season.name} ${season.start_date} ${season.end_date}`.toLowerCase();
      const matchesSearch = searchData.includes(this.searchTerm.toLowerCase());
      
      let matchesStatus = true;
      switch (this.statusFilter) {
        case 'active':
          matchesStatus = season.is_active && !season.is_closed;
          break;
        case 'closed':
          matchesStatus = season.is_closed;
          break;
        case 'historical':
          matchesStatus = season.is_historical;
          break;
        default:
          matchesStatus = true;
      }
      
      return matchesSearch && matchesStatus;
    };
  }

  applyFilter(): void {
    this.dataSource.filter = Math.random().toString(); // Trigger filter
  }

  onSearchChange(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.applyFilter();
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter = status;
    this.applyFilter();
  }

  openCreateSeasonDialog(): void {
    this.router.navigate(['/v5/seasons/new']);
  }

  openEditSeasonDialog(season: Season): void {
    this.router.navigate(['/v5/seasons', season.id, 'edit']);
  }

  openCloneSeasonDialog(season: Season): void {
    // Navigate to create form with pre-filled data from the season to clone
    this.router.navigate(['/v5/seasons/new'], {
      queryParams: {
        clone: season.id,
        cloneName: `${season.name} (Copia)`
      }
    });
  }

  closeSeason(season: Season): void {
    const message = `¿Estás seguro de que quieres cerrar la temporada "${season.name}"?\n\nEsta acción marcará la temporada como cerrada, pero podrás reabrirla más tarde si es necesario.`;
    
    if (confirm(message)) {
      this.seasonService.closeSeason(season.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log(`✅ Temporada "${season.name}" cerrada exitosamente`);
            this.loadSeasons(); // Recargar la lista
          },
          error: (error) => {
            console.error('❌ Error cerrando temporada:', error);
          }
        });
    }
  }

  reopenSeason(season: Season): void {
    const message = `¿Estás seguro de que quieres reabrir la temporada "${season.name}"?\n\nEsta acción permitirá usar la temporada nuevamente.`;
    
    if (confirm(message)) {
      this.seasonService.reopenSeason(season.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log(`✅ Temporada "${season.name}" reabierta exitosamente`);
            this.loadSeasons(); // Recargar la lista
          },
          error: (error) => {
            console.error('❌ Error reabriendo temporada:', error);
          }
        });
    }
  }

  deleteSeason(season: Season): void {
    const message = `¿Estás seguro de que quieres ELIMINAR PERMANENTEMENTE la temporada "${season.name}"?\n\nEsta acción no se puede deshacer.`;
    
    if (confirm(message)) {
      this.seasonService.deleteSeason(season.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log(`✅ Temporada "${season.name}" eliminada exitosamente`);
            this.loadSeasons(); // Recargar la lista
          },
          error: (error) => {
            console.error('❌ Error eliminando temporada:', error);
          }
        });
    }
  }

  toggleSeasonActive(season: Season): void {
    if (season.is_active) {
      // Desactivar temporada
      const message = `¿Desactivar la temporada "${season.name}"?\n\nEsta temporada dejará de estar activa.`;
      if (confirm(message)) {
        this.seasonService.deactivateSeason(season.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              console.log(`✅ Temporada "${season.name}" desactivada`);
              this.loadSeasons();
            },
            error: (error) => {
              console.error('❌ Error desactivando temporada:', error);
            }
          });
      }
    } else {
      // Activar temporada y establecer como actual
      const message = `¿Activar la temporada "${season.name}"?\n\nEsta temporada se marcará como activa y será la temporada actual.`;
      if (confirm(message)) {
        this.seasonService.activateSeason(season.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              console.log(`✅ Temporada "${season.name}" activada`);
              this.seasonContext.setCurrentSeason(season.id); // También establecer como actual
              this.loadSeasons();
            },
            error: (error) => {
              console.error('❌ Error activando temporada:', error);
            }
          });
      }
    }
  }

  getStatusLabel(season: Season): string {
    if (season.is_historical) return 'Histórica';
    if (season.is_closed) return 'Cerrada';
    if (season.is_active) return 'Activa';
    return 'Inactiva';
  }

  getStatusClass(season: Season): string {
    if (season.is_historical) return 'status-historical';
    if (season.is_closed) return 'status-closed';
    if (season.is_active) return 'status-active';
    return 'status-inactive';
  }
}
