import { Component, ElementRef, HostBinding, Input } from '@angular/core';
import { LayoutService } from '../../services/layout.service';
import { ConfigService } from '../../config/config.service';
import { map, startWith, switchMap } from 'rxjs/operators';
import { NavigationService } from '../../services/navigation.service';
import { PopoverService } from '../../components/popover/popover.service';
import { MegaMenuComponent } from '../../components/mega-menu/mega-menu.component';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { AddTaskComponent } from './add-task/add-task.component';
import moment from 'moment';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiCrudService } from 'src/service/crud.service';
import { saveAs } from 'file-saver';

@Component({
  selector: 'vex-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent {

  @Input() mobileQuery: boolean;

  @Input()
  @HostBinding('class.shadow-b')
  hasShadow: boolean;

  navigationItems = this.navigationService.items;
  currentLangCode: string = 'ES';
  isHorizontalLayout$: Observable<boolean> = this.configService.config$.pipe(map(config => config.layout === 'horizontal'));
  isVerticalLayout$: Observable<boolean> = this.configService.config$.pipe(map(config => config.layout === 'vertical'));
  isNavbarInToolbar$: Observable<boolean> = this.configService.config$.pipe(map(config => config.navbar.position === 'in-toolbar'));
  isNavbarBelowToolbar$: Observable<boolean> = this.configService.config$.pipe(map(config => config.navbar.position === 'below-toolbar'));
  userVisible$: Observable<boolean> = this.configService.config$.pipe(map(config => config.toolbar.user.visible));
  megaMenuOpen$: Observable<boolean> = of(false);

  slug: string = ""
  constructor(
    public layoutService: LayoutService,
    private configService: ConfigService,
    private navigationService: NavigationService,
    private popoverService: PopoverService,
    private router: Router,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private translateService: TranslateService,
    private crudService: ApiCrudService) {
    this.slug = JSON.parse(localStorage.getItem('boukiiUser')).schools[0].slug;
    const initialLang = sessionStorage.getItem('lang') || this.translateService.currentLang || this.translateService.getDefaultLang() || 'es';
    this.currentLangCode = initialLang ? initialLang.toUpperCase() : 'ES';
  }

  openQuickpanel(): void {
    this.layoutService.openQuickpanel();
  }

  openSidenav(): void {
    this.layoutService.openSidenav();
  }

  exportAllCourses(): void {
    try {
      const userRaw = localStorage.getItem('boukiiUser');
      const schoolId = userRaw ? JSON.parse(userRaw)?.schools?.[0]?.id : null;
      if (!schoolId) {
        this.snackbar.open(this.translateService.instant('no_school_selected') || 'No school selected', 'Cerrar', { duration: 3000 });
        return;
      }
      const lang = this.translateService.currentLang || 'en';
      this.crudService.getFile(`/admin/schools/${schoolId}/courses/export/${lang}`)
        .subscribe((data: any) => {
          const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          saveAs(blob, `school_${schoolId}_courses.xlsx`);
        }, (error: any) => {
          console.error('Error al descargar export de cursos', error);
          this.snackbar.open(this.translateService.instant('download_error') || 'Error downloading export', 'Cerrar', { duration: 3000 });
        });
    } catch (e) {
      console.error('exportAllCourses failed', e);
      this.snackbar.open(this.translateService.instant('download_error') || 'Error downloading export', 'Cerrar', { duration: 3000 });
    }
  }

  changeLang(lang: string) {
    if (this.translateService.getLangs().indexOf(lang) !== -1) {

      this.translateService.use(lang);
      this.translateService.currentLang = lang;
      sessionStorage.setItem('lang', lang);
      moment.locale(this.setLocale(lang));
    } else {
      this.translateService.setDefaultLang(lang);
      this.translateService.currentLang = lang;
      sessionStorage.setItem('lang', lang);
      moment.locale(this.setLocale(lang));
    }
    this.currentLangCode = lang.toUpperCase();
  }

  setLocale(lang: string) {
    let locale;

    // Establece el locale basado en el idioma
    switch (lang) {
      case 'it':
        locale = 'it-IT';
        break;
      case 'en':
        locale = 'en-GB';
        break;
      case 'es':
        locale = 'es';
        break;
      case 'de':
        locale = 'de';
        break;
      case 'fr':
        locale = 'fr';
        break;
      default:
        locale = 'en-GB';
    }
    return locale
  }

  openMegaMenu(origin: ElementRef | HTMLElement): void {
    this.megaMenuOpen$ = of(
      this.popoverService.open({
        content: MegaMenuComponent,
        origin,
        offsetY: 12,
        position: [
          {
            originX: 'start',
            originY: 'bottom',
            overlayX: 'start',
            overlayY: 'top'
          },
          {
            originX: 'end',
            originY: 'bottom',
            overlayX: 'end',
            overlayY: 'top',
          },
        ]
      })
    ).pipe(
      switchMap(popoverRef => popoverRef.afterClosed$.pipe(map(() => false))),
      startWith(true),
    );
  }

  openSearch(): void {
    this.layoutService.openSearch();
  }

  goTo(route: string) {
    this.router.navigate([route]);
  }

  addTask() {
    const dialog = this.dialog.open(AddTaskComponent, {});
    dialog.afterClosed().subscribe((data) => {
      if (data) this.snackbar.open(this.translateService.instant('task_created'), 'OK', { duration: 3000 })
    })
  }

  goToReservationPage(router: string) {
    window.open(router, "_blank");
  }
}
