import { Component, Input, OnInit } from '@angular/core';
import { NavigationItem, NavigationLink } from '../../interfaces/navigation-item.interface';
import { filter, map, startWith } from 'rxjs/operators';
import { NavigationEnd, Router } from '@angular/router';
import { NavigationService } from '../../services/navigation.service';
import { trackByRoute } from '../../utils/track-by';
import { PermissionsService } from 'src/service/permissions.service';

@Component({
  selector: 'vex-navigation-item',
  templateUrl: './navigation-item.component.html',
  styleUrls: ['./navigation-item.component.scss']
})
export class NavigationItemComponent implements OnInit {

  @Input() item: NavigationItem;

  isActive$ = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    startWith(null),
    map(() => (item: NavigationItem) => this.hasActiveChilds(item))
  );

  isLink = this.navigationService.isLink;
  isDropdown = this.navigationService.isDropdown;
  isSubheading = this.navigationService.isSubheading;
  trackByRoute = trackByRoute;

  constructor(private navigationService: NavigationService,
              private router: Router,
              private permissions: PermissionsService) { }

  ngOnInit() {
  }

  hasActiveChilds(parent: NavigationItem): boolean {
    if (this.isLink(parent)) {
      return this.router.isActive(parent.route as string, true);
    }

    if (this.isDropdown(parent) || this.isSubheading(parent)) {
      return parent.children.some(child => {
        if (this.isDropdown(child)) {
          return this.hasActiveChilds(child);
        }

        if (this.isLink(child) && !this.isFunction(child.route)) {
          return this.router.isActive(child.route as string, true);
        }

        return false;
      });
    }

    return false;
  }

  isFunction(prop: NavigationLink['route']) {
    return prop instanceof Function;
  }

  canShow(item: NavigationItem): boolean {
    if (this.permissions.isSuperadmin()) {
      return true;
    }

    const permissions = (item as any)?.permissions as string[] | undefined;
    const roles = (item as any)?.roles as string[] | undefined;

    if (!permissions?.length && !roles?.length) {
      return true;
    }

    if (roles?.length && roles.some((role) => this.permissions.hasRole(role))) {
      return true;
    }

    if (permissions?.length && this.permissions.hasAnyPermission(permissions)) {
      return true;
    }

    return false;
  }

  getVisibleChildren(item: NavigationItem): NavigationItem[] {
    if (!this.isDropdown(item) && !this.isSubheading(item)) {
      return [];
    }
    return item.children.filter((child) => this.canShow(child));
  }
}
