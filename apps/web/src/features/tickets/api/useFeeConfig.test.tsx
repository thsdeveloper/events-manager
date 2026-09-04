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
				'/api/admin/event-configurations',
				() => jsonResponse({ platform_fee_percentage: 7, card_fee_percentage: 2.9, card_fee_fixed: 0.39 }),
			],
		]);

		const { result } = renderHookWithProviders(() => useFeeConfig());

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.feeConfig).toEqual({
			platformFeePercentage: 7,
			providerPercentageFee: 2.9,
			providerFixedFee: 0.39,
		});
		expect(result.current.isFallback).toBe(false);
	});

	it('falls back to the published defaults and flags it when the request fails', async () => {
		mockFetch([['/api/admin/event-configurations', () => problemResponse(500, 'INTERNAL_ERROR')]]);

		const { result } = renderHookWithProviders(() => useFeeConfig());

		await waitFor(() => expect(result.current.isFallback).toBe(true));
		expect(result.current.feeConfig).toEqual({
			platformFeePercentage: 5,
			providerPercentageFee: 3.5,
			providerFixedFee: 0.6,
		});
	});
});
