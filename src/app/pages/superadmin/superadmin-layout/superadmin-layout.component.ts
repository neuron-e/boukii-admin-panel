import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationItem } from '../../../../@vex/interfaces/navigation-item.interface';
import { NavigationService } from '../../../../@vex/services/navigation.service';
import { ConfigService } from '../../../../@vex/config/config.service';
import { VexConfig } from '../../../../@vex/config/vex-config.interface';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-superadmin-layout',
  templateUrl: './superadmin-layout.component.html',
  styleUrls: ['./superadmin-layout.component.scss']
})
export class SuperadminLayoutComponent implements OnInit, OnDestroy {
  private previousNav: NavigationItem[] = [];
  private previousConfig: VexConfig | null = null;

  constructor(
    private navigationService: NavigationService,
    private configService: ConfigService,
  ) {}

  ngOnInit(): void {
    this.previousNav = [...this.navigationService.items];

    this.configService.config$.pipe(take(1)).subscribe(config => {
      this.previousConfig = config;
      this.configService.updateConfig({
        sidenav: {
          title: 'Superadmin',
          imageUrl: '',
          showCollapsePin: true,
        }
      });
    });

    this.navigationService.items = [
      {
        type: 'subheading',
        label: 'superadmin.title',
        children: [
          {
            type: 'link',
            label: 'superadmin.dashboard',
            route: '/superadmin/dashboard',
            icon: '../assets/img/icons/home-2.png',
            icon_active: '../assets/img/icons/home.svg',
            routerLinkActiveOptions: { exact: true },
          },
          {
            type: 'link',
            label: 'superadmin.schools',
            route: '/superadmin/schools',
            icon: '../assets/img/icons/cursos-2.svg',
            icon_active: '../assets/img/icons/cursos.svg',
            routerLinkActiveOptions: { exact: true },
          },
          {
            type: 'link',
            label: 'superadmin.roles',
            route: '/superadmin/roles',
            icon: '../assets/img/icons/reglajes-2.svg',
            icon_active: '../assets/img/icons/reglages.svg',
            routerLinkActiveOptions: { exact: true },
          },
          {
            type: 'link',
            label: 'superadmin.admins',
            route: '/superadmin/admins',
            icon: '../assets/img/icons/admin.svg',
            icon_active: '../assets/img/icons/Admins.svg',
            routerLinkActiveOptions: { exact: true },
          },
          {
            type: 'link',
            label: 'superadmin.impersonate',
            route: '/superadmin/impersonate',
            icon: '../assets/img/icons/clientes2.svg',
            icon_active: '../assets/img/icons/clientes.svg',
            routerLinkActiveOptions: { exact: true },
          },
        ]
      }
    ];
  }

  ngOnDestroy(): void {
    if (this.previousNav?.length) {
      this.navigationService.items = [...this.previousNav];
    }

    if (this.previousConfig) {
      this.configService.updateConfig({
        sidenav: {
          title: this.previousConfig.sidenav.title,
          imageUrl: this.previousConfig.sidenav.imageUrl,
          showCollapsePin: this.previousConfig.sidenav.showCollapsePin,
        }
      });
    }
  }
}
