import type { ApiEnv } from '../../config/env.js';
import type { PaymentGateway } from '../../application/payments/payment-gateway.js';
import { ApiError } from '../../shared/errors.js';
import { AbacatePayGateway } from './abacatepay-gateway.js';
import { MockPaymentGateway } from './mock-payment-gateway.js';

export function createPaymentGateway(env: ApiEnv): PaymentGateway {
  if (env.PAYMENTS_MODE === 'mock') return new MockPaymentGateway();
  if (!env.ABACATEPAY_API_KEY) {
    throw new ApiError('ABACATEPAY_API_KEY é obrigatória fora do modo mock.', 500, 'PAYMENT_CONFIGURATION_ERROR');
  }
  return new AbacatePayGateway(env.ABACATEPAY_API_KEY, env.ABACATEPAY_BASE_URL);
}

