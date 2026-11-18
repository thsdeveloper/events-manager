import { waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderHookWithProviders } from '@/test';
import { usePublicFees } from './usePublicFees';

afterEach(() => vi.unstubAllGlobals());

describe('usePublicFees', () => {
	it('reads the published fee table without needing a session', async () => {
		mockFetch([
			[
				'/api/content/fees',
				() =>
					jsonResponse({
						platform_fee_percentage: 6,
						pix_fee_fixed: 0.9,
						card_fee_percentage: 3,
						card_fee_fixed: 0.5,
						card_installment_2_6_percentage: 4,
						card_installment_7_12_percentage: 5,
						boleto_fee_fixed: 3,
						payout_fee_fixed: 1,
						minimum_payout: 5,
						convenience_fee_calculation_method: 'buyer_pays',
					}),
			],
		]);

		const { result } = renderHookWithProviders(() => usePublicFees());

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.fees).toMatchObject({ platform_fee_percentage: 6, pix_fee_fixed: 0.9, minimum_payout: 5 });
		expect(result.current.isFallback).toBe(false);
	});

	it('falls back to the published defaults when the API is unavailable', async () => {
		mockFetch([['/api/content/fees', () => problemResponse(500, 'INTERNAL_ERROR')]]);

		const { result } = renderHookWithProviders(() => usePublicFees());

		await waitFor(() => expect(result.current.isFallback).toBe(true));
		expect(result.current.fees.platform_fee_percentage).toBe(5);
	});
});
