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

  getSchoolDetails(id: number) {
    return this.crud.get(`/superadmin/schools/${id}/details`);
  }

  updateSchool(id: number, payload: any) {
    return this.crud.update('/superadmin/schools', payload, id);
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

  updateAdmin(id: number, payload: any) {
    return this.crud.update('/superadmin/admins', payload, id);
  }

  resetAdminPassword(id: number, payload: any) {
    return this.crud.post(`/superadmin/admins/${id}/reset-password`, payload);
  }

  deleteAdmin(id: number, params: any = {}) {
    const query = params && Object.keys(params).length
      ? '?' + new URLSearchParams(params).toString()
      : '';
    return this.crud.delete(`/superadmin/admins${query}`, id);
  }

  listMonitors(params: any = {}) {
    return this.crud.get('/superadmin/monitors', [], params);
  }

  listNotifications(params: any = {}) {
    return this.crud.get('/superadmin/notifications', [], params);
  }

  getNotificationStats() {
    return this.crud.get('/superadmin/notifications/stats');
  }

  createNotification(payload: any) {
    return this.crud.post('/superadmin/notifications', payload);
  }

  impersonate(payload: any) {
    return this.crud.post('/superadmin/impersonate', payload);
  }
}
