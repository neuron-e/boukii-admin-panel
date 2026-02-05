import { Injectable } from '@angular/core';
import { ApiCrudService } from 'src/service/crud.service';

@Injectable({
  providedIn: 'root'
})
export class SuperadminService {
  constructor(private crud: ApiCrudService) {}

  login(email: string, password: string) {
    return this.crud.login('/superadmin/login', { email, password });
  }

  getDashboard() {
    return this.crud.get('/superadmin/dashboard');
  }

  listSchools(params: any = {}) {
    return this.crud.get('/superadmin/schools', [], params);
  }

  createSchool(payload: any) {
    return this.crud.post('/superadmin/schools', payload);
  }

  listRoles() {
    return this.crud.get('/superadmin/roles');
  }

  createRole(payload: any) {
    return this.crud.post('/superadmin/roles', payload);
  }

  listAdmins(params: any = {}) {
    return this.crud.get('/superadmin/admins', [], params);
  }

  createAdmin(payload: any) {
    return this.crud.post('/superadmin/admins', payload);
  }

  impersonate(payload: any) {
    return this.crud.post('/superadmin/impersonate', payload);
  }
}
