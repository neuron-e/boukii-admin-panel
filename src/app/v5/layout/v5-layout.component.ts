import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenav } from '@angular/material/sidenav';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-v5-layout',
  templateUrl: './v5-layout.component.html',
  styleUrls: ['./v5-layout.component.scss']
})
export class V5LayoutComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  
  private destroy$ = new Subject<void>();
  isMobile = false;

  constructor(private breakpointObserver: BreakpointObserver) {}

  ngOnInit(): void {
    // Detect if we're on mobile
    this.breakpointObserver
      .observe([Breakpoints.HandsetPortrait, Breakpoints.TabletPortrait])
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.isMobile = result.matches;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Only close sidebar if on mobile
  onSidebarNavigate(): void {
    if (this.isMobile && this.sidenav) {
      this.sidenav.close();
    }
  }

  // Toggle sidebar (called from navbar)
  onMenuToggle(): void {
    if (this.sidenav) {
      this.sidenav.toggle();
    }
  }
}
