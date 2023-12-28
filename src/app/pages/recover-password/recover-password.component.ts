import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { fadeInUp400ms } from 'src/@vex/animations/fade-in-up.animation';
import { AuthService } from 'src/service/auth.service';
import { ApiCrudService } from 'src/service/crud.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'vex-recover-password',
  templateUrl: './recover-password.component.html',
  styleUrls: ['./recover-password.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    fadeInUp400ms
  ]
})
export class RecoverPasswordComponent implements OnInit {

  form: UntypedFormGroup;

  inputType = 'password';
  visible = false;
  visibleRepeat = false;
  loading = true;
  updated = false;
  token: any;
  id: any;

  constructor(private router: Router,
              private fb: UntypedFormBuilder,
              private cd: ChangeDetectorRef,
              private crudService: ApiCrudService,
              private activatedRoute: ActivatedRoute,
              private snackbar: MatSnackBar,
              private translateService: TranslateService
  ) {}

  ngOnInit() {
    this.token = this.activatedRoute.snapshot.params.token;
    this.id = this.activatedRoute.snapshot.queryParams.user;


    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6), this.passwordValidator]],
      password_repeat: ['', [Validators.required, Validators.minLength(6), this.passwordValidator]]
    });

    this.loading = false;
  }

  passwordValidator(formControl: FormControl) {
    const { value } = formControl;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);

    if (hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar) {
      return null;
    } else {
      return { passwordStrength: true };
    }
  }

  send() {
    //this.authService.login(this.form.value.email, this.form.value.password);
    this.crudService.recoverPassword('/users', {token: this.token, password: this.form.value.password, type: 'client', active: true}, this.id)
      .subscribe(() => {
        this.snackbar.open(this.translateService.instant('snackbar.password_updated') , 'OK', {duration: 3000});
        this.updated = true;
        this.router.navigate(['']);
      })
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

  toggleVisibilityRepeat() {
    if (this.visibleRepeat) {
      this.inputType = 'password';
      this.visibleRepeat = false;
      this.cd.markForCheck();
    } else {
      this.inputType = 'text';
      this.visibleRepeat = true;
      this.cd.markForCheck();
    }
  }
}
