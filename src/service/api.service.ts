import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  public baseUrl: string = environment.baseUrl + '/api';

  constructor(public http: HttpClient) { }

  protected readStorageJson<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  getHeaders(): HttpHeaders {
    const token = this.readStorageJson<string>('boukiiUserToken');
    let headers = new HttpHeaders();
    headers = headers
      .set('content-type', 'application/json');

    if (token) {
      headers = headers.set('Authorization', 'Bearer ' + token);
    }

    return headers;
  }

  getHeadersLogin(): HttpHeaders {
    let headers = new HttpHeaders();
    headers = headers
      .set('content-type', 'application/json');

    return headers;
  }
}
