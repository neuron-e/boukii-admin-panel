
import { Injectable } from '@angular/core';
import moment from 'moment';
import { TranslateService } from '@ngx-translate/core';
import {FormArray, UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';

@Injectable({ providedIn: 'root' })

export class CoursesService {
  constructor(private translateService: TranslateService, private fb: UntypedFormBuilder) { }
  courseFormGroup: UntypedFormGroup;
  nowDate = new Date(new Date().setHours(0, 0, 0, 0));
  minDate = this.nowDate;
  maxDate = new Date(2099, 12, 31);

  settcourseFormGroup(data: any, isPreview = false) {
    this.resetcourseFormGroup()
    // Helper to normalize potential JSON-stringified arrays
    const toArray = (val: any): any[] => {
      try {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') return JSON.parse(val || '[]');
      } catch (e) {
        console.warn('Array parse failed, returning [] for value:', val, e);
      }
      return [];
    };

    // Ensure booking users is always an array (handles stringified JSON)
    const rawBookingUsers = (data as any).booking_users_active ?? (data as any).booking_users ?? (data as any).users ?? [];
    const normalizedBookingUsers = toArray(rawBookingUsers).map((u: any) => {
      if (u && typeof u === 'object') {
        // Normalizar subgrupo: aceptar course_sub_group?.id o course_sub_group_id
        const nestedId = u?.course_sub_group?.id ?? u?.course_sub_group_id ?? u?.course_subgroup_id ?? null;
        if (nestedId && (!u.course_subgroup_id || u.course_subgroup_id !== nestedId)) {
          u.course_subgroup_id = nestedId;
        }
      }
      return u;
    });
    (data as any).booking_users = normalizedBookingUsers;
    // Normalize course dates for detail/preview
    if (!isPreview) {
      if (data.course_type == 1) {
        // Keep existing course_dates as is
        data.course_dates = data.course_dates;
      } else {
        // For non-collectives, synthesize a single period range
        data.course_dates = data.settings?.periods?.length ? data.settings.periods : [this.getCoursePeriod(data)];
      }
      data.course_dates_prev = [];
    } else {
      // In preview, we show previous dates in the card but keep course_dates usable as fallback
      const originalDates = Array.isArray(data.course_dates) ? data.course_dates : [];
      if (data.course_type == 1) {
        data.course_dates_prev = originalDates;
        // Leave course_dates also populated so components that rely on it still work
        data.course_dates = originalDates;
      } else {
        const periods = data.settings?.periods?.length ? data.settings.periods : [this.getCoursePeriod(data)];
        data.course_dates_prev = periods;
        data.course_dates = periods;
      }
    }
    // Normalize translations and settings
    const translations = typeof data.translations === 'string'
      ? (() => { try { return JSON.parse(data.translations); } catch { return {}; } })()
      : (data.translations || {});
    const settingsObj = typeof data.settings === 'string'
      ? (() => { try { return JSON.parse(data.settings); } catch { return {}; } })()
      : (data.settings || {});
    const course_extras = toArray((data as any).course_extras);
    const discounts = toArray((data as any).discounts);
    let intervalDiscountsValue: string | null = null;
    if ((data as any).interval_discounts != null) {
      if (typeof (data as any).interval_discounts === 'string') {
        intervalDiscountsValue = (data as any).interval_discounts as string;
      } else {
        try {
          intervalDiscountsValue = JSON.stringify((data as any).interval_discounts);
        } catch {
          intervalDiscountsValue = null;
        }
      }
    }

    this.courseFormGroup.patchValue({
      ...data,
      user: data.user ? data.user.username + " (" + data.user.first_name + " " + data.user.last_name + ")" : "",
      translations,
      icon: data.sport?.icon_unselected,
      levelGrop: data.degrees,
      settings: settingsObj,
      discounts,
      interval_discounts: intervalDiscountsValue,
      course_extras,
      booking_users: (data as any).booking_users,
      // Extract interval configuration from settings
      useMultipleIntervals: settingsObj.useMultipleIntervals || false,
      intervals: settingsObj.intervals || [],
      intervals_config_mode: settingsObj.intervals_config_mode || 'unified',
      mustBeConsecutive: settingsObj.mustBeConsecutive || false,
      mustStartFromFirst: settingsObj.mustStartFromFirst || false,
    })

    // Populate course_dates FormArray manually (patchValue doesn't work well with FormArrays)
    const courseDatesArray = this.courseFormGroup.get('course_dates') as FormArray;
    courseDatesArray.clear();
    let courseDates = toArray(data.course_dates);

    // Enrich course_dates with interval_id based on interval configuration
    try {
      // Option 1: Use existing intervals from settings if available
      if (courseDates.length && settingsObj?.intervals && Array.isArray(settingsObj.intervals)) {
        const intervals = settingsObj.intervals;
        courseDates = courseDates.map((dateData: any) => {
          // Skip if interval_id already set
          if (dateData?.interval_id) return dateData;

          // Try to find matching interval by date range
          const dateValue = dateData?.date ? new Date(dateData.date) : null;
          if (dateValue) {
            const matchingInterval = intervals.find((interval: any) => {
              const startDate = interval?.startDate ? new Date(interval.startDate) : null;
              const endDate = interval?.endDate ? new Date(interval.endDate) : null;
              return startDate && endDate && dateValue >= startDate && dateValue <= endDate;
            });

            if (matchingInterval) {
              dateData.interval_id = matchingInterval.id || intervals.indexOf(matchingInterval) + 1;
            }
          }
          return dateData;
        });
      } else if (courseDates.length) {
        // Option 2: If no intervals in settings, check if course_dates already have interval_id from API
        const hasIntervalIds = courseDates.some((d: any) => d?.interval_id);

        if (!hasIntervalIds) {
          // Option 3: If no interval_id anywhere, create a default single interval spanning all dates
          // Sort dates to find min/max
          const sortedDates = courseDates
            .filter((d: any) => d?.date)
            .map((d: any) => ({ ...d, dateVal: new Date(d.date) }))
            .sort((a: any, b: any) => a.dateVal.getTime() - b.dateVal.getTime());

          if (sortedDates.length > 0) {
            // All dates get interval_id = 1 (single default interval)
            courseDates = courseDates.map((dateData: any) => {
              if (!dateData?.interval_id) {
                dateData.interval_id = 1;
              }
              return dateData;
            });

            // Also ensure settings has a default interval for the component to reference
            if (!settingsObj.intervals) {
              settingsObj.intervals = [{
                id: 1,
                name: null, // Component will generate "Interval 1" as label
                startDate: sortedDates[0].date,
                endDate: sortedDates[sortedDates.length - 1].date
              }];
              // Update the form control with enriched settings
              this.courseFormGroup.patchValue({ settings: settingsObj });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to enrich course_dates with interval_id:', e);
    }

    courseDates.forEach((dateData: any) => {
      courseDatesArray.push(this.fb.control(dateData));
    });

    // If booking_users is still empty, try to harvest from embedded subgroups across all dates
    try {
      const ensureArray = (v: any) => Array.isArray(v) ? v : ([] as any[]);
      const current = this.courseFormGroup.controls['booking_users']?.value || [];
      const dates = ensureArray(this.courseFormGroup.controls['course_dates']?.value);
      if ((!current || current.length === 0) && dates.length) {
        const harvested: any[] = [];
        for (const cd of dates) {
          const groups = ensureArray(cd?.course_groups);
          for (const g of groups) {
            const sgs = ensureArray(g?.course_subgroups);
            for (const sg of sgs) {
              const bus = ensureArray(sg?.booking_users);
              for (const u of bus) {
                if (!u.course_subgroup_id) u.course_subgroup_id = sg?.id;
                harvested.push(u);
              }
            }
          }
        }
        if (harvested.length) {
          // Deduplicate by booking_user id if available, else by client_id + course_date_id
          const keyFor = (u: any) => (u?.id ?? `${u?.client_id || u?.client?.id || 'x'}-${u?.course_date_id || u?.course_date?.id || 'x'}`);
          const map = new Map<any, any>();
          for (const u of harvested) {
            const k = keyFor(u);
            if (!map.has(k)) map.set(k, u);
          }
          this.courseFormGroup.patchValue({ booking_users: Array.from(map.values()) });
        }
      }
    } catch (e) {
      console.warn('Failed to harvest embedded booking_users:', e);
    }

    // Propagar booking_users a cada course_date para que los componentes de nivel
    // puedan contar/listar alumnos por día y subgrupo sin depender solo del root
    try {
      const ensureArray = (v: any) => Array.isArray(v) ? v : ([] as any[]);
      const dates = ensureArray(this.courseFormGroup.controls['course_dates']?.value);
      const globalUsers: any[] = ensureArray((this.courseFormGroup.controls as any)['booking_users']?.value);

      if (dates.length && globalUsers.length) {
        // Construir índice de fechas por id y por fecha ISO (yyyy-mm-dd)
        const byId = new Map<number, any>();
        const byISO = new Map<string, any>();
        for (const cd of dates) {
          if (cd?.id != null) byId.set(cd.id, cd);
          const iso = cd?.date ? new Date(cd.date).toISOString().slice(0, 10) : null;
          if (iso) byISO.set(iso, cd);
          // Asegurar contenedor en cada date
          if (!Array.isArray(cd.booking_users_active)) cd.booking_users_active = [];
        }

        // Función para meter usuario en su date correspondiente y normalizar campos clave
        const pushToDate = (u: any) => {
          // Normalizar client_id si viene como objeto
          if (u?.client && u.client.id && !u.client_id) u.client_id = u.client.id;
          // Normalizar subgroup id
          const nestedId = u?.course_sub_group?.id ?? u?.course_sub_group_id ?? u?.course_subgroup_id ?? null;
          if (nestedId && (!u.course_subgroup_id || u.course_subgroup_id !== nestedId)) u.course_subgroup_id = nestedId;

          let cd: any = null;
          const cdId = u?.course_date_id ?? u?.course_date?.id ?? null;
          if (cdId != null && byId.has(cdId)) {
            cd = byId.get(cdId);
          } else if (u?.date) {
            const iso = new Date(u.date).toISOString().slice(0, 10);
            cd = byISO.get(iso) || null;
          }

          // Si no encontramos el date concreto, lo dejamos en el primero (mejor que perderlo)
          if (!cd) cd = dates[0];
          if (!Array.isArray(cd.booking_users_active)) cd.booking_users_active = [];

          // Asegurar que el usuario conoce la fecha para mostrar estado futuro/pasado
          if (!u.date && cd?.date) u.date = cd.date;

          // Evitar duplicados por id o por (client_id + course_date_id)
          const exists = cd.booking_users_active.some((x: any) => {
            if (u?.id && x?.id) return x.id === u.id;
            const a = x?.client_id ?? x?.client?.id ?? null;
            const b = u?.client_id ?? u?.client?.id ?? null;
            const da = x?.course_date_id ?? x?.course_date?.id ?? null;
            const db = u?.course_date_id ?? u?.course_date?.id ?? null;
            return a != null && b != null && a === b && da === db;
          });
          if (!exists) cd.booking_users_active.push(u);

          // Además, inyectar en el subgrupo embebido de ese día si existe
          try {
            const groups = ensureArray(cd?.course_groups);
            const sgId = u?.course_subgroup_id ?? u?.course_sub_group_id ?? u?.course_sub_group?.id ?? null;
            if (sgId != null) {
              for (const g of groups) {
                const sgs = ensureArray(g?.course_subgroups);
                const target = sgs.find((x: any) => x?.id === sgId);
                if (target) {
                  if (!Array.isArray(target.booking_users)) target.booking_users = [];
                  const exists2 = target.booking_users.some((x: any) => {
                    if (u?.id && x?.id) return x.id === u.id;
                    const a = x?.client_id ?? x?.client?.id ?? null;
                    const b = u?.client_id ?? u?.client?.id ?? null;
                    return a != null && b != null && a === b;
                  });
                  if (!exists2) target.booking_users.push(u);
                  break;
                }
              }
            }
          } catch {}
        };

        for (const u of globalUsers) pushToDate(u);

        // Escribir de vuelta las fechas modificadas
        this.courseFormGroup.patchValue({ course_dates: dates });
      }
    } catch (e) {
      console.warn('Failed to propagate booking_users to course_dates:', e);
    }
    if (data.settings && typeof data.settings === 'string') {
      try {
        const settings = JSON.parse(data.settings);

        // Aplicar configuración de intervalos al formulario
        if (settings.multipleIntervals) {
          this.courseFormGroup.patchValue({
            settings: {
              ...this.courseFormGroup.get('settings').value,
              multipleIntervals: settings.multipleIntervals,
              mustBeConsecutive: settings.mustBeConsecutive,
              mustStartFromFirst: settings.mustStartFromFirst,
              intervals: settings.intervals || []
            }
          });
        }
      } catch (error) {
        console.error("Error parsing settings:", error);
      }
    }
  }

  private getCoursePeriod(data: any): any {
    if (data.course_dates?.length) {
      const dates = data.course_dates.map(d => new Date(d.date));
      const hoursStart = data.course_dates.map(d => d.hour_start);
      const hoursEnd = data.course_dates.map(d => d.hour_end);

      return {
        date: new Date(Math.min(...dates)).toISOString(),
        date_end: new Date(Math.max(...dates)).toISOString(),
        hour_start: hoursStart.reduce((min, h) => h < min ? h : min, hoursStart[0]),
        hour_end: hoursEnd.reduce((max, h) => h > max ? h : max, hoursEnd[0])
      };
    } else {
      // Si no hay fechas, usar la fecha de hoy y el horario de 09:00 a 10:00
      const today = new Date();
      return {
        date: today.toISOString(),
        date_end: today.toISOString(),
        hour_start: "09:00",
        hour_end: "10:00"
      };
    }
  }

  user: any = JSON.parse(localStorage.getItem('boukiiUser'))

  resetcourseFormGroup() {
    const settings = JSON.parse(JSON.parse(localStorage.getItem('boukiiUser')).schools[0].settings);
    this.courseFormGroup = this.fb.group({
      id: [null, Validators.required],
      sport_id: [null, Validators.required],
      is_flexible: [false, Validators.required],
      use_interval_groups: [false],
      intervals_config_mode: ['unified', Validators.required],
      created_at: [new Date()],
      user: [this.user.username + " (" + this.user.first_name + " " + this.user.last_name + ")"],
      user_id: [this.user.id],
      booking_users: [],
      course_type: [null, Validators.required],
      name: ["", Validators.required],
      short_description: ["", Validators.required],
      description: ["", Validators.required],
      price: [100, [Validators.required, Validators.min(1)]],
      currency: [settings?.taxes?.currency || 'CHF'],
      max_participants: [10, [Validators.required, Validators.min(1)]],
      image: ["", Validators.required],
      icon: ["", Validators.required],
      highlighted: [false],
      claim_text: [""],
      meeting_point: [""],
      meeting_point_address: [""],
      meeting_point_instructions: [""],
      age_max: [99, [Validators.required, Validators.min(0), Validators.max(99)]],
      age_min: [1, [Validators.required, Validators.min(0), Validators.max(99)]],
      date_start: [null, Validators.required],
      date_end: [null, Validators.required],
      date_start_res: [null],
      date_end_res: [null],
      duration: [null, Validators.required],
      confirm_attendance: [false],
      active: [true],
      online: [true],
      options: [true],
      intervals_ui: this.fb.array([]), // no se envía al backend
      translations: {
        es: { name: '', short_description: '', description: '' },
        en: { name: '', short_description: '', description: '' },
        fr: { name: '', short_description: '', description: '' },
        it: { name: '', short_description: '', description: '' },
        de: { name: '', short_description: '', description: '' },
      },
      school_id: [this.user.schools[0].id],
      station_id: [null],
      course_dates: this.fb.array([]),
      course_dates_prev: [],
      discounts: [[], Validators.required],
      interval_discounts: [null],
      course_extras: [[], Validators.required],
      unique: [true],
      hour_min: [],
      hour_max: [],
      minPrice: [],
      price_range: [[]],
      extras: [[], Validators.required],
      levelGrop: [[], Validators.required],
      settings: {
        multipleIntervals: false,
        mustBeConsecutive: false,
        mustStartFromFirst: false,
        intervals: [],
        weekDays: { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false },
        periods: [],
        groups: [{ ...this.default_activity_groups }]
      },
      // Interval configuration controls (extracted from settings for easier access)
      useMultipleIntervals: [false],
      intervals: [[]],
      mustBeConsecutive: [false],
      mustStartFromFirst: [false],
    });
  }

  hours: string[] = [
    '08:00', '08:15', '08:20', '08:30', '08:40', '08:45',
    '09:00', '09:15', '09:20', '09:30', '09:40', '09:45',
    '10:00', '10:15', '10:20', '10:30', '10:40', '10:45',
    '11:00', '11:15', '11:20', '11:30', '11:40', '11:45',
    '12:00', '12:15', '12:20', '12:30', '12:40', '12:45',
    '13:00', '13:15', '13:20', '13:30', '13:40', '13:45',
    '14:00', '14:15', '14:20', '14:30', '14:40', '14:45',
    '15:00', '15:15', '15:20', '15:30', '15:40', '15:45',
    '16:00', '16:15', '16:20', '16:30', '16:40', '16:45',
    '17:00', '17:15', '17:20', '17:30', '17:40', '17:45',
    '18:00', '18:15', '18:20', '18:30', '18:40', '18:45',
    '19:00', '19:15', '19:20', '19:30', '19:40', '19:45',
    '20:00'
  ];

  hoursAll: string[] = [
    '08:00', '08:15', '08:30', '08:45', '09:00', '09:15', '09:30', '09:45',
    '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45',
    '12:00', '12:15', '12:30', '12:45', '13:00', '13:15', '13:30', '13:45',
    '14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '15:45',
    '16:00', '16:15', '16:30', '16:45', '17:00', '17:15', '17:30', '17:45',
    '18:00', '18:15', '18:30', '18:45', '19:00', '19:15', '19:30', '19:45',
    '20:00', '20:15', '20:30', '20:45', '21:00', '21:15', '21:30', '21:45',
    '22:00', '22:15', '22:30', '22:45', '23:00', '23:15', '23:30', '23:45',
    '24:00',
  ];

  duration: string[] = [
    '15min', '20min', '30min', '45min', '1h 0min', '1h 15min', '1h 20min', '1h 30min', '1h 45min',
    '2h 0min', '2h 15min', '2h 20min', '2h 30min', '2h 45min', '3h 0min', '3h 15min', '3h 20min', '3h 30min', '3h 45min',
    '4h 0min', '4h 15min', '4h 30min', '4h 45min', '5h 0min', '5h 15min', '5h 30min', '5h 45min',
    '6h 0min',
    //'6h 15min', '6h 30min', '6h 45min', '7h', '7h 15min', '7h 30min', '7h 45min'
  ];

  getFilteredDuration(userSettings?: any): string[] {
    // Si se proporcionan settings del usuario y tienen price_range configurado
    if (userSettings?.prices_range?.prices) {
      // Devolver TODAS las duraciones del price_range para mostrar tabla completa
      const allDurations = userSettings.prices_range.prices.map((p: any) => {
        // Normalizar formato: convertir "1h" a "1h 0min" para consistencia
        return p.intervalo.replace(/^(\d+)h$/, "$1h 0min");
      });

      // Si hay form y duration seleccionada, filtrar a partir de esa duración
      if (this.courseFormGroup?.controls['duration']?.value) {
        const selectedDuration = this.courseFormGroup.controls['duration'].value;
        const selectedIndex = allDurations.indexOf(selectedDuration);

        if (selectedIndex !== -1) {
          return allDurations.slice(selectedIndex);
        }
      }

      return allDurations;
    }

    // Fallback al comportamiento original
    if (!this.courseFormGroup || !this.courseFormGroup.controls['duration']) {
      return this.duration; // Devuelve todas las duraciones como fallback
    }

    const selectedDuration = this.courseFormGroup.controls['duration'].value;

    // Obtener índice del valor seleccionado en `duration`
    const index = this.duration.indexOf(selectedDuration);

    // Retornar solo las duraciones iguales o mayores
    return index !== -1 ? this.duration.slice(index) : this.duration;
  }

  ndays: number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10];

  weekSelect: string[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

  default_course_dates =
    {
      date: this.nowDate.toISOString(),
      hour_start: this.hours[0],
      duration: this.duration[4], // Usar '1h 0min' como default fijo
      date_end: this.nowDate.toISOString(),
      hour_end: this.hours[1],
      course_groups: [],
      groups: []
    }

  default_activity_groups: { groupName: string, ageMin: number, ageMax: number, optionName: string, price: number, extras: any[] } =
    { groupName: "", ageMin: 18, ageMax: 99, optionName: "", price: 1, extras: [] }

  filterHoursByDuration(hourStart: string, duration: string): string[] {
    const startIndex = this.hours.indexOf(hourStart);
    if (startIndex === -1) {
      console.error("Hora de inicio no válida.");
      return [];
    }

    // Calcular la hora de fin usando el parser robusto ya existente
    const endTime = this.addMinutesToTime(hourStart, duration);
    const endIndex = this.hours.indexOf(endTime);

    // Si no encontramos exactamente la hora de fin en el array de horas (por variaciones),
    // buscamos la primera hora disponible posterior o igual
    const safeEndIndex = endIndex !== -1
      ? endIndex
      : this.hours.findIndex(h => h >= endTime);

    if (safeEndIndex === -1) {
      // Si aún no se encuentra, devolver solo desde startIndex
      return [this.hours[startIndex]];
    }

    // Devolver el rango inclusivo desde start hasta end
    return this.hours.slice(startIndex, safeEndIndex + 1);
  }

  filterAvailableHours(hourStart: string, duration: string): string[] {
    const startIndex = this.hours.indexOf(hourStart);
    if (startIndex === -1) {
      console.error("Hora de inicio no válida.");
      return this.hours;
    }

    // Calcular la hora de fin real en formato HH:mm
    const endTime = this.addMinutesToTime(hourStart, duration);
    let endIndex = this.hours.indexOf(endTime);
    if (endIndex === -1) {
      // Si no existe exactamente, tomar la primera hora posterior o igual a endTime
      endIndex = this.hours.findIndex(h => h >= endTime);
    }

    if (endIndex === -1) return [];

    // Retornar las horas a partir de la hora de fin (para seleccionar fin manual si se desea)
    return this.hours.slice(endIndex);
  }

  getCourseName(course: any) {
    if (!course.translations) return course.name;
    else {
      const translations = JSON.parse(course.translations);
      return translations[this.translateService.currentLang].name !== null && translations[this.translateService.currentLang].name !== '' ? translations[this.translateService.currentLang].name : course.name;
    }
  }

  getShortDescription(course: any) {
    if (!course.translations) return course.short_description;
    else {
      const translations = JSON.parse(course.translations);
      return translations[this.translateService.currentLang].short_description !== null && translations[this.translateService.currentLang].short_description !== '' ? translations[this.translateService.currentLang].short_description : course.short_description;
    }
  }

  getDescription(course: any) {
    if (!course.translations) return course.description;
    else {
      const translations = JSON.parse(course.translations);
      return translations[this.translateService.currentLang].description !== null && translations[this.translateService.currentLang].description !== '' ? translations[this.translateService.currentLang].description : course.description;
    }
  }

  getShortestDuration(times: any) {
    let shortest = null;
    times.forEach((time: any) => {
      const start = moment(time.hour_start, "HH:mm:ss");
      const end = moment(time.hour_end, "HH:mm:ss");
      const duration = moment.duration(end.diff(start));
      if (shortest === null || duration < shortest) shortest = duration;
    });

    if (shortest !== null) {
      const hours = shortest.hours();
      const minutes = shortest.minutes();
      return `${hours > 0 ? hours + 'h ' : ''}${minutes > 0 ? minutes + 'min' : ''}`.trim();
    } else return "No_durations_found";
  }

  getAgeRange(data: any[]): { age_min: number, age_max: number } {
    let age_min = Number.MAX_SAFE_INTEGER;
    let age_max = Number.MIN_SAFE_INTEGER;
    data.forEach(item => {
      if (item.age_min < age_min) age_min = item.age_min;
      if (item.age_max > age_max) age_max = item.age_max;
    });
    return { age_min, age_max };
  }

  findFirstCombinationWithValues(data: any) {
    if (data !== null) {
      for (const intervalo of data) {
        if (Object.keys(intervalo).some(key => key !== 'intervalo' && intervalo[key] !== null)) return intervalo;
      } return null;
    }
  }

  encontrarPrimeraClaveConValor(obj: any): string | null {
    if (obj !== null) {
      for (const clave of Object.keys(obj)) {
        if (obj[clave] !== null && clave !== 'intervalo') return obj[clave];
      } return null;
    }
  }

  weekString = (): string => {
    const weekDays = this.courseFormGroup?.controls['settings']?.value?.weekDays;

    if (!weekDays) return null; // Si no hay datos, retornamos null

    const allDays = Object.keys(weekDays).filter(day => weekDays[day]);
    const workDays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const weekendDays = ["saturday", "sunday"];
    const isAllTrue = allDays.length === 7;
    const isAllWorkDaysTrue = workDays.every(day => weekDays[day]) && weekendDays.every(day => !weekDays[day]);
    const isAllFalse = allDays.length === 0;

    if (isAllTrue) return this.translateService.instant("all_days_week");
    if (isAllWorkDaysTrue) return this.translateService.instant("workdays_only");
    if (isAllFalse) return null;

    const translatedDays = allDays.map(day => this.translateService.instant(day));
    const lastDay = translatedDays.pop();
    if (translatedDays.length === 0) return lastDay;
    return `${translatedDays.join(", ")} y ${lastDay}`;
  };

  addMinutesToTime(timeString: string, minutesToAdd: string | number) {
    // Parse HH:mm or HH:mm:ss
    const timeParts = timeString.split(":");
    const hours = parseInt(timeParts[0] || "0", 10);
    const minutes = parseInt(timeParts[1] || "0", 10);

    // Robustly parse duration to minutes
    let totalMinutesToAdd = 0;
    if (typeof minutesToAdd === 'number') {
      totalMinutesToAdd = minutesToAdd;
    } else if (/^\d+$/.test(minutesToAdd?.toString() || '')) {
      // Numeric string like "60"
      totalMinutesToAdd = parseInt(minutesToAdd as string, 10);
    } else if (typeof minutesToAdd === 'string') {
      // Supported formats: "1h 15min", "1h", "90min", "15min"
      const regex = /(?:(\d+)h)?\s*(\d+)?\s*min?/i;
      const match = minutesToAdd.match(regex);
      if (match) {
        const h = parseInt(match[1] || '0', 10);
        const m = parseInt(match[2] || '0', 10);
        totalMinutesToAdd = h * 60 + m;
      } else {
        // Fallback to 0 if cannot parse
        totalMinutesToAdd = 0;
      }
    }

    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes + totalMinutesToAdd);
    const newHours = String(date.getHours()).padStart(2, "0");
    const newMinutes = String(date.getMinutes()).padStart(2, "0");
    return `${newHours}:${newMinutes}`;
  }

  //functions intervals course type 1



}
