import { BrowserModule } from '@angular/platform-browser';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { VexModule } from '../@vex/vex.module';
import { HttpClientModule, HttpClient, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CustomLayoutModule } from './custom-layout/custom-layout.module';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ComponentsModule } from 'src/@vex/components/components.module';
import { AuthService } from 'src/service/auth.service';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { DateAdapter, MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { HttpErrorInterceptor } from './core/http-error.interceptor';
import { PreviewModalComponent } from './components/preview-modal/preview-modal.component';
import { MatDialogModule } from '@angular/material/dialog';
import { ComponentsCustomModule } from './components/components-custom.module';
import { CurrencyFormatterPipe } from './pipes/currency-formatter.pipe';
import { PercentageFormatterPipe } from './pipes/percentage-formatter.pipe';
import { NumberFormatterPipe } from './pipes/number-formatter.pipe';
import { DateRangeFormatterPipe } from './pipes/date-range-formatter.pipe';
import { ChronoService } from 'src/service/chrono.service';
import { firstValueFrom } from 'rxjs';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
    return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

// Initialize translations before app starts
export function initializeTranslations(translate: TranslateService): () => Promise<void> {
    return async () => {
        const supportedLangs = ['es', 'en', 'de', 'fr', 'it'];
        const storedLang = sessionStorage.getItem('lang');
        const browserLang = navigator.language.split('-')[0];
        const lang = storedLang || (supportedLangs.includes(browserLang) ? browserLang : 'es');
        translate.setDefaultLang(lang);
        await firstValueFrom(translate.use(lang));
    };
}

export class MondayDateAdapter extends NativeDateAdapter {
    override getFirstDayOfWeek(): number {
        return 1;
    }
}

@NgModule({
    declarations: [AppComponent, DashboardComponent, PreviewModalComponent, CurrencyFormatterPipe, PercentageFormatterPipe, NumberFormatterPipe, DateRangeFormatterPipe],
    imports: [
        BrowserModule,
        AppRoutingModule,
        BrowserAnimationsModule,
        HttpClientModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: HttpLoaderFactory,
                deps: [HttpClient]
            }
        }),
        // Vex
        VexModule,
        CustomLayoutModule,
        ComponentsModule,
        MatDialogModule,
        ComponentsCustomModule
    ],
    providers: [
        AuthService,
        ChronoService,
        { provide: DateAdapter, useClass: MondayDateAdapter },
        { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
        { provide: HTTP_INTERCEPTORS, useClass: HttpErrorInterceptor, multi: true },
        { provide: APP_INITIALIZER, useFactory: initializeTranslations, deps: [TranslateService], multi: true },
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
