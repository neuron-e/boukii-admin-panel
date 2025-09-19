import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { ApiCrudService } from 'src/service/crud.service';

@Component({
  selector: 'vex-widget-assistant',
  templateUrl: './widget-assistant.component.html',
  styleUrls: ['./widget-assistant.component.scss']
})
export class WidgetAssistantComponent implements OnInit {

  user: any;
  today = new Date();
  @Input() date: any;
  @Output() dateEvent = new EventEmitter<any>();
  weather: any[] = [];
  constructor(public translateService: TranslateService, private crudService: ApiCrudService) { }

  ngOnInit() {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
    this.date = moment();
    this.getWeather();
  }

  getLocale(date: any) {
    return moment(date).locale(this.translateService.currentLang).format('ll');
  }

  getWeather() {
    this.crudService.get('/admin/weather')
      .subscribe({
        next: (data) => {
          this.weather = Array.isArray(data.data) ? data.data : [];
        },
        error: () => {
          this.weather = [];
        }
      });
  }

  emitDate(event: any) {
    this.dateEvent.emit(event.value);
  }
}
