import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LayoutModule } from '@angular/cdk/layout';
import { TranslateModule } from '@ngx-translate/core';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { V5RoutingModule } from './v5-routing.module';
import { V5LayoutComponent } from './layout/v5-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthV5Interceptor } from './core/interceptors/auth-v5.interceptor';
import { LoadingInterceptor } from './core/interceptors/loading.interceptor';
import { ApiV5Service } from './core/services/api-v5.service';
import { SeasonContextService } from './core/services/season-context.service';
import { AuthV5Service } from './core/services/auth-v5.service';
import { NotificationService } from './core/services/notification.service';
import { LoadingService } from './core/services/loading.service';
import { DashboardService } from './core/services/dashboard.service';
import { TokenV5Service } from './core/services/token-v5.service';
import {SharedModule} from './shared/shared.module';
@NgModule({
  declarations: [
    V5LayoutComponent,
    DashboardComponent,
    NavbarComponent,
    SidebarComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    LayoutModule,
    TranslateModule,
    //StoreModule.forRoot({}),
    EffectsModule.forRoot([]),
    V5RoutingModule,
    SharedModule
  ],
  providers: [
    ApiV5Service,
    SeasonContextService,
    AuthV5Service,
    TokenV5Service,
    NotificationService,
    LoadingService,
    DashboardService,
    { provide: HTTP_INTERCEPTORS, useClass: AuthV5Interceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: LoadingInterceptor, multi: true }
  ]
})
export class V5Module {}
