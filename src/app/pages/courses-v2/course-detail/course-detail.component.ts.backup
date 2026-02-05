import {Component, Inject, OnInit, Optional} from '@angular/core';
import { ApiCrudService } from '../../../../service/crud.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CoursesService } from '../../../../service/courses.service';
import { TranslateService } from '@ngx-translate/core';
import { TableColumn } from 'src/@vex/interfaces/table-column.interface';
import {MonitorsCreateUpdateComponent} from '../../monitors/monitors-create-update/monitors-create-update.component';
import moment from 'moment';
import {MAT_DIALOG_DATA, MatDialog} from '@angular/material/dialog';
import { CourseTimingModalComponent } from '../course-timing-modal/course-timing-modal.component';

@Component({
  selector: 'vex-course-detail',
  templateUrl: './course-detail.component.html',
  styleUrls: ['./course-detail.component.scss']
})
export class CourseDetailComponent implements OnInit {
  minDate = new Date(2000, 1, 1);
  nowDate = new Date()
  maxDate = new Date(2099, 12, 31);
  user: any;
  settings: any;
  id: number;
  loading: boolean = true;
  shortDescription: string = '';
  courseName: string = '';
  firstCombinationValue: number | null = null;
  description: string = '';
  ageRange: { age_min: number, age_max: number } = { age_min: 0, age_max: 0 };
  shortestDuration: string | null = null;
  sendEmailModal: boolean = false
  toggleClaimText: boolean = false
  selectedFrom = null;
  selectedTo = null;
  selectedMonitorId = null;
  filter = '';
  totalPriceSell = 0;

  constructor(private crudService: ApiCrudService, private activatedRoute: ActivatedRoute,
              public dialog: MatDialog,
              private router: Router, public courses: CoursesService, public TranslateService: TranslateService,
              @Optional() @Inject(MAT_DIALOG_DATA) public incData: any) {
    this.user = JSON.parse(localStorage.getItem('boukiiUser'));
    this.settings = JSON.parse(this.user.schools[0].settings);
    this.id = this.activatedRoute.snapshot.params.id;
  }

  detailData: any

  ngOnInit(): void {
    if (!this.incData) this.id = this.activatedRoute.snapshot.params.id;
    else this.id = this.incData.id;
    this.crudService.get('/admin/courses/' + this.id,
      ['courseGroups.degree', 'courseGroups.courseDates.courseSubgroups.bookingUsers.client',
       'courseGroups.courseDates.courseSubgroups.bookingUsers.booking',
       'bookingUsers.client', 'bookingUsers.booking', 'sport' ,'courseExtras'])
      .subscribe((data: any) => {
        this.detailData = data.data

        // Check if this is a FIX course (should be treated as flexible)
        const isFIXCourse = this.detailData.name?.toUpperCase().includes('FIX');
        const isCollectiveFIX = this.detailData.course_type === 1 && isFIXCourse;
        this.crudService.list('/degrees', 1, 10000, 'asc', 'degree_order', '&school_id=' + this.detailData.school_id + '&sport_id=' + this.detailData.sport_id)
          .subscribe((data) => {
            this.detailData.degrees = [];
            data.data.forEach((element: any) => {
              if (element.active) this.detailData.degrees.push({ ...element, });
            });
            this.detailData.degrees.forEach((level: any) => {
              level.active = false;
              level.visible = false;
              this.detailData.course_dates.forEach((cs: any) => {
                cs.course_groups.forEach((group: any) => {
                  if (group.degree_id === level.id) {
                    level.active = true;
                    level.old = true;
                    level.visible = true;
                  }
                });
              });
            });
            this.crudService.list('/stations', 1, 10000, 'desc', 'id', '&school_id=' + this.detailData.school_id)
              .subscribe((st: any) => {
                st.data.forEach((element: any) => {
                  if (element.id === this.detailData.station_id) this.detailData.station = element
                });
                // For ALL collective courses (regular and FIX), we need to ensure booking users are loaded
                const isFIXCourse = this.detailData.name?.toUpperCase().includes('FIX');

                if (this.detailData.course_type === 1) {
                  this.detailData.users = [];
                  const bookingUsersMap = new Map(); // To avoid duplicates

                  // Check both possible structures
                  const courseGroupsData = this.detailData.courseGroups || this.detailData.course_groups || [];
                  const courseDatesData = this.detailData.course_dates || [];

                  // Try courseGroups structure first (from API relation)
                  courseGroupsData.forEach((group: any) => {
                    const courseDates = group.courseDates || group.course_dates || [];
                    courseDates.forEach((courseDate: any) => {
                      const subgroups = courseDate.courseSubgroups || courseDate.course_subgroups || [];
                      subgroups.forEach((subgroup: any) => {
                        const bookingUsers = subgroup.bookingUsers || subgroup.booking_users || [];
                        bookingUsers.forEach((bookingUser: any) => {
                          const key = `${bookingUser.client_id}-${bookingUser.booking_id || bookingUser.id}`;
                          if (!bookingUsersMap.has(key)) {
                            bookingUsersMap.set(key, {
                              ...bookingUser,
                              course_date_id: courseDate.id,
                              course_group_id: group.id,
                              course_subgroup_id: subgroup.id
                            });
                          }
                        });
                      });
                    });
                  });

                  this.detailData.users = Array.from(bookingUsersMap.values());
                  this.crudService.list('/booking-users', 1, 10000, 'desc', 'id', '&school_id=' + this.detailData.school_id + '&course_id=' + this.detailData.id + '&with[]=client')
                    .subscribe((bookingUser) => {
                      this.detailData.users = bookingUser.data || [];
                      if (this.detailData.users.length > 0) {
                        this.detailData.users.forEach((user: any, index: number) => {
                        });
                      }

                      // For FIX courses, correct the reservation count to show unique bookings instead of individual dates
                      if (isFIXCourse && this.detailData.users.length > 0) {
                        const uniqueBookings = new Set();
                        this.detailData.users.forEach((user: any) => {
                          const bookingId = user.booking_id || user.id;
                          if (bookingId) uniqueBookings.add(bookingId);
                        });

                        // Override the total_reservations for FIX courses
                        this.detailData.total_reservations = uniqueBookings.size;
                      }

                      // Update detailData with the new booking users before setting form group
                      this.detailData.booking_users = this.detailData.users;

                      // Initialize courseFormGroup for collective courses
                      this.courses.settcourseFormGroup(this.detailData)

                      // CRITICAL: After setting the form group, ensure booking_users control is updated
                      if (this.courses.courseFormGroup && this.detailData.users.length > 0) {
                        const patchData: any = {
                          booking_users: this.detailData.users
                        };

                        // For FIX courses, also update the total_reservations in the form
                        if (isFIXCourse) {
                          patchData.total_reservations = this.detailData.total_reservations;
                        }

                        this.courses.courseFormGroup.patchValue(patchData);
                      }

                      this.toggleClaimText = Boolean(this.courses.courseFormGroup.controls['claim_text'].value)
                      setTimeout(() => this.loading = false, 0);
                    });
                } else {
                  // Regular courses - use direct API call
                  this.crudService.list('/booking-users', 1, 10000, 'desc', 'id', '&school_id=' + this.detailData.school_id + '&course_id=' + this.detailData.id + '&with[]=client')
                    .subscribe((bookingUser) => {
                      this.detailData.users = [];
                      this.detailData.users = bookingUser.data;
                      this.courses.settcourseFormGroup(this.detailData)
                      this.toggleClaimText = Boolean(this.courses.courseFormGroup.controls['claim_text'].value)
                      setTimeout(() => this.loading = false, 0);
                    })
                }
              })
          });
      })
  }

  updateCourses() {
    const courseFormGroup = this.courses.courseFormGroup.getRawValue()
    courseFormGroup.translations = JSON.stringify(this.courses.courseFormGroup.controls['translations'].value)
    courseFormGroup.course_type === 1 ? delete courseFormGroup.settings : courseFormGroup.settings = JSON.stringify(this.courses.courseFormGroup.controls['settings'].value)
    this.crudService.update('/admin/courses', courseFormGroup, this.id).subscribe()
  }

  filterData() {

    let filter = '';

    if (this.selectedFrom) {
      filter = filter + '&start_date=' + moment(this.selectedFrom).format('YYYY-MM-DD');
    }
    if (this.selectedTo) {
      filter = filter + '&end_date=' + moment(this.selectedTo).format('YYYY-MM-DD');
    }
    if (this.selectedMonitorId) {
      filter = filter + '&monitor_id=' + this.selectedMonitorId;
    }

    this.filter = filter;

  }

  calculateTotal(data) {
    this.totalPriceSell = data.reduce((sum, item) => sum + item.total_cost, 0);
  }

  goTo(route: string, query: any = null) {
    this.router.navigate([route], { queryParams: query });
  }

  DateDiff = (value1: string, value2: string): number => Math.round((new Date(value2).getTime() - new Date(value1).getTime()) / 1000 / 60 / 60 / 24)
  count = (array: any[], key: string) => Boolean(array.map((a: any) => a[key]).find((a: any) => a))

  columns: TableColumn<any>[] = [
    { label: 'Id', property: 'id', type: 'id', visible: true, cssClasses: ['font-medium'] },
    { label: 'type', property: 'sport', type: 'booking_users_image', visible: true },
    { label: 'course', property: 'booking_users', type: 'booking_users', visible: true },
    { label: 'client', property: 'client_main', type: 'client', visible: true },
    { label: 'dates', property: 'dates', type: 'booking_dates', visible: true },
    { label: 'register', property: 'created_at', type: 'date', visible: true },
    //{ label: 'Options', property: 'options', type: 'text', visible: true },
    { label: 'op_rem_abr', property: 'has_cancellation_insurance', type: 'light', visible: true },
    { label: 'B. Care', property: 'has_boukii_care', type: 'light', visible: true },
    { label: 'price', property: 'price_total', type: 'price', visible: true },
    { label: 'method_paiment', property: 'payment_method', type: 'payment_method', visible: true },
    { label: 'bonus', property: 'bonus', type: 'light', visible: true },
    { label: 'paid', property: 'paid', type: 'payment_status', visible: true },
    { label: 'status', property: 'status', type: 'cancelation_status', visible: true },
    { label: 'Actions', property: 'actions', type: 'button', visible: true }
  ];

  columnsSalesCollective: TableColumn<any>[] = [
    { label: 'type', property: 'icon', type: 'booking_users_image', visible: true },
    { label: 'name', property: 'name', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'level', property: 'group_name', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'availability', property: 'available_places', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'sold', property: 'booked_places', type: 'text', visible: true },
    { label: 'cash', property: 'cash', type: 'price', visible: true, cssClasses: ['font-medium'] },
    { label: 'other', property: 'other', type: 'price', visible: true, cssClasses: ['font-medium'] },
    { label: 'T.Boukii', property: 'boukii', type: 'price', visible: true, cssClasses: ['font-medium'] },
    { label: 'T.Boukii Web', property: 'boukii_web', type: 'price', visible: true, cssClasses: ['font-medium'] },
    { label: 'Link', property: 'online', type: 'price', visible: true, cssClasses: ['font-medium'] },
    { label: 'no_paid', property: 'no_paid', type: 'price', visible: true, cssClasses: ['font-medium'] },
    { label: 'admin', property: 'admin', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'web', property: 'web', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'vouchers', property: 'vouchers', type: 'price', visible: true, cssClasses: ['font-medium'] },
    { label: 'extras', property: 'extras', type: 'price', visible: true, cssClasses: ['font-medium'] },
    { label: 'total', property: 'total_cost', type: 'price', visible: true },
  ];

  icon = '../../../assets/img/icons/cursos.svg';

  columnsSalesPrivate: TableColumn<any>[] = [
    { label: 'type', property: 'icon', type: 'booking_users_image', visible: true },
    { label: 'name', property: 'name', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'availability', property: 'available_places', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'sold', property: 'booked_places', type: 'text', visible: true },
    { label: 'cash', property: 'cash', type: 'price', visible: true, cssClasses: ['font-medium'] },
    { label: 'other', property: 'other', type: 'price', visible: true, cssClasses: ['font-medium'] },
    { label: 'T.Boukii', property: 'boukii', type: 'price', visible: true, cssClasses: ['font-medium'] },
    { label: 'T.Boukii Web', property: 'boukii_web', type: 'price', visible: true, cssClasses: ['font-medium'] },
    { label: 'Link', property: 'online', type: 'price', visible: true, cssClasses: ['font-medium'] },
    { label: 'no_paid', property: 'no_paid', type: 'price', visible: true, cssClasses: ['font-medium'] },
    { label: 'admin', property: 'admin', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'web', property: 'web', type: 'text', visible: true, cssClasses: ['font-medium'] },
    { label: 'vouchers', property: 'vouchers', type: 'price', visible: true, cssClasses: ['font-medium'] },
    { label: 'extras', property: 'extras', type: 'price', visible: true, cssClasses: ['font-medium'] },
    { label: 'total', property: 'total_cost', type: 'price', visible: true },
  ];

  protected readonly createComponent = MonitorsCreateUpdateComponent;

  /**
   * Open timing modal for subgroup students (cronometraje)
   */
  openTimingModal(subGroup: any, groupLevel: any, selectedDate?: any): void {

    if (!subGroup || !groupLevel) {
      console.error('No hay datos de subgrupo o nivel para mostrar tiempos.');
      alert('No hay datos de subgrupo o nivel para mostrar tiempos.');
      return;
    }

    const courseDates = this.detailData?.course_dates || [];

    // Crear booking users con course_date_id para filtrado correcto por día
    const bookingUsersWithDates = this.collectBookingUsersFromDetailData(courseDates);

    const students = (this.detailData?.users || []).map((u: any) => ({
      id: u.client_id,
      first_name: u.client?.first_name,
      last_name: u.client?.last_name,
      birth_date: u.client?.birth_date,
      country: u.client?.country,
      image: u.client?.image
    }));

    try {
      const ref = this.dialog.open(CourseTimingModalComponent, {
        width: '80%',
        maxWidth: '1200px',
        data: {
          subGroup,
          groupLevel,
          courseId: this.id,
          courseDates,
          students,
          // Pasamos bookings enriquecidos con course_date_id para filtrar por día
          bookingUsers: bookingUsersWithDates,
          // Preseleccionar el día si viene del reloj con día seleccionado
          selectedCourseDateId: selectedDate?.id ?? null
        }
      });


      ref.afterOpened().subscribe(() => {
      });

      ref.afterClosed().subscribe(result => {
      });
    } catch (error) {
      console.error('Error al abrir modal:', error);
      alert('Error al abrir modal: ' + error);
    }
  }

  /**
   * Extrae booking users de la estructura de detailData y les asigna course_date_id
   * para el filtrado correcto por fecha en el modal de timing
   */
  private collectBookingUsersFromDetailData(courseDates: any[]): any[] {
    const result: any[] = [];
    try {

      for (const cd of courseDates) {
        const cdId = cd?.id ?? null;

        const groups = Array.isArray(cd?.course_groups) ? cd.course_groups : [];
        for (const g of groups) {
          const subgroups = Array.isArray(g?.course_subgroups) ? g.course_subgroups : [];
          for (const sg of subgroups) {
            const bookings = Array.isArray(sg?.booking_users) ? sg.booking_users : [];

            for (const bu of bookings) {
              const client = bu?.client || {};
              const clientId = bu?.client_id ?? client?.id ?? bu?.id;
              const mappedUser = {
                id: bu?.id,
                client_id: clientId,
                client,
                course_date_id: cdId,
                course_group_id: g?.id ?? bu?.course_group_id,
                course_subgroup_id: sg?.id ?? bu?.course_subgroup_id ?? bu?.course_sub_group_id,
                accepted: bu?.accepted ?? null,
                attended: bu?.attended ?? bu?.attendance ?? null,
                date: cd?.date ?? null
              };
              result.push(mappedUser);
            }
          }
        }
      }

      // Si no hemos encontrado nada en la estructura embebida, usar los usuarios globales
      if (result.length === 0 && this.detailData?.users) {
        const globalUsers = this.detailData.users;

        // Enriquecer con course_date_id y course_subgroup_id basándonos en las fechas
        const enrichedUsers = globalUsers.map((user: any) => {
          // Intentar encontrar la fecha y subgrupo correspondiente
          let foundCourseDate = null;
          let foundSubgroup = null;

          for (const cd of courseDates) {
            for (const g of (cd?.course_groups || [])) {
              for (const sg of (g?.course_subgroups || [])) {
                if (user?.course_subgroup_id === sg?.id || user?.course_sub_group_id === sg?.id) {
                  foundCourseDate = cd;
                  foundSubgroup = sg;
                  break;
                }
              }
              if (foundSubgroup) break;
            }
            if (foundSubgroup) break;
          }

          return {
            ...user,
            course_date_id: foundCourseDate?.id ?? user?.course_date_id ?? null,
            course_subgroup_id: foundSubgroup?.id ?? user?.course_subgroup_id ?? user?.course_sub_group_id ?? null
          };
        });
        return enrichedUsers;
      }

      return result;
    } catch (e) {
      console.warn('collectBookingUsersFromDetailData error:', e);
      return this.detailData?.users || [];
    }
  }
}
