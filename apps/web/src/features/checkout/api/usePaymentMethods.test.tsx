import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { jsonResponse, mockFetch, problemResponse, renderHookWithProviders } from '@/test';
import { usePaymentMethods } from './usePaymentMethods';

describe('usePaymentMethods', () => {
	it('exposes the methods the API reports', async () => {
		mockFetch([['/api/payments/methods', () => jsonResponse({ methods: ['PIX', 'CARD'] })]]);
		const { result } = renderHookWithProviders(() => usePaymentMethods());

		await waitFor(() => expect(result.current.methods).toEqual(['PIX', 'CARD']));
		expect(result.current.isLoading).toBe(false);
	});

	it('falls back to Pix only when the API cannot answer', async () => {
		mockFetch([['/api/payments/methods', () => problemResponse(500, 'Internal')]]);
		const { result } = renderHookWithProviders(() => usePaymentMethods());

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.methods).toEqual(['PIX']);
	});
});

it('shares a single fresh request between checkout consumers', async () => {
	const { renderHookWithProviders } = await import('@/test');
	const network = mockFetch([['/api/payments/methods', () => jsonResponse({ methods: ['CARD'] })]]);
	const { result } = renderHookWithProviders(() => [usePaymentMethods(), usePaymentMethods()]);
	await waitFor(() => expect(result.current.every((item) => !item.isLoading)).toBe(true));
	expect(network.mock.calls.filter(([, init]) => !init?.signal?.aborted)).toHaveLength(1);
	expect(result.current[0].methods).toEqual(['CARD']);
});
