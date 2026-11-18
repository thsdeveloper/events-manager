/**
 * Exemplo de referência do ciclo TDD para hooks de dados (React Query + fetch).
 * A rede é substituída por `mockFetch`; nenhum servidor é necessário.
 */
import { waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderHookWithProviders } from '@/test';
import { useFeeConfig } from './useFeeConfig';

afterEach(() => vi.unstubAllGlobals());

describe('useFeeConfig', () => {
	it('maps the platform configuration into the fee shape used by the forms', async () => {
		mockFetch([
			[
				'/api/organizer/payment-settings',
				() =>
					jsonResponse({
						settings: { accepted_payment_methods: ['PIX'], credit_card_settlement_period: null },
						available_methods: ['PIX'],
						pending_methods: [],
						gateway_card_settlement_period: 'D+1',
					}),
			],
			[
				'/api/content/fees',
				() =>
					jsonResponse({
						platform_fee_percentage: 7,
						platform_fee_minimum: 3,
						card_fee_percentage: 2.9,
						card_fee_fixed: 0.39,
					}),
			],
		]);

		const { result } = renderHookWithProviders(() => useFeeConfig());

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.feeConfig).toEqual({
			platformFeePercentage: 7,
			platformFeeMinimum: 3,
			providerPercentageFee: 0,
			providerFixedFee: 0.8,
		});
		expect(result.current.isFallback).toBe(false);
	});

	it('falls back to the published defaults and flags it when the request fails', async () => {
		mockFetch([['/api/content/fees', () => problemResponse(500, 'INTERNAL_ERROR')]]);

		const { result } = renderHookWithProviders(() => useFeeConfig());

		await waitFor(() => expect(result.current.isFallback).toBe(true));
		expect(result.current.feeConfig).toEqual({
			platformFeePercentage: 5,
			platformFeeMinimum: 0,
			providerPercentageFee: 0,
			providerFixedFee: 0.8,
		});
	});
});

it('uses Pix fees for the default organization and shares its selected methods with the details modal', async () => {
	mockFetch([
		['/api/content/fees', () => jsonResponse({ platform_fee_percentage: 5, pix_fee_fixed: 0.8 })],
		[
			'/api/organizer/payment-settings',
			() =>
				jsonResponse({
					settings: { accepted_payment_methods: ['PIX'], credit_card_settlement_period: null },
					available_methods: ['PIX'],
					pending_methods: [],
					gateway_card_settlement_period: 'D+1',
				}),
		],
	]);
	const { result } = renderHookWithProviders(() => useFeeConfig());
	await waitFor(() => expect(result.current.isLoading).toBe(false));
	expect(result.current.feeConfig.providerPercentageFee).toBe(0);
	expect(result.current.feeConfig.providerFixedFee).toBe(0.8);
	expect(result.current.paymentSettings?.settings.accepted_payment_methods).toEqual(['PIX']);
});

it('uses the requested settlement percentage when only credit is selected', async () => {
	mockFetch([
		['/api/content/fees', () => jsonResponse({ platform_fee_percentage: 5 })],
		[
			'/api/organizer/payment-settings',
			() =>
				jsonResponse({
					settings: { accepted_payment_methods: ['CARD'], credit_card_settlement_period: 'D+7' },
					available_methods: [],
					pending_methods: [{ method: 'CARD', reason: 'settlement' }],
					gateway_card_settlement_period: 'D+1',
				}),
		],
	]);
	const { result } = renderHookWithProviders(() => useFeeConfig());
	await waitFor(() => expect(result.current.isLoading).toBe(false));
	expect(result.current.feeConfig.providerPercentageFee).toBe(5.03);
	expect(result.current.feeConfig.providerFixedFee).toBe(0.6);
});

it.each([
	['BOLETO', 0, 2.5],
	['DEBIT', 2.5, 0.6],
] as const)('uses the organization %s rate in the compact summary', async (method, percentage, fixed) => {
	mockFetch([
		['/api/content/fees', () => jsonResponse({ platform_fee_percentage: 5 })],
		[
			'/api/organizer/payment-settings',
			() =>
				jsonResponse({
					settings: { accepted_payment_methods: [method], credit_card_settlement_period: null },
					available_methods: [],
					pending_methods: [],
					gateway_card_settlement_period: 'D+1',
				}),
		],
	]);
	const { result } = renderHookWithProviders(() => useFeeConfig());
	await waitFor(() => expect(result.current.isLoading).toBe(false));
	expect(result.current.feeConfig).toMatchObject({ providerPercentageFee: percentage, providerFixedFee: fixed });
});
