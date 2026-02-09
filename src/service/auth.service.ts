import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { HttpClient } from '@angular/common/http';
import { ApiCrudService } from './crud.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfigService } from 'src/@vex/config/config.service';
import { SchoolService } from './school.service';
import { defaultConfig } from 'src/@vex/config/configs';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService extends ApiService {
  user: any | null = null;

  constructor(private router: Router, http: HttpClient, private crudService: ApiCrudService, private snackbar: MatSnackBar,
    private schoolService: SchoolService, private configService: ConfigService, private translateService: TranslateService) {
    super(http)
    const user = JSON.parse(localStorage.getItem('boukiiUser'));
    if (user) {
      this.user = user;
    }

    /*onAuthStateChanged(auth, (user) => {
      if (user) {
        this.user = user;
        localStorage.setItem('boukiiUser', JSON.stringify(user));
      } else {
        this.user = null;
        localStorage.removeItem('boukiiUser');
      }
    });*/
  }

  async login(email: string, password: string) {
    try {

      this.crudService.login('/admin/login', {email: email, password: password})
        .subscribe((user: any) => {
          const payload = user?.data ?? user;
          const userData = payload?.user ?? payload;
          if (payload?.permissions && !userData?.permissions) {
            userData.permissions = payload.permissions;
          }
          if (payload?.roles && !userData?.role_names) {
            userData.role_names = payload.roles;
          }

          localStorage.setItem('boukiiUser', JSON.stringify(userData));
          localStorage.setItem('boukiiUserToken', JSON.stringify(payload?.token));
          this.user = userData;

          const isSuperadmin = this.user?.type === 'superadmin' || this.user?.type === 4;
          if (isSuperadmin) {
            this.configService.updateConfig({
              sidenav: {
                imageUrl: '',
                title: 'Superadmin',
                showCollapsePin: false
              }
            });
            this.router.navigate(['/superadmin/dashboard']);
            return;
          }

          setTimeout(() => {
            this.schoolService.getSchoolData(this.user, true)
            .subscribe((data) => {
              defaultConfig.imgSrc = data.data.logo;
              this.configService.updateConfig({
                sidenav: {
                  imageUrl: data.data.logo,
                  title: data.data.name,
                  showCollapsePin: false
                }
              });
              this.router.navigate(['/home']);

            })
          }, 150);


        }, (error) => {
          this.snackbar.open(this.translateService.instant('snackbar.credential_error'), 'OK', {duration: 3000});
        })
    } catch (error) {
      this.snackbar.open(this.translateService.instant('snackbar.credential_error'), 'OK', {duration: 3000});
    }
  }

  async logout() {
    this.user = null;
    localStorage.removeItem('boukiiUser');
    localStorage.removeItem('boukiiUserToken');
    this.configService.updateConfig({
      sidenav: {
        imageUrl: '',
        title: '',
        showCollapsePin: false
      }
    });
  }

  isLoggedIn() {
    return this.user !== null;
  }

}
