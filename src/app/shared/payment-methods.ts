export const PAYMENT_METHODS = [
  { id: 1, code: 'cash', i18nKey: 'payment_cash' },
  { id: 2, code: 'gateway', i18nKey: 'payment_gateway' },
  { id: 3, code: 'paylink', i18nKey: 'payment_paylink' },
  { id: 4, code: 'card', i18nKey: 'credit_card' },
  { id: 5, code: 'no_payment', i18nKey: 'payment_no_payment' }
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]['id'];
