/**
 * O cupom é conferido pela API: o navegador nunca calcula desconto. O hook
 * guarda o que o servidor devolveu e a mensagem de recusa, que precisa dizer o
 * motivo — código errado, vencido ou esgotado são problemas diferentes.
 */
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { jsonResponse, mockFetch, problemResponse, renderHookWithProviders } from '@/test';
import { useCoupon } from './useCoupon';

const EVENT_ID = '00000000-0000-4000-8000-000000000010';
const items = [{ ticketId: 'ticket-a', quantity: 2 }];

describe('useCoupon', () => {
	it('keeps the discount the server calculated', async () => {
		mockFetch([[/coupons\/apply/, () => jsonResponse({ code: 'JOVENS10', discount: 20, subtotal: 200, total: 180 })]]);
		const { result } = renderHookWithProviders(() => useCoupon(EVENT_ID));

		await act(async () => {
			await result.current.apply('jovens10', items);
		});

		await waitFor(() => expect(result.current.applied).toMatchObject({ code: 'JOVENS10', discount: 20 }));
		expect(result.current.error).toBeNull();
	});

	it('shows why the coupon was refused, not a generic failure', async () => {
		mockFetch([[/coupons\/apply/, () => problemResponse(422, 'Unprocessable', 'Este cupom expirou.')]]);
		const { result } = renderHookWithProviders(() => useCoupon(EVENT_ID));

		await act(async () => {
			await result.current.apply('venceu', items);
		});

		await waitFor(() => expect(result.current.error).toBe('Este cupom expirou.'));
		expect(result.current.applied).toBeNull();
	});

	it('sends the cart to the server so the discount is computed on stored prices', async () => {
		const fetchMock = mockFetch([
			[/coupons\/apply/, () => jsonResponse({ code: 'JOVENS10', discount: 20, subtotal: 200, total: 180 })],
		]);
		const { result } = renderHookWithProviders(() => useCoupon(EVENT_ID));

		await act(async () => {
			await result.current.apply('jovens10', items);
		});

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe(`/api/events/${EVENT_ID}/coupons/apply`);
		expect(JSON.parse(String(init?.body))).toEqual({ code: 'jovens10', items });
	});

	it('asks for a ticket first instead of sending an empty cart to the server', async () => {
		const fetchMock = mockFetch([[/coupons\/apply/, () => jsonResponse({})]]);
		const { result } = renderHookWithProviders(() => useCoupon(EVENT_ID));

		await act(async () => {
			await result.current.apply('jovens10', []);
		});

		await waitFor(() => expect(result.current.error).toBe('Escolha ao menos um ingresso antes de aplicar o cupom.'));
		expect(result.current.applied).toBeNull();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('drops the discount when the buyer removes the coupon', async () => {
		mockFetch([[/coupons\/apply/, () => jsonResponse({ code: 'JOVENS10', discount: 20, subtotal: 200, total: 180 })]]);
		const { result } = renderHookWithProviders(() => useCoupon(EVENT_ID));

		await act(async () => {
			await result.current.apply('jovens10', items);
		});
		await waitFor(() => expect(result.current.applied).not.toBeNull());

		act(() => result.current.clear());

		expect(result.current.applied).toBeNull();
		expect(result.current.error).toBeNull();
	});

	it('clears a previous refusal when a new code is tried', async () => {
		let attempt = 0;
		mockFetch([
			[
				/coupons\/apply/,
				() =>
					attempt++ === 0
						? problemResponse(404, 'Not Found', 'Cupom não encontrado para este evento.')
						: jsonResponse({ code: 'JOVENS10', discount: 20, subtotal: 200, total: 180 }),
			],
		]);
		const { result } = renderHookWithProviders(() => useCoupon(EVENT_ID));

		await act(async () => {
			await result.current.apply('errado', items);
		});
		await waitFor(() => expect(result.current.error).not.toBeNull());

		await act(async () => {
			await result.current.apply('jovens10', items);
		});

		await waitFor(() => expect(result.current.error).toBeNull());
		expect(result.current.applied).toMatchObject({ code: 'JOVENS10' });
	});
});
