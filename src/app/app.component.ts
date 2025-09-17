import { Component, Inject, LOCALE_ID, Renderer2 } from "@angular/core";
import { ConfigService } from "../@vex/config/config.service";
import { Settings } from "luxon";
import { DOCUMENT, registerLocaleData } from "@angular/common";
import { Platform } from "@angular/cdk/platform";
import { NavigationService } from "../@vex/services/navigation.service";
import { LayoutService } from "../@vex/services/layout.service";
import { ActivatedRoute } from "@angular/router";
import { coerceBooleanProperty } from "@angular/cdk/coercion";
import { SplashScreenService } from "../@vex/services/splash-screen.service";
import { VexConfigName } from "../@vex/config/config-name.model";
import { ColorSchemeName } from "../@vex/config/colorSchemeName";
import {
  MatIconRegistry,
  SafeResourceUrlWithIconOptions,
} from "@angular/material/icon";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import {
  ColorVariable,
  colorVariables,
} from "../@vex/components/config-panel/color-variables";
import { defaultConfig } from "src/@vex/config/configs";
import { SchoolService } from "src/service/school.service";
import { TranslateService } from "@ngx-translate/core";
import localeIt from "@angular/common/locales/it";
import localeEnGb from "@angular/common/locales/en-GB";
import localeEs from "@angular/common/locales/es";
import localeDe from "@angular/common/locales/de";
import localeFr from "@angular/common/locales/fr";

@Component({
  selector: "vex-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {
  user: any;
  locales: { locale: any, lan: string }[] =
    [
      { locale: localeEs, lan: 'es' },
      { locale: localeIt, lan: 'it-IT' },
      { locale: localeEnGb, lan: 'en-GB' },
      { locale: localeDe, lan: 'de' },
      { locale: localeFr, lan: 'fr' },
    ]

  constructor(private configService: ConfigService,
    private renderer: Renderer2,
    private platform: Platform,
    @Inject(DOCUMENT) private document: Document,
    @Inject(LOCALE_ID) private localeId: string,
    public layoutService: LayoutService,
    private route: ActivatedRoute,
    private translateService: TranslateService,
    private navigationService: NavigationService,
    public splashScreenService: SplashScreenService,
    private schoolService: SchoolService,
    private readonly matIconRegistry: MatIconRegistry,
    private readonly domSanitizer: DomSanitizer) {
    for (const locale of this.locales) registerLocaleData(locale.locale, locale.lan)
    if (this.locales.find((a: any) => a.lan === this.localeId)) Settings.defaultLocale = this.localeId;
    else Settings.defaultLocale = this.locales[0].lan;
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
    layoutService.isDarkMode = !layoutService.isDarkMode
    layoutService.toggleDarkMode()
    const lang = sessionStorage.getItem('lang');
    if (lang && lang.length > 0) {
      this.translateService.setDefaultLang(lang);
      this.translateService.currentLang = lang;
    } else {
      if (this.locales.find((a: any) => a.lan === navigator.language.split('-')[0])) {
        this.translateService.setDefaultLang(navigator.language.split('-')[0]);
        this.translateService.currentLang = navigator.language.split('-')[0];
        sessionStorage.setItem('lang', navigator.language.split("-")[0]);
      } else {
        this.translateService.setDefaultLang(this.locales[0].lan);
        this.translateService.currentLang = this.locales[0].lan;
      }
    }
    setTimeout(() => {
      if (this.user) {
        this.schoolService.getSchoolData().subscribe((data) => {
          defaultConfig.imgSrc = data.data.logo;
          this.configService.updateConfig({
            sidenav: {
              imageUrl: data.data.logo,
              title: data.data.name,
              showCollapsePin: true,
            },
          });
        });
      }
    }, 150);

    if (this.platform.BLINK) {
      this.renderer.addClass(this.document.body, "is-blink");
    }

    this.matIconRegistry.addSvgIconResolver(
      (
        name: string,
        namespace: string
      ): SafeResourceUrl | SafeResourceUrlWithIconOptions | null => {
        switch (namespace) {
          case "mat":
            return this.domSanitizer.bypassSecurityTrustResourceUrl(
              `assets/img/icons/material-design-icons/two-tone/${name}.svg`
            );

          case "logo":
            return this.domSanitizer.bypassSecurityTrustResourceUrl(
              `assets/img/icons/logos/${name}.svg`
            );

          case "flag":
            return this.domSanitizer.bypassSecurityTrustResourceUrl(
              `assets/img/icons/flags/${name}.svg`
            );
        }
      }
    );

    /**
     * Customize the template to your needs with the ConfigService
     * Example:
     *  this.configService.updateConfig({
     *    sidenav: {
     *      title: 'Custom App',
     *      imageUrl: '//placehold.it/100x100',
     *      showCollapsePin: false
     *    },
     *    footer: {
     *      visible: false
     *    }
     *  });
     */

    /**
     * Config Related Subscriptions
     * You can remove this if you don't need the functionality of being able to enable specific configs with queryParams
     * Example: example.com/?layout=apollo&style=default
     */
    this.route.queryParamMap.subscribe((queryParamMap) => {
      if (queryParamMap.has("layout")) {
        this.configService.setConfig(
          queryParamMap.get("layout") as VexConfigName
        );
      }

      if (queryParamMap.has("style")) {
        this.configService.updateConfig({
          style: {
            colorScheme: queryParamMap.get("style") as ColorSchemeName,
          },
        });
      }

      if (queryParamMap.has("primaryColor")) {
        const color: ColorVariable =
          colorVariables[queryParamMap.get("primaryColor")];

        if (color) {
          this.configService.updateConfig({
            style: {
              colors: {
                primary: color,
              },
            },
          });
        }
      }

      if (queryParamMap.has("rtl")) {
        this.configService.updateConfig({
          direction: coerceBooleanProperty(queryParamMap.get("rtl"))
            ? "rtl"
            : "ltr",
        });
      }
    });

    /**
     * Add your own routes here
     */
    const provider = this.schoolService.getPaymentProvider();
    const gatewayLabel = provider === 'payyo' ? this.translateService.instant('payment_payyo') : 'Boukii Pay';
    const gatewayRoute = provider === 'payyo' ? 'https://merchant.payyo.ch/' : 'https://login.pay.boukii.com/fr/';

    this.navigationService.items = [
      /*{
        type: 'link',
        label: 'Dashboard',
        route: '/dashboard',
        icon: 'mat:insights',
        routerLinkActiveOptions: { exact: true }
      },*/

      {
        type: "subheading",
        label: "",//"menu.settings",
        children: [
          {
            type: "link",
            label: "menu.home",
            route: "/home",
            icon: "../assets/img/icons/home-2.png",
            icon_active: "../assets/img/icons/home.svg",
            routerLinkActiveOptions: { exact: true },
          },
          {
            type: "link",
            label: "timeline.timeline",
            route: "/timeline",
            icon: "../assets/img/icons/planificador-2.png",
            icon_active: "../assets/img/icons/planificador.png",

            routerLinkActiveOptions: { exact: true },
          },
          /*          {
            type: 'link',
            label: 'calendar',
            route: '/calendar',
            icon: '../assets/img/icons/calendar-2.svg',
            icon_active: '../assets/img/icons/calendar.svg',
            routerLinkActiveOptions: { exact: true }
          },*/
          {
            type: "link",
            label: "bookings",
            route: "/bookings",
            icon: "../assets/img/icons/reservas-2.svg",
            icon_active: "../assets/img/icons/reservas.svg",
            routerLinkActiveOptions: { exact: true },
          },
          {
            type: "link",
            label: "courses.title",
            route: "/courses",
            icon: "../assets/img/icons/cursos-2.svg",
            icon_active: "../assets/img/icons/cursos.svg",
            routerLinkActiveOptions: { exact: true },
          },
          {
            type: "link",
            label: "menu.bonus",
            route: "/vouchers",
            icon: "../assets/img/icons/bonos-2.svg",
            icon_active: "../assets/img/icons/bonos.svg",
            routerLinkActiveOptions: { exact: true },
          },
          {
            type: "link",
            label: "menu.communication",
            route: "/communications",
            icon: "../assets/img/icons/comunicacion-2.svg",
            icon_active: "../assets/img/icons/comunicacion.svg",
            routerLinkActiveOptions: { exact: true },
          },
          {
            type: "link",
            label: "menu.stats",
            route: "/stats",
            icon: "../assets/img/icons/stats-2.svg",
            icon_active: "../assets/img/icons/stats.svg",
            routerLinkActiveOptions: { exact: true },
          },
        ],
      },
      // Otra seccion
      {
        type: "subheading",
        label: "menu.people",
        children: [
          {
            type: "link",
            label: "menu.monitors",
            route: "/monitors",
            icon: "../assets/img/icons/monitores-3.svg",
            icon_active: "../assets/img/icons/monitores-2.svg",
            routerLinkActiveOptions: { exact: true },
          },
          {
            type: "link",
            label: "clients",
            route: "/clients",
            icon: "../assets/img/icons/clientes2.svg",
            icon_active: "../assets/img/icons/clientes.svg",
            routerLinkActiveOptions: { exact: true },
          },
          {
            type: "link",
            label: "admins",
            route: "/admins",
            icon: "../assets/img/icons/admin.svg",
            icon_active: "../assets/img/icons/Admins.svg",
            routerLinkActiveOptions: { exact: true },
          },
        ],
      },
      {
        type: "subheading",
        label: "menu.config",
        children: [
          {
            type: "link",
            label: gatewayLabel,
            route: gatewayRoute,
            icon: "../assets/img/icons/boukii_pay.svg",
            routerLinkActiveOptions: { exact: true },
          },
          {
            type: "link",
            label: "settings",
            route: "/settings",
            icon: "../assets/img/icons/reglajes-2.svg",
            icon_active: "../assets/img/icons/reglages.svg",
            routerLinkActiveOptions: { exact: true },
          },
        ],
      },
    ];
  }


}
