import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CalendarEvent, CalendarEventAction, CalendarEventTimesChangedEvent, CalendarView } from 'angular-calendar';
import { addDays, addHours, endOfDay, endOfMonth, isSameDay, isSameMonth, startOfDay, subDays } from 'date-fns';
import { CalendarEditComponent } from './calendar-edit/calendar-edit.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import * as moment from 'moment';
import { ActivatedRoute } from '@angular/router';
import { ApiCrudService } from 'src/service/crud.service';
import { EventService } from 'src/service/event.service';
import { TranslateService } from '@ngx-translate/core';

const colors: any = {
  blue: {
    primary: '#5c77ff',
    secondary: '#FFFFFF'
  },
  yellow: {
    primary: '#ffc107',
    secondary: '#FDF1BA'
  },
  red: {
    primary: '#f44336',
    secondary: '#FFFFFF'
  }
};

@Component({
  selector: 'vex-monitor-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {

  @ViewChild('modalContent', { static: true }) modalContent?: TemplateRef<any>;

  view: CalendarView = CalendarView.Week;

  CalendarView = CalendarView;

  viewDate: Date = new Date();
  weekStartsOn = 1;

  refresh: Subject<any> = new Subject();
  actions: CalendarEventAction[] = [
    {
      label: '<i class="fa fa-fw fa-pencil"></i>',
      onClick: ({ event }: { event: CalendarEvent }): void => {
        this.handleUpdateEvent('Edited', event);
      }
    },
    {
      label: '<i class="fa fa-fw fa-times"></i>',
      onClick: ({ event }: { event: CalendarEvent }): void => {
        this.events = this.events.filter((iEvent) => iEvent !== event);
        this.deleteEvent(event);
      }
    }
  ];
  events: any[] = [];
  activeDayIsOpen = true;

  user: any;
  id: any;

  constructor(
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private activatedRoute: ActivatedRoute,
    private crudService: ApiCrudService,
    private eventService: EventService,
    private translateService: TranslateService
  ) {
    this.id = this.activatedRoute.snapshot.params.id;
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));;


  }

  ngOnInit() {
    this.getData();
  }

  getData() {
    this.events = [];
    this.crudService.list('/monitor-nwds', 1, 10000, 'desc', 'id', '&school_id=' + this.user.schools[0].id + '&monitor_id='+this.id)
      .subscribe((data) => {
        data.data.forEach(element => {
          const event = {
            id: element.id,
            start_time: element.start_time,
            end_time: element.end_time,
            start: moment(moment(element.start_date).format('YYYY-MM-DD') + ' ' + moment(element.start_time, 'HH:mm:ss').format('HH:mm:ss')).toDate(),
            end:moment(moment(element.end_date).format('YYYY-MM-DD') + ' ' + moment(element.end_time, 'HH:mm:ss').format('HH:mm:ss')).toDate(),
            title: element.description,
            // TODO: fix these colors
            color: element.color,
            actions: this.actions,
            allDay: element.full_day,
            resizable: {
              beforeStart: true,
              afterEnd: true
            },
            draggable: true,
            description: element.description,
            user_nwd_subtype_id: element.user_nwd_subtype_id
          }
          this.events.push(event);
        });
        this.refresh.next(null);

      })

  }

  dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }): void {
    if (isSameMonth(date, this.viewDate)) {
      this.activeDayIsOpen = !(
        (isSameDay(this.viewDate, date) && this.activeDayIsOpen) ||
        events.length === 0
      );
      this.viewDate = date;
    }
  }

  eventTimesChanged({
    event,
    newStart,
    newEnd
  }: CalendarEventTimesChangedEvent): void {
    this.events = this.events.map((iEvent) => {
      if (iEvent === event) {
        return {
          ...event,
          start: newStart,
          end: newEnd
        };
      }
      return iEvent;
    });
    this.handleEvent('Dropped or resized', event);
  }

  handleEvent(action: string, event: CalendarEvent): void {
    const dialogRef = this.dialog.open(CalendarEditComponent, {
      data: event
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        event = result;
        this.snackbar.open('Updated Event: ' + event.title);
        this.refresh.next(null);
      }
    });
  }



  handleUpdateEvent(action: string, event: CalendarEvent): void {
    const dialogRef = this.dialog.open(CalendarEditComponent, {
      data: event
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        result.monitor_id = this.id;

        const isOverlap = this.eventService.isOverlap(this.events, result);
        if (isOverlap.length === 0) {
          if (result.user_nwd_subtype_id !== 0) {

            this.crudService.update('/monitor-nwds', result, event.id)
            .subscribe((data) => {

              this.getData();
              this.snackbar.open('Event created', 'OK', {duration: 3000});
            })
          }
        } else {

          const updateEdit = this.events[isOverlap[0].overlapedId].id;
          this.crudService.update('/monitor-nwds', isOverlap[0].dates[0], updateEdit)
            .subscribe((data) => {
              isOverlap[0].dates[1].start_time = data.data.end_time;
              this.crudService.create('/monitor-nwds', isOverlap[0].dates[1])
              .subscribe((data) => {

                this.getData();
                this.snackbar.open('Event updated', 'OK', {duration: 3000});
              })
            })
          // hacer el update y el create
          this.snackbar.open('Existe un solapamiento', 'OK', {duration: 3000});
        }

      }
    });
  }


  handleDbClickEvent(action: string, event: any): void {
    const dialogRef = this.dialog.open(CalendarEditComponent, {
      data: event
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        result.monitor_id = this.id;

        const isOverlap = this.eventService.isOverlap(this.events, result);
        if (isOverlap.length === 0) {
          if (result.user_nwd_subtype_id !== 0) {

            this.crudService.create('/monitor-nwds', result)
            .subscribe(
              (data: any) => {
                this.getData();

                // Check if partial creation (with skipped dates)
                if (data.data?.skipped_dates && data.data.skipped_dates.length > 0) {
                  const created = data.data.summary?.total_created || 0;
                  const skipped = data.data.summary?.total_skipped || 0;

                  const message = this.translateService.instant('unavailabilities_created_partial', {
                    created: created,
                    skipped: skipped
                  });

                  this.snackbar.open(message, 'OK', {duration: 5000});
                } else {
                  // All created successfully
                  this.snackbar.open(this.translateService.instant('unavailabilities_created_all'), 'OK', {duration: 3000});
                }
              },
              (error: any) => {
                // Check for 409 - no dates could be created
                if (error.status === 409) {
                  this.snackbar.open(this.translateService.instant('unavailabilities_created_none'), 'OK', {duration: 5000});
                } else {
                  this.snackbar.open(this.translateService.instant('error'), 'OK', {duration: 3000});
                }
              }
            )
          }
        } else {

          const updateEdit = this.events[isOverlap[0].overlapedId].id;
          this.crudService.update('/monitor-nwds', isOverlap[0].dates[0], updateEdit)
            .subscribe((data) => {
              isOverlap[0].dates[1].start_time = data.data.end_time;
              this.crudService.create('/monitor-nwds', isOverlap[0].dates[1])
              .subscribe((data) => {

                this.getData();
                this.snackbar.open(this.translateService.instant('event_created'), 'OK', {duration: 3000});
              })
            })
          // hacer el update y el create
          this.snackbar.open('Existe un solapamiento', 'OK', {duration: 3000});
        }

      }
    });
  }

  addEvent(): void {
    this.events = [
      ...this.events,
      {
        title: 'New event',
        start: startOfDay(new Date()),
        end: endOfDay(new Date()),
        color: colors.red,
        draggable: true,
        resizable: {
          beforeStart: true,
          afterEnd: true
        }
      }
    ];
  }

  deleteEvent(eventToDelete: any) {

    this.crudService.delete('/monitor-nwds', eventToDelete.id)
      .subscribe(() => {
        this.snackbar.open('Event deleted');

      })
  }

  setView(view: CalendarView) {
    this.view = view;
  }

  closeOpenMonthViewDay() {
    this.activeDayIsOpen = false;
  }
}
