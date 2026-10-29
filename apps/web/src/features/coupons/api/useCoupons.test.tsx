/**
 * Gestão dos cupons pelo organizador. Toda escrita passa pela API, que reconfere
 * a posse do evento; o hook só cuida de manter a lista em dia e de mostrar o
 * motivo de uma recusa.
 */
import { act } from 'react';
import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderHookWithProviders } from '@/test';
import { useCoupons } from './useCoupons';

const EVENT_ID = '00000000-0000-4000-8000-000000000010';
const coupon = {
	id: 'c-1',
	event_id: EVENT_ID,
	code: 'JOVENS10',
	description: null,
	discount_type: 'percentage',
	discount_value: 10,
	status: 'active',
	starts_at: null,
	expires_at: null,
	max_uses: 50,
	uses: 3,
	date_created: '2026-09-01T00:00:00.000Z',
	date_updated: '2026-09-01T00:00:00.000Z',
};

const newCoupon = { code: 'META20', discount_type: 'fixed' as const, discount_value: 20 };

describe('useCoupons', () => {
	it('lists the coupons of the event', async () => {
		mockFetch([[/coupons/, () => jsonResponse({ data: [coupon] })]]);
		const { result } = renderHookWithProviders(() => useCoupons(EVENT_ID));

		await waitFor(() => expect(result.current.coupons).toHaveLength(1));
		expect(result.current.coupons[0].code).toBe('JOVENS10');
	});

	it('adds a coupon and refreshes the list', async () => {
		let listed = [coupon];
		mockFetch([
			[
				/coupons/,
				(_input, init) => {
					if (init?.method === 'POST') {
						listed = [coupon, { ...coupon, id: 'c-2', code: 'META20' }];

						return jsonResponse({ ...coupon, id: 'c-2', code: 'META20' }, { status: 201 });
					}

					return jsonResponse({ data: listed });
				},
			],
		]);
		const { result } = renderHookWithProviders(() => useCoupons(EVENT_ID));
		await waitFor(() => expect(result.current.coupons).toHaveLength(1));

		await act(async () => {
			await result.current.create(newCoupon);
		});

		await waitFor(() => expect(result.current.coupons).toHaveLength(2));
	});

	it('surfaces the reason the API refused a coupon', async () => {
		mockFetch([
			[
				/coupons/,
				(_input, init) =>
					init?.method === 'POST'
						? problemResponse(422, 'Unprocessable', 'Já existe um cupom com este código.')
						: jsonResponse({ data: [] }),
			],
		]);
		const { result } = renderHookWithProviders(() => useCoupons(EVENT_ID));

		await act(async () => {
			await result.current.create(newCoupon);
		});

		await waitFor(() => expect(result.current.error).toBe('Já existe um cupom com este código.'));
	});

	it('removes a coupon through the API', async () => {
		const fetchMock = mockFetch([
			[/coupons/, (_input, init) => (init?.method === 'DELETE' ? new Response(null, { status: 204 }) : jsonResponse({ data: [coupon] }))],
		]);
		const { result } = renderHookWithProviders(() => useCoupons(EVENT_ID));
		await waitFor(() => expect(result.current.coupons).toHaveLength(1));

		await act(async () => {
			await result.current.remove('c-1');
		});

		expect(fetchMock.mock.calls.some(([url, init]) => String(url).endsWith('/coupons/c-1') && init?.method === 'DELETE')).toBe(true);
	});

	it('toggles a coupon between active and inactive', async () => {
		const fetchMock = mockFetch([
			[/coupons/, (_input, init) => (init?.method === 'PATCH' ? jsonResponse({ ...coupon, status: 'inactive' }) : jsonResponse({ data: [coupon] }))],
		]);
		const { result } = renderHookWithProviders(() => useCoupons(EVENT_ID));
		await waitFor(() => expect(result.current.coupons).toHaveLength(1));

		await act(async () => {
			await result.current.setStatus('c-1', 'inactive');
		});

		const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
		expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ status: 'inactive' });
	});
});
