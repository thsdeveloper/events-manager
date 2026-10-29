/**
 * O método escolhido na tela viaja com o pedido: o servidor confere se a loja
 * aceita e envia só ele ao provedor.
 */
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderHookWithProviders } from '@/test';
import { useCheckout } from './useCheckout';

const tickets = [{ ticketId: 'ticket-a', quantity: 1 }];
const participant = { name: 'Ana', email: 'ana@events.local' };

describe('useCheckout', () => {
	it('sends the chosen payment method along with the cart', async () => {
		vi.stubGlobal('location', { ...window.location, href: '' });
		const fetchMock = mockFetch([
			['/api/payments/checkout', () => jsonResponse({ checkoutId: 'bill_1', url: 'https://pay', registrationId: 'r' })],
		]);
		const { result } = renderHookWithProviders(() => useCheckout({ eventId: 'e-1' }));

		await act(async () => {
			await result.current.createCheckoutSession(tickets, participant, undefined, 'CARD');
		});

		expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ paymentMethod: 'CARD' });
	});

	it('sends the attendees of each unit along with the cart, pending ones as null', async () => {
		vi.stubGlobal('location', { ...window.location, href: '' });
		const fetchMock = mockFetch([
			['/api/payments/checkout', () => jsonResponse({ checkoutId: 'bill_1', url: 'https://pay', registrationId: 'r' })],
		]);
		const { result } = renderHookWithProviders(() => useCheckout({ eventId: 'e-1' }));
		const cart = [{ ticketId: 'ticket-a', quantity: 2, attendees: [{ name: 'Ana', email: 'ana@events.local' }, null] }];

		await act(async () => {
			await result.current.createCheckoutSession(cart, participant);
		});

		expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).tickets).toEqual(cart);
	});

	it('names the refused field instead of the generic validation message', async () => {
		mockFetch([
			[
				'/api/payments/checkout',
				() =>
					problemResponse(422, 'VALIDATION_ERROR', 'Os dados enviados são inválidos.', {
						errors: { fieldErrors: { participantInfo: ['CPF inválido'] }, formErrors: [] },
					}),
			],
		]);
		const { result } = renderHookWithProviders(() => useCheckout({ eventId: 'e-1' }));

		await act(async () => {
			await result.current.createCheckoutSession(tickets, participant).catch(() => undefined);
		});

		expect(result.current.error).toBe('CPF inválido');
	});
});
