import { act } from 'react';
import { waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderHookWithProviders } from '@/test';
import { useCheckout } from './useCheckout';
const tickets = [{ ticketId: 'ticket-a', quantity: 1, attendees: [{ name: 'Ana', email: 'ana@example.test' }] }];
const participant = { name: 'Ana Silva', email: 'ana@example.test' };
const options = { expectedAmountInCents: 10000, installments: 1 };
it('shows the current success once and starts a fresh checkout when the buyer returns', async () => {
	sessionStorage.clear();
	let id = '';
	mockFetch([
		[
			'/api/payments/checkout',
			async (_url, init) => {
				id = JSON.parse(String(init?.body)).requestId;

				return jsonResponse({ attemptId: id, status: 'confirmed', payment: null });
			},
		],
		[/\/api\/payments\/attempts\//, () => jsonResponse({ attemptId: id, status: 'confirmed', payment: null })],
	]);
	const first = renderHookWithProviders(() => useCheckout({ eventId: 'success-event', userId: 'buyer' }));
	await act(async () => {
		await first.result.current.createCheckoutSession(tickets, participant, undefined, 'PIX', options);
	});
	expect(first.result.current.attempt?.status).toBe('confirmed');
	await waitFor(() => expect(sessionStorage.getItem('checkout-attempt:buyer:success-event')).toBeNull());
	first.unmount();
	const returned = renderHookWithProviders(() => useCheckout({ eventId: 'success-event', userId: 'buyer' }));
	expect(returned.result.current.attempt).toBeNull();
});
it('discards a previously saved purchase after the server reports it was confirmed', async () => {
	sessionStorage.clear();
	const id = '00000000-0000-4000-8000-000000000009';
	sessionStorage.setItem('checkout-attempt:buyer:old-event', id);
	mockFetch([
		[/\/api\/payments\/attempts\//, () => jsonResponse({ attemptId: id, status: 'confirmed', payment: null })],
	]);
	const { result } = renderHookWithProviders(() => useCheckout({ eventId: 'old-event', userId: 'buyer' }));
	await waitFor(() => expect(result.current.attempt).toBeNull());
	expect(sessionStorage.getItem('checkout-attempt:buyer:old-event')).toBeNull();
});
it('preserves a pending purchase when the buyer returns so no second charge is created', async () => {
	sessionStorage.clear();
	const id = '00000000-0000-4000-8000-000000000010';
	sessionStorage.setItem('checkout-attempt:buyer:pending-event', id);
	mockFetch([
		[
			/\/api\/payments\/attempts\//,
			() => jsonResponse({ attemptId: id, status: 'pending', payment: { id: 'pix_pending' } }),
		],
	]);
	const first = renderHookWithProviders(() => useCheckout({ eventId: 'pending-event', userId: 'buyer' }));
	await waitFor(() => expect(first.result.current.attempt?.status).toBe('pending'));
	first.unmount();
	const returned = renderHookWithProviders(() => useCheckout({ eventId: 'pending-event', userId: 'buyer' }));
	await waitFor(() => expect(returned.result.current.attempt?.status).toBe('pending'));
	expect(sessionStorage.getItem('checkout-attempt:buyer:pending-event')).toBe(id);
});
it('celebrates a recovered pending purchase that is confirmed while the buyer is watching', async () => {
	sessionStorage.clear();
	const id = '00000000-0000-4000-8000-000000000011';
	sessionStorage.setItem('checkout-attempt:buyer:watch-event', id);
	let status = 'pending';
	mockFetch([[/\/api\/payments\/attempts\//, () => jsonResponse({ attemptId: id, status, payment: null })]]);
	const { result } = renderHookWithProviders(() => useCheckout({ eventId: 'watch-event', userId: 'buyer' }));
	await waitFor(() => expect(result.current.attempt?.status).toBe('pending'));
	status = 'confirmed';
	await act(async () => {
		await result.current.refresh();
	});
	await waitFor(() => expect(result.current.attempt?.status).toBe('confirmed'));
	expect(sessionStorage.getItem('checkout-attempt:buyer:watch-event')).toBeNull();
});
it('keeps Pix inside the checkout, sends an idempotency key and never sends user-controlled userId', async () => {
	sessionStorage.clear();
	let body: any;
	mockFetch([
		[
			'/api/payments/checkout',
			async (_url, init) => {
				body = JSON.parse(String(init?.body));

				return jsonResponse({
					attemptId: body.requestId,
					status: 'pending',
					payment: { id: 'pix_1', copyPasteCode: 'code' },
				});
			},
		],
		[
			/\/api\/payments\/attempts\//,
			() =>
				jsonResponse({ attemptId: body.requestId, status: 'pending', payment: { id: 'pix_1', copyPasteCode: 'code' } }),
		],
	]);
	const { result } = renderHookWithProviders(() => useCheckout({ eventId: 'e1', userId: 'u1' }));
	await act(async () => {
		await result.current.createCheckoutSession(tickets, participant, undefined, 'PIX', options);
	});
	expect(body).toMatchObject({ paymentMethod: 'PIX', expectedAmountInCents: 10000, tickets });
	expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
	expect(body.userId).toBeUndefined();
	expect(result.current.attempt).toMatchObject({ status: 'pending', payment: { copyPasteCode: 'code' } });
});
it('keeps the same attempt after a network failure and does not silently charge again', async () => {
	sessionStorage.clear();
	const fetcher = mockFetch([
		['/api/payments/checkout', () => Promise.reject(new TypeError('network'))],
		[/\/api\/payments\/attempts\//, () => jsonResponse({ attemptId: 'a', status: 'processing', payment: null })],
	]);
	const { result } = renderHookWithProviders(() => useCheckout({ eventId: 'e2', userId: 'u2' }));
	await act(async () => {
		await result.current.createCheckoutSession(tickets, participant, undefined, 'PIX', options).catch(() => undefined);
	});
	expect(result.current.attempt?.status).toBe('processing');
	await act(async () => {
		await result.current.createCheckoutSession(tickets, participant, undefined, 'PIX', options);
	});
	expect(fetcher.mock.calls.filter(([url]) => String(url) === '/api/payments/checkout')).toHaveLength(1);
});
it('shows the API field validation through the standard error description', async () => {
	sessionStorage.clear();
	mockFetch([
		[
			'/api/payments/checkout',
			() =>
				problemResponse(422, 'VALIDATION_ERROR', 'Inválido', {
					errors: { fieldErrors: { participantInfo: ['CPF inválido'] }, formErrors: [] },
				}),
		],
	]);
	const { result } = renderHookWithProviders(() => useCheckout({ eventId: 'e3', userId: 'u3' }));
	await act(async () => {
		await result.current.createCheckoutSession(tickets, participant, undefined, 'PIX', options).catch(() => undefined);
	});
	expect(result.current.error).toBe('CPF inválido');
});
it('clears the previous purchase when the buyer or event changes', async () => {
	sessionStorage.clear();
	const id = '00000000-0000-4000-8000-000000000001';
	sessionStorage.setItem('checkout-attempt:u1:e1', id);
	mockFetch([
		[
			/\/api\/payments\/attempts\//,
			() => jsonResponse({ attemptId: id, status: 'pending', payment: { copyPasteCode: 'private-code' } }),
		],
	]);
	const { result, rerender } = renderHookWithProviders(({ userId, eventId }) => useCheckout({ userId, eventId }), {
		initialProps: { userId: 'u1', eventId: 'e1' },
	});
	await act(async () => {});
	expect(result.current.attempt?.attemptId).toBe(id);
	rerender({ userId: 'u2', eventId: 'e2' });
	expect(result.current.attempt).toBeNull();
});
