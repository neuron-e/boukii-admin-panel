import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  public baseUrl: string = environment.baseUrl;

  constructor(public http: HttpClient) { }

  getHeaders(): HttpHeaders {
    const token = JSON.parse(localStorage.getItem('boukiiUserToken') || '');
    let headers = new HttpHeaders();
    headers = headers
      .set('content-type', 'application/json')
      .set('Authorization', 'Bearer ' + token);

    return headers;
  }

  getHeadersLogin(): HttpHeaders {
    let headers = new HttpHeaders();
    headers = headers
      .set('content-type', 'application/json');

    return headers;
  }
}
