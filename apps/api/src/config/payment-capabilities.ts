import type { CheckoutMethod, PaymentProvider } from '../application/payments/payment-gateway.js';
import type { ApiEnv } from './env.js';

/** Shared by organization settings and checkout so an enabled method is actually usable. */
export function paymentCapabilities(env: ApiEnv, provider: PaymentProvider = env.PAYMENTS_MODE) {
	const methods: CheckoutMethod[] =
		provider === 'mock'
			? ['PIX', 'CARD', 'BOLETO']
			: env.ABACATEPAY_METHODS.filter((method) => method !== 'CARD' || Boolean(env.ABACATEPAY_PUBLIC_KEY));
	const testMode =
		env.APP_ENV === 'development' && (provider === 'mock' || Boolean(env.ABACATEPAY_API_KEY?.startsWith('abc_dev_')));

	return { methods, testMode };
}
