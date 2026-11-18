/**
 * Métodos de pagamento do checkout hospedado.
 *
 * O AbacatePay recusa o checkout inteiro quando um método não está habilitado
 * na loja ("CARD is not available for this store"), e não há endpoint para
 * consultar quais estão. A lista vem da configuração, com PIX como padrão
 * porque toda loja nasce com ele.
 */
import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';

const base = { SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service' };

describe('ABACATEPAY_METHODS', () => {
	it('allows the example environment to leave the optional public key empty', () => {
		expect(loadEnv({ ...base, ABACATEPAY_PUBLIC_KEY: '' }).ABACATEPAY_PUBLIC_KEY).toBeUndefined();
	});
	it('offers only PIX when nothing is configured', () => {
		expect(loadEnv(base).ABACATEPAY_METHODS).toEqual(['PIX']);
	});

	it('accepts a comma separated list, ignoring spaces and case', () => {
		expect(loadEnv({ ...base, ABACATEPAY_METHODS: ' pix, Card ' }).ABACATEPAY_METHODS).toEqual(['PIX', 'CARD']);
	});

	it('accepts boleto when the gateway account has enabled it', () => {
		expect(loadEnv({ ...base, ABACATEPAY_METHODS: 'PIX,BOLETO' }).ABACATEPAY_METHODS).toEqual(['PIX', 'BOLETO']);
	});

	it('refuses a method the gateway does not support', () => {
		expect(() => loadEnv({ ...base, ABACATEPAY_METHODS: 'PIX,DEBIT' })).toThrow(/ABACATEPAY_METHODS/);
	});
});

describe('production security configuration', () => {
	const production = {
		...base,
		NODE_ENV: 'production',
		WEB_URL: 'https://flouvi.example',
		COOKIE_SECRET: 'a-long-random-production-secret-value',
		PAYMENTS_MODE: 'abacatepay',
		ABACATEPAY_API_KEY: 'test-key',
		ABACATEPAY_WEBHOOK_SECRET: 'test-webhook-secret',
	};
	it('accepts explicit production credentials and HTTPS', () => {
		expect(loadEnv(production).NODE_ENV).toBe('production');
	});
	it.each([
		{ COOKIE_SECRET: undefined },
		{ COOKIE_SECRET: 'local-development-cookie-secret' },
		{ COOKIE_SECRET: 'a-secret-too-short' },
		{ PAYMENTS_MODE: 'mock' },
		{ ABACATEPAY_WEBHOOK_SECRET: undefined },
		{ ABACATEPAY_API_KEY: undefined },
		{ WEB_URL: 'http://flouvi.example' },
	])('refuses unsafe production configuration: %j', (overrides) => {
		expect(() => loadEnv({ ...production, ...overrides })).toThrow(/Configuração inválida/);
	});
});

describe('cloud development configuration', () => {
	const development = {
		...base,
		NODE_ENV: 'production',
		APP_ENV: 'development',
		WEB_URL: 'https://flouvi-dev.vercel.app',
		COOKIE_SECRET: 'a-random-development-secret-with-32-characters',
		PAYMENTS_MODE: 'mock',
	};

	it('runs an optimized server with simulated payments in the development deployment', () => {
		expect(loadEnv(development)).toMatchObject({
			NODE_ENV: 'production',
			APP_ENV: 'development',
			PAYMENTS_MODE: 'mock',
		});
	});

	it.each([{ COOKIE_SECRET: undefined }, { WEB_URL: 'http://flouvi-dev.vercel.app' }])(
		'keeps HTTPS and strong cookie secrets mandatory: %j',
		(overrides) => expect(() => loadEnv({ ...development, ...overrides })).toThrow(/Configuração inválida/),
	);

	it('requires provider credentials when real payments are enabled even in development', () => {
		expect(() => loadEnv({ ...development, PAYMENTS_MODE: 'abacatepay' })).toThrow(/ABACATEPAY_API_KEY/);
	});
});
