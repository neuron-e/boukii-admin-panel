import { Injectable } from '@angular/core';
import {
  AppliedDiscountInfo,
  applyFlexibleDiscount,
  buildDiscountInfoList,
  getApplicableDiscounts,
  resolveIntervalName
} from 'src/app/pages/bookings-v2/shared/discount-utils';
import {TranslateService} from '@ngx-translate/core';

/**
 * Configuración para controlar qué datos incluir en el formateo
 */
export interface BookingDataFormatOptions {
  includeIntervals?: boolean;       // Agrupar por intervalos (si existen)
  includeDiscounts?: boolean;       // Calcular descuentos
  calculateTotals?: boolean;        // Calcular totales de precio
  extractUniqueMonitors?: boolean;  // Extraer monitores únicos
  groupParticipants?: boolean;      // Agrupar participantes
}

/**
 * Datos formateados de una fecha individual
 */
export interface FormattedDateData {
  date: string;
  startHour: string;
  endHour: string;
  price: number;
  originalPrice?: number;           // Precio antes de descuentos
  currency: string;
  monitor?: any;
  utilizers?: any[];
  booking_users?: any[];
  extras?: any[];
  interval_id?: string | null;
  interval_name?: string | null;
  discountInfo?: AppliedDiscountInfo | null;
  isDiscounted?: boolean;
  changeMonitorOption?: any;        // Opción de cambio de monitor
  [key: string]: any;               // Permitir propiedades adicionales
}

/**
 * Grupo de fechas por intervalo
 */
export interface IntervalGroup {
  key: string;                      // ID del intervalo o 'default'
  label: string;                    // Nombre del intervalo traducido
  dates: FormattedDateData[];
  discountInfo: AppliedDiscountInfo[];
  priceSummary?: {
    baseTotal: number;
    discountAmount: number;
    finalTotal: number;
    currency: string;
  };
}

/**
 * Monitor único extraído
 */
export interface UniqueMonitor {
  id: number;
  name: string;
  [key: string]: any;
}

/**
 * Resumen de precio de una actividad
 */
export interface ActivityPriceSummary {
  basePrice: number;                // Suma de precios sin descuentos
  discountAmount: number;           // Total ahorrado
  finalPrice: number;               // Precio final con descuentos
  currency: string;
  breakdown: {                      // Desglose por intervalo (si aplica)
    [intervalKey: string]: {
      basePrice: number;
      discountAmount: number;
      finalPrice: number;
      dateCount: number;
    };
  };
}

/**
 * Datos formateados completos de una actividad
 */
export interface FormattedActivityData {
  course: {
    id: number;
    name: string;
    type: number;                   // 1=colectivo, 2=privado
    sport_id: number;
    is_flexible: boolean;
    [key: string]: any;
  };
  dates: FormattedDateData[];
  intervals?: IntervalGroup[];      // Solo si includeIntervals=true
  participants: {
    client: any;
    level?: any;
    [key: string]: any;
  }[];
  monitors: {
    unique: UniqueMonitor[];        // Monitores únicos
    byDate: Map<string, any>;       // Monitores por fecha
  };
  pricing: ActivityPriceSummary;
  extras?: any[];                   // Extras globales
}

/**
 * Servicio centralizado para formatear datos de reservas/actividades
 *
 * RESPONSABILIDAD:
 * Este servicio es la ÚNICA fuente de verdad para formatear datos de booking.
 * Todos los componentes (planner, list, detail, create) deben usar este servicio
 * para garantizar consistencia en:
 * - Cálculo de precios
 * - Aplicación de descuentos
 * - Agrupación por intervalos
 * - Extracción de monitores
 * - Agrupación de participantes
 */
@Injectable({
  providedIn: 'root'
})
export class BookingDataService {

  constructor(private translateService: TranslateService) { }

  /**
   * Formatea los datos de una actividad de forma consistente
   *
   * @param course - Datos del curso
   * @param dates - Array de fechas/sesiones
   * @param utilizers - Participantes (opcional)
   * @param options - Opciones de formateo
   * @returns Datos formateados listos para presentación
   */
  formatActivityData(
    course: any,
    dates: any[],
    utilizers: any[] = [],
    options: BookingDataFormatOptions = {}
  ): FormattedActivityData {
    // Opciones por defecto
    const opts: BookingDataFormatOptions = {
      includeIntervals: true,
      includeDiscounts: true,
      calculateTotals: true,
      extractUniqueMonitors: true,
      groupParticipants: true,
      ...options
    };

    // 1. Formatear fechas individuales
    const formattedDates = this.formatDates(course, dates, opts);

    // 2. Calcular descuentos (si está habilitado)
    const discountInfoList = opts.includeDiscounts
      ? buildDiscountInfoList(course, dates)
      : [];

    // 3. Agrupar por intervalos (si está habilitado y existen)
    const intervals = opts.includeIntervals
      ? this.buildIntervalGroups(course, formattedDates, discountInfoList)
      : undefined;

    // 4. Extraer monitores únicos
    const monitors = opts.extractUniqueMonitors
      ? this.extractMonitorsData(dates)
      : {unique: [], byDate: new Map()};

    // 5. Agrupar participantes
    const participants = opts.groupParticipants
      ? this.extractParticipants(utilizers, dates)
      : [];

    // 6. Calcular totales de precio
    const pricing = opts.calculateTotals
      ? this.calculatePricingSummary(course, formattedDates, intervals)
      : this.getEmptyPricingSummary(formattedDates[0]?.currency || 'CHF');

    // 7. Extraer extras globales
    const extras = this.extractGlobalExtras(dates);

    return {
      course: {
        id: course.id,
        name: course.name,
        type: course.course_type,
        sport_id: course.sport_id,
        is_flexible: course.is_flexible,
        ...course
      },
      dates: formattedDates,
      intervals,
      participants,
      monitors,
      pricing,
      extras
    };

  }


  /**
   * Formatea las fechas individuales
   */
  private formatDates(
    course: any,
    dates: any[],
    options: BookingDataFormatOptions
  ): FormattedDateData[] {
    return dates.map(date => {
      const price = parseFloat(date?.price ?? course?.price ?? course?.minPrice ?? 0) || 0;
      const currency = date?.currency || course?.currency || 'CHF';

      // Calcular descuento si está habilitado
      let discountInfo: AppliedDiscountInfo | null = null;
      let finalPrice = price;

      if (options.includeDiscounts && course?.is_flexible) {
        const intervalId = date?.interval_id ? String(date.interval_id) : undefined;
        const applicableDiscounts = getApplicableDiscounts(course, intervalId);

        if (applicableDiscounts && applicableDiscounts.length > 0) {
          // Nota: para descuentos individuales necesitamos contar las fechas del mismo intervalo
          // Esto es una aproximación; el cálculo exacto se hace en buildDiscountInfoList
          finalPrice = applyFlexibleDiscount(price, 1, applicableDiscounts);
        }
      }

      const isDiscounted = finalPrice < price;

      return {
        ...date,                      // Copiar todas las propiedades originales
        startHour: date.startHour || date.start_hour || '',
        endHour: date.endHour || date.end_hour || '',
        price: finalPrice,
        originalPrice: isDiscounted ? price : undefined,
        currency,
        utilizers: date.utilizers || date.utilizer || [],
        booking_users: date.booking_users || [],
        extras: date.extras || [],
        interval_id: date.interval_id || null,
        interval_name: date.interval_name || null,
        discountInfo,
        isDiscounted
      };
    });
  }


  /**
   * Agrupa fechas por intervalo
   */
  private buildIntervalGroups(
    course: any,
    formattedDates: FormattedDateData[],
    discountInfoList: AppliedDiscountInfo[]
  ): IntervalGroup[]
    {
      // Agrupar descuentos por intervalo
      const discountByKey = new Map<string, AppliedDiscountInfo[]>();
      discountInfoList.forEach(discount => {
        const key = discount.intervalId ? String(discount.intervalId) : 'default';
        if (!discountByKey.has(key)) {
          discountByKey.set(key, []);
        }
        discountByKey.get(key)!.push(discount);
      });

      // Agrupar fechas por intervalo
      const groupsMap = new Map<string, IntervalGroup>();

      formattedDates.forEach(date => {
        const key = date.interval_id ? String(date.interval_id) : 'default';

        if (!groupsMap.has(key)) {
          const intervalName = date.interval_name ||
            (date.interval_id ? resolveIntervalName(course, String(date.interval_id)) : null) ||
            this.translateService.instant('interval_date_range');

          groupsMap.set(key, {
            key,
            label: intervalName,
            dates: [],
            discountInfo: discountByKey.get(key) || []
          });
        }

        groupsMap.get(key)!.dates.push(date);
      });

      // Calcular resumen de precio por intervalo
      const intervals = Array.from(groupsMap.values());
      const totalDatesCount = formattedDates.length;
      intervals.forEach(interval => {
        interval.priceSummary = this.calculateIntervalPriceSummary(course, interval, totalDatesCount);
      });

      return intervals;
    }


  /**
   * Calcula resumen de precio para un intervalo
   */
  private calculateIntervalPriceSummary(
    course: any,
    interval: IntervalGroup,
    totalDatesCount: number
  ): {
    baseTotal: number;
    discountAmount: number;
    finalTotal: number;
    currency: string;
  } {
    const currency = interval.dates[0]?.currency || course?.currency || 'CHF';

    if (this.isCollectiveFixedCourse(course)) {
      const coursePrice = this.getCourseBasePrice(course);
      const totalDates = totalDatesCount > 0 ? totalDatesCount : interval.dates.length;
      const ratio = totalDates > 0 ? interval.dates.length / totalDates : 0;
      const allocatedPrice = Math.max(0, coursePrice * ratio);

      return {
        baseTotal: allocatedPrice,
        discountAmount: 0,
        finalTotal: allocatedPrice,
        currency
      };
    }

    const baseTotal = interval.dates.reduce((sum, date) =>
      sum + (date.originalPrice || date.price), 0
    );
    const intervalKey = interval.key !== 'default' ? interval.key : undefined;
    const discountsSource = getApplicableDiscounts(course, intervalKey);
    const discountedTotal = applyFlexibleDiscount(baseTotal, interval.dates.length, discountsSource);
    const finalTotal = Math.max(0, discountedTotal);
    const discountAmount = Math.max(0, baseTotal - finalTotal);

    return {
      baseTotal,
      discountAmount,
      finalTotal,
      currency
    };
  }

  /**
   * Extrae datos de monitores
   */
  private extractMonitorsData(dates: any[]): {
    unique: UniqueMonitor[];
    byDate: Map<string, any>;
  } {
    const uniqueMap = new Map<number, UniqueMonitor>();
    const byDate = new Map<string, any>();

    dates.forEach(date => {
      if (date.monitor && date.monitor.id) {
        // Añadir a únicos
        if (!uniqueMap.has(date.monitor.id)) {
          uniqueMap.set(date.monitor.id, {
            id: date.monitor.id,
            name: date.monitor.name || '',
            ...date.monitor
          });
        }

        // Mapear por fecha
        byDate.set(date.date, date.monitor);
      }
    });

    return {
      unique: Array.from(uniqueMap.values()),
      byDate
    };
  }

  /**
   * Extrae participantes únicos
   */
  private extractParticipants(utilizers: any[], dates: any[]): any[] {
    const participantsMap = new Map<number, any>();

    // Extraer de utilizers directos
    if (utilizers && Array.isArray(utilizers)) {
      utilizers.forEach(utilizer => {
        if (utilizer?.id) {
          participantsMap.set(utilizer.id, utilizer);
        }
      });
    }

    // Extraer de fechas (por si hay utilizers por fecha)
    dates.forEach(date => {
      const dateUtilizers = date.utilizers || date.utilizer || [];
      dateUtilizers.forEach((utilizer: any) => {
        if (utilizer?.id && !participantsMap.has(utilizer.id)) {
          participantsMap.set(utilizer.id, utilizer);
        }
      });
    });

    return Array.from(participantsMap.values());
  }

  /**
   * Extrae extras globales (que aparecen en todas las fechas)
   */
  private extractGlobalExtras(dates: any[]): any[] {
    if (!dates || dates.length === 0) {
      return [];
    }

    // Simplificación: devolver todos los extras únicos
    const extrasMap = new Map<number, any>();

    dates.forEach(date => {
      const extras = date.extras || [];
      extras.forEach((extra: any) => {
        if (extra?.id) {
          extrasMap.set(extra.id, extra);
        }
      });
    });

    return Array.from(extrasMap.values());
  }

  /**
   * Calcula resumen total de precio
   */
  private calculatePricingSummary(
    course: any,
    dates: FormattedDateData[],
    intervals?: IntervalGroup[]
  ): ActivityPriceSummary {
    const currency = dates[0]?.currency || course?.currency || 'CHF';
    const isCollectiveFixed = this.isCollectiveFixedCourse(course);
    const fixedCoursePrice = isCollectiveFixed ? this.getCourseBasePrice(course) : 0;

    let basePrice = isCollectiveFixed
      ? fixedCoursePrice
      : dates.reduce((sum, date) =>
        sum + (date.originalPrice || date.price), 0
      );

    let finalPrice = isCollectiveFixed
      ? fixedCoursePrice
      : dates.reduce((sum, date) =>
        sum + date.price, 0
      );

    let discountAmount = Math.max(0, basePrice - finalPrice);

    const breakdown: ActivityPriceSummary['breakdown'] = {};

    if (intervals) {
      let intervalBase = 0;
      let intervalFinal = 0;
      let intervalDiscount = 0;
      intervals.forEach(interval => {
        const base = interval.priceSummary?.baseTotal || 0;
        const discount = interval.priceSummary?.discountAmount || 0;
        const final = interval.priceSummary?.finalTotal || 0;
        breakdown[interval.key] = {
          basePrice: base,
          discountAmount: discount,
          finalPrice: final,
          dateCount: interval.dates.length
        };
        intervalBase += base;
        intervalFinal += final;
        intervalDiscount += discount;
      });

      if (!isCollectiveFixed && intervalBase > 0) {
        basePrice = intervalBase;
        finalPrice = intervalFinal;
        discountAmount = intervalDiscount;
      }
    }

    return {
      basePrice,
      discountAmount,
      finalPrice,
      currency,
      breakdown
    };
  }

  /**
   * Retorna resumen de precio vacío
   */
  private getEmptyPricingSummary(currency: string = 'CHF'): ActivityPriceSummary {
    return {
      basePrice: 0,
      discountAmount: 0,
      finalPrice: 0,
      currency,
      breakdown: {}
    };
  }

  private isCollectiveFixedCourse(course: any): boolean {
    return !!course && Number(course.course_type) === 1 && !course.is_flexible;
  }

  private getCourseBasePrice(course: any): number {
    const raw = course?.price ?? course?.minPrice ?? 0;
    const parsed = typeof raw === 'number' ? raw : parseFloat(raw);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  /**
   * Verifica si una fecha tiene extras
   */
  hasExtrasForDate(date: any): boolean {
    return date?.utilizers?.some((utilizer: any) =>
      utilizer.extras && utilizer.extras.length > 0
    ) || false;
  }

  /**
   * Obtiene el precio de una fecha específica (con descuentos aplicados)
   */
  getDatePrice(date: FormattedDateData): number {
    return date.price;
  }

  /**
   * Obtiene el precio original de una fecha (sin descuentos)
   */
  getDateOriginalPrice(date: FormattedDateData): number {
    return date.originalPrice || date.price;
  }

  /**
   * Verifica si una fecha está descontada
   */
  isDateDiscounted(date: FormattedDateData): boolean {
    return date.isDiscounted || false;
  }
}
