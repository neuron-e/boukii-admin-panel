import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { fadeInUp400ms } from 'src/@vex/animations/fade-in-up.animation';
import { AuthService } from 'src/service/auth.service';
import {TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'vex-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeInUp400ms
  ]
})
export class LoginComponent implements OnInit {

  form: UntypedFormGroup;
  currentLangCode: string = 'ES';

  inputType = 'password';
  visible = false;

  constructor(private router: Router,
              private fb: UntypedFormBuilder,
              private cd: ChangeDetectorRef,
              private snackbar: MatSnackBar,
              private authService: AuthService,
              private translateService: TranslateService
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      email: ['', Validators.required],
      password: ['', Validators.required]
    });
    const initialLang = sessionStorage.getItem('lang') || this.translateService.currentLang || this.translateService.getDefaultLang() || 'es';
    this.currentLangCode = initialLang.toUpperCase();
  }

  send() {
    this.authService.login(this.form.value.email, this.form.value.password);

  }

  changeLang(lang: string) {
    if (this.translateService.getLangs().indexOf(lang) !== -1) {

      this.translateService.use(lang);
      this.translateService.currentLang = lang;
      sessionStorage.setItem('lang', lang);
    } else {

      this.translateService.setDefaultLang(lang);
      this.translateService.currentLang = lang;
      sessionStorage.setItem('lang', lang);
    }
    this.currentLangCode = lang.toUpperCase();
  }

  toggleVisibility() {
    if (this.visible) {
      this.inputType = 'password';
      this.visible = false;
      this.cd.markForCheck();
    } else {
      this.inputType = 'text';
      this.visible = true;
      this.cd.markForCheck();
    }
  }
}
