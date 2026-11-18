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

it('scopes methods to the event and preserves an empty list while approval is pending', async () => {
	mockFetch([['/api/payments/methods?eventId=event-pending', () => jsonResponse({ methods: [] })]]);
	const { result } = renderHookWithProviders(() => usePaymentMethods('event-pending'));
	await waitFor(() => expect(result.current.isLoading).toBe(false));
	expect(result.current.methods).toEqual([]);
});

it('offers boleto when enabled for the event', async () => {
	mockFetch([['/api/payments/methods?eventId=event-boleto', () => jsonResponse({ methods: ['BOLETO'] })]]);
	const { result } = renderHookWithProviders(() => usePaymentMethods('event-boleto'));
	await waitFor(() => expect(result.current.isLoading).toBe(false));
	expect(result.current.methods).toEqual(['BOLETO']);
});
