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
	it('offers only PIX when nothing is configured', () => {
		expect(loadEnv(base).ABACATEPAY_METHODS).toEqual(['PIX']);
	});

	it('accepts a comma separated list, ignoring spaces and case', () => {
		expect(loadEnv({ ...base, ABACATEPAY_METHODS: ' pix, Card ' }).ABACATEPAY_METHODS).toEqual(['PIX', 'CARD']);
	});

	it('refuses a method the gateway does not support', () => {
		expect(() => loadEnv({ ...base, ABACATEPAY_METHODS: 'PIX,BOLETO' })).toThrow(/ABACATEPAY_METHODS/);
	});
});
