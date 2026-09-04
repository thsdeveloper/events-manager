import type { ApiEnv } from '../../src/config/env.js';

/**
 * Ambiente mínimo e determinístico para testes. Nenhum valor aponta para um
 * serviço real: as chaves são fictícias e o modo de pagamento é `mock`.
 *
 * Use `createTestEnv({ PAYMENTS_MODE: 'abacatepay' })` para variar apenas o
 * que o cenário precisa, mantendo o restante estável entre os arquivos.
 */
export const TEST_ENV: ApiEnv = Object.freeze({
	NODE_ENV: 'test',
	API_HOST: '127.0.0.1',
	API_PORT: 3333,
	TRUST_PROXY_HOPS: 0,
	WEB_URL: 'http://localhost:3003',
	SUPABASE_URL: 'http://127.0.0.1:55321',
	SUPABASE_ANON_KEY: 'test-anon-key',
	SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
	COOKIE_SECRET: 'test-cookie-secret-value',
	ABACATEPAY_BASE_URL: 'https://api.abacatepay.com/v2',
	PAYMENTS_MODE: 'mock',
	PAYMENT_RECONCILIATION_INTERVAL_SECONDS: 60,
	PAYMENT_RECONCILIATION_MIN_AGE_MINUTES: 20,
	PAYMENT_RECONCILIATION_BATCH_SIZE: 25,
	SMTP_HOST: '127.0.0.1',
	SMTP_PORT: 55325,
	SMTP_SECURE: false,
	EMAIL_FROM: 'Events Manager <test@events.local>',
}) as ApiEnv;

export function createTestEnv(overrides: Partial<ApiEnv> = {}): ApiEnv {
	return { ...TEST_ENV, ...overrides };
}
