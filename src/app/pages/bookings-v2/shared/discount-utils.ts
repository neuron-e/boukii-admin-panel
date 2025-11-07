export interface FlexibleDiscountRule {
  threshold: number;
  value: number;
  type: 'percentage' | 'fixed';
}

export interface AppliedDiscountInfo {
  type: 'percentage' | 'fixed';
  value: number;
  threshold: number;
  fromInterval: boolean;
  intervalId?: string | null;
  intervalName?: string | null;
  amountSaved?: number;
  baseTotal?: number;
  discountedTotal?: number;
  currency?: string;
}

function normalizeSettings(settings: any): any {
  if (!settings) {
    return null;
  }

  if (typeof settings === 'string') {
    try {
      return JSON.parse(settings);
    } catch {
      return null;
    }
  }

  return settings;
}

export function parseFlexibleDiscounts(raw: any): FlexibleDiscountRule[] {
  if (!raw) {
    return [];
  }

  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed
    .map((item: any) => {
      const threshold = Number(item?.date ?? item?.dates ?? item?.count ?? item?.n ?? item?.days ?? 0);
      const value = Number(item?.discount ?? item?.percentage ?? item?.percent ?? item?.value ?? 0);
      const type = Number(item?.type ?? 1);
      return {
        threshold,
        value,
        type: type === 2 ? 'fixed' : 'percentage'
      } as FlexibleDiscountRule;
    })
    .filter(item => item.threshold > 0 && !isNaN(item.value) && item.value > 0);
}

export function getIntervalDiscounts(course: any, intervalId: string): any[] {
  if (!course) {
    return [];
  }

  const settings = normalizeSettings(course.settings);
  if (!settings || !Array.isArray(settings.intervals)) {
    return [];
  }

  const interval = settings.intervals.find((i: any) => String(i.id) === String(intervalId));
  if (!interval || !Array.isArray(interval.discounts)) {
    return [];
  }

  return interval.discounts;
}

export function getApplicableDiscounts(course: any, intervalId?: string): any[] {
  if (intervalId) {
    const intervalDiscounts = getIntervalDiscounts(course, intervalId);
    if (intervalDiscounts.length > 0) {
      return intervalDiscounts;
    }
  }

  return course?.discounts || [];
}

export function applyFlexibleDiscount(baseTotal: number, selectedDatesCount: number, rawDiscounts: any): number {
  const discounts = parseFlexibleDiscounts(rawDiscounts);
  if (baseTotal <= 0 || selectedDatesCount <= 0 || discounts.length === 0) {
    return Math.max(0, baseTotal);
  }

  const applicable = discounts
    .filter(discount => selectedDatesCount >= discount.threshold)
    .sort((a, b) => b.threshold - a.threshold)[0];

  if (!applicable || applicable.value <= 0) {
    return Math.max(0, baseTotal);
  }

  let discountedTotal = baseTotal;

  if (applicable.type === 'percentage') {
    const boundedPercentage = Math.max(0, Math.min(100, applicable.value));
    discountedTotal = baseTotal * (1 - boundedPercentage / 100);
  } else {
    discountedTotal = baseTotal - applicable.value;
  }

  return Math.max(0, discountedTotal);
}

export function getAppliedDiscountInfo(course: any, selectedDatesCount: number, intervalId?: string): AppliedDiscountInfo | null {
  const applicableDiscounts = getApplicableDiscounts(course, intervalId);
  const discounts = parseFlexibleDiscounts(applicableDiscounts);

  if (selectedDatesCount <= 0 || discounts.length === 0) {
    return null;
  }

  const applicable = discounts
    .filter(discount => selectedDatesCount >= discount.threshold)
    .sort((a, b) => b.threshold - a.threshold)[0];

  if (!applicable || applicable.value <= 0) {
    return null;
  }

  return {
    type: applicable.type,
    value: applicable.value,
    threshold: applicable.threshold,
    fromInterval: intervalId !== undefined,
    intervalId: intervalId ?? null
  };
}

export function resolveIntervalName(course: any, intervalId: string): string | null {
  if (!intervalId) {
    return null;
  }

  const settings = normalizeSettings(course?.settings);
  if (!settings || !Array.isArray(settings.intervals)) {
    return null;
  }

  const interval = settings.intervals.find((i: any) => String(i.id) === String(intervalId));
  return interval?.name ?? null;
}

export function buildDiscountInfoList(course: any, selectedDates: any[]): AppliedDiscountInfo[] {
  if (!course?.is_flexible || !Array.isArray(selectedDates) || selectedDates.length === 0) {
    return [];
  }

  const byInterval = new Map<string, any[]>();
  selectedDates.forEach((date: any) => {
    const intervalId = date?.interval_id ? String(date.interval_id) : 'default';
    if (!byInterval.has(intervalId)) {
      byInterval.set(intervalId, []);
    }
    byInterval.get(intervalId)!.push(date);
  });

  const infoList: AppliedDiscountInfo[] = [];
  byInterval.forEach((datesInInterval, intervalId) => {
    const targetIntervalId = intervalId !== 'default' ? intervalId : undefined;
    const appliedInfo = getAppliedDiscountInfo(course, datesInInterval.length, targetIntervalId);
    if (!appliedInfo) {
      return;
    }

    const baseTotal = datesInInterval.reduce((acc, date) => {
      const value = parseFloat(
        (date?.price ?? course?.price ?? course?.minPrice ?? 0).toString()
      ) || 0;
      return acc + value;
    }, 0);

    const applicableDiscounts = getApplicableDiscounts(course, targetIntervalId);
    const discountedTotal = applyFlexibleDiscount(baseTotal, datesInInterval.length, applicableDiscounts);
    const amountSaved = Math.max(0, baseTotal - discountedTotal);
    const sampleCurrency = datesInInterval[0]?.currency || course?.currency || '';

    const intervalName = appliedInfo.fromInterval
      ? (datesInInterval[0]?.interval_name || resolveIntervalName(course, intervalId))
      : null;

    infoList.push({
      ...appliedInfo,
      intervalId: intervalId !== 'default' ? intervalId : null,
      intervalName,
      amountSaved,
      baseTotal,
      discountedTotal,
      currency: sampleCurrency
    });
  });

  return infoList;
}
