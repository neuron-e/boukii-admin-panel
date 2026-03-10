export type RentalUiStatusKey = 'pending' | 'active' | 'overdue' | 'completed' | 'cancelled';

export interface RentalUiStatusView {
  label: RentalUiStatusKey;
  color: string;
  cssClass: string;
  dotClass: string;
}

const RENTAL_STATUS_MAP: Record<RentalUiStatusKey, RentalUiStatusView> = {
  pending: {
    label: 'pending',
    color: '#f59e0b',
    cssClass: 'rental-badge--pending',
    dotClass: 'rental-dot-pending'
  },
  active: {
    label: 'active',
    color: '#22c55e',
    cssClass: 'rental-badge--active',
    dotClass: 'rental-dot-active'
  },
  overdue: {
    label: 'overdue',
    color: '#ef4444',
    cssClass: 'rental-badge--overdue',
    dotClass: 'rental-dot-overdue'
  },
  completed: {
    label: 'completed',
    color: '#6b7280',
    cssClass: 'rental-badge--completed',
    dotClass: 'rental-dot-completed'
  },
  cancelled: {
    label: 'cancelled',
    color: '#9ca3af',
    cssClass: 'rental-badge--cancelled',
    dotClass: 'rental-dot-cancelled'
  }
};

function normalizeRentalStatus(status: string | null | undefined): RentalUiStatusKey {
  const normalized = String(status ?? '').trim().toLowerCase();

  if (['assigned', 'checked_out', 'partial_return'].includes(normalized)) {
    return 'active';
  }

  if (['returned', 'completed'].includes(normalized)) {
    return 'completed';
  }

  if (normalized === 'canceled') {
    return 'cancelled';
  }

  if (normalized in RENTAL_STATUS_MAP) {
    return normalized as RentalUiStatusKey;
  }

  return 'pending';
}

export function rentalUiStatus(status: string | null | undefined): RentalUiStatusView {
  return RENTAL_STATUS_MAP[normalizeRentalStatus(status)];
}
