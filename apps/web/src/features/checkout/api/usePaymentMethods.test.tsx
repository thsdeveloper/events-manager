/**
 * A loja no provedor decide o que aceita (Pix e/ou cartão). O front pergunta à
 * API antes de oferecer as opções; sem resposta, só Pix, que toda loja tem.
 *
 * O hook roda na página pública do evento, que não tem `QueryClientProvider`:
 * por isso é renderizado aqui sem providers, como `useCoupon` e `useCheckout`.
 */
import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { jsonResponse, mockFetch, problemResponse } from '@/test';
import { usePaymentMethods } from './usePaymentMethods';

describe('usePaymentMethods', () => {
	it('exposes the methods the API reports', async () => {
		mockFetch([['/api/payments/methods', () => jsonResponse({ methods: ['PIX', 'CARD'] })]]);
		const { result } = renderHook(() => usePaymentMethods());

		await waitFor(() => expect(result.current.methods).toEqual(['PIX', 'CARD']));
		expect(result.current.isLoading).toBe(false);
	});

	it('falls back to Pix only when the API cannot answer', async () => {
		mockFetch([['/api/payments/methods', () => problemResponse(500, 'Internal')]]);
		const { result } = renderHook(() => usePaymentMethods());

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.methods).toEqual(['PIX']);
	});
});
