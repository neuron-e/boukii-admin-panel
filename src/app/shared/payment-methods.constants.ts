/**
 * Constantes para métodos de pago
 * IDs estables independientes de i18n
 */
export const PAYMENT_METHODS = [
  { id: 1, code: 'cash', i18nKey: 'payment_cash' },
  { id: 2, code: 'gateway', i18nKey: 'payment_gateway' },
  { id: 3, code: 'paylink', i18nKey: 'payment_paylink' },
  { id: 4, code: 'card', i18nKey: 'credit_card' },
  { id: 7, code: 'invoice', i18nKey: 'payment_invoice' }
] as const;

export type PaymentMethodId = typeof PAYMENT_METHODS[number]['id'];

/**
 * Helper para obtener método de pago por ID
 */
export function getPaymentMethodById(id: PaymentMethodId) {
  return PAYMENT_METHODS.find(method => method.id === id);
}

/**
 * Helper para determinar si es pago offline
 */
export function isOfflinePayment(methodId: PaymentMethodId): boolean {
  return methodId === 1 || methodId === 4; // cash or card
}

/**
 * Helper para determinar si es pago online
 */
export function isOnlinePayment(methodId: PaymentMethodId): boolean {
  return methodId === 2 || methodId === 3 || methodId === 7; // gateway, paylink, or invoice
}
