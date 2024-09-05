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

          localStorage.setItem('boukiiUser', JSON.stringify(user.data.user));
          localStorage.setItem('boukiiUserToken', JSON.stringify(user.data.token));
          this.user = user.data.user;

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
