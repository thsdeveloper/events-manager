/**
 * Regras do cupom de desconto.
 *
 * O desconto é sempre calculado aqui, no servidor: o navegador só exibe o que
 * esta camada devolve. Um valor vindo do cliente seria trivialmente adulterável.
 */
import { describe, expect, it, vi } from 'vitest';
import {
	CouponExhausted,
	CouponExpired,
	CouponNotFound,
	CouponNotStarted,
	CouponService,
	EventNotOwned,
	TicketNotInEvent,
	type CouponRepository,
} from '../src/application/coupons/coupon-service.js';
import { couponRoutes } from '../src/routes/coupons.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	partialMock,
	sessionCookie,
	TEST_EVENT_ID,
	TEST_USER_ID,
} from './support/index.js';

const baseCoupon = {
	id: '00000000-0000-4000-8000-000000000100',
	event_id: TEST_EVENT_ID,
	code: 'JOVENS10',
	discount_type: 'percentage' as const,
	discount_value: 10,
	status: 'active' as const,
	starts_at: null,
	expires_at: null,
	max_uses: null,
	uses: 0,
};

function serviceWith(coupon: unknown) {
	const repository = partialMock<CouponRepository>({
		findActiveByCode: vi.fn().mockResolvedValue(coupon),
	});

	return { service: new CouponService(repository), repository };
}

describe('CouponService.validate', () => {
	it('discounts the percentage the organizer configured', async () => {
		const { service } = serviceWith(baseCoupon);

		const result = await service.validate({ eventId: TEST_EVENT_ID, code: 'JOVENS10', subtotal: 200 });

		expect(result.discount).toBe(20);
		expect(result.total).toBe(180);
	});

	it('discounts a flat amount when the coupon is expressed in reais', async () => {
		const { service } = serviceWith({ ...baseCoupon, discount_type: 'fixed', discount_value: 20 });

		const result = await service.validate({ eventId: TEST_EVENT_ID, code: 'JOVENS10', subtotal: 200 });

		expect(result.discount).toBe(20);
		expect(result.total).toBe(180);
	});

	it('never lets a flat coupon push the total below zero', async () => {
		const { service } = serviceWith({ ...baseCoupon, discount_type: 'fixed', discount_value: 500 });

		const result = await service.validate({ eventId: TEST_EVENT_ID, code: 'JOVENS10', subtotal: 200 });

		expect(result.discount).toBe(200);
		expect(result.total).toBe(0);
	});

	it('rounds the discount to cents', async () => {
		const { service } = serviceWith({ ...baseCoupon, discount_value: 15 });

		const result = await service.validate({ eventId: TEST_EVENT_ID, code: 'JOVENS10', subtotal: 33.33 });

		expect(result.discount).toBe(5);
		expect(result.total).toBe(28.33);
	});

	it('rejects a code that does not belong to the event', async () => {
		const { service } = serviceWith(null);

		await expect(
			service.validate({ eventId: TEST_EVENT_ID, code: 'INEXISTENTE', subtotal: 200 }),
		).rejects.toBeInstanceOf(CouponNotFound);
	});

	it('rejects a coupon whose start date has not arrived', async () => {
		const { service } = serviceWith({ ...baseCoupon, starts_at: '2030-01-01T00:00:00.000Z' });

		await expect(service.validate({ eventId: TEST_EVENT_ID, code: 'JOVENS10', subtotal: 200 })).rejects.toBeInstanceOf(
			CouponNotStarted,
		);
	});

	it('rejects a coupon past its expiry date', async () => {
		const { service } = serviceWith({ ...baseCoupon, expires_at: '2020-01-01T00:00:00.000Z' });

		await expect(service.validate({ eventId: TEST_EVENT_ID, code: 'JOVENS10', subtotal: 200 })).rejects.toBeInstanceOf(
			CouponExpired,
		);
	});

	it('accepts a coupon inside its window', async () => {
		const { service } = serviceWith({
			...baseCoupon,
			starts_at: '2020-01-01T00:00:00.000Z',
			expires_at: '2030-01-01T00:00:00.000Z',
		});

		await expect(service.validate({ eventId: TEST_EVENT_ID, code: 'JOVENS10', subtotal: 200 })).resolves.toMatchObject({
			discount: 20,
		});
	});

	it('rejects a coupon that ran out of uses', async () => {
		const { service } = serviceWith({ ...baseCoupon, max_uses: 50, uses: 50 });

		await expect(service.validate({ eventId: TEST_EVENT_ID, code: 'JOVENS10', subtotal: 200 })).rejects.toBeInstanceOf(
			CouponExhausted,
		);
	});

	it('still accepts a coupon with uses left', async () => {
		const { service } = serviceWith({ ...baseCoupon, max_uses: 50, uses: 49 });

		await expect(service.validate({ eventId: TEST_EVENT_ID, code: 'JOVENS10', subtotal: 200 })).resolves.toMatchObject({
			discount: 20,
		});
	});

	it('looks the code up case-insensitively and without surrounding spaces', async () => {
		const { service, repository } = serviceWith(baseCoupon);

		await service.validate({ eventId: TEST_EVENT_ID, code: '  jovens10 ', subtotal: 200 });

		expect(repository.findActiveByCode).toHaveBeenCalledWith(TEST_EVENT_ID, 'JOVENS10');
	});
});

describe('CouponService.apply', () => {
	const items = [{ ticketId: 'ticket-a', quantity: 2 }];

	function serviceWithTickets(prices: Array<{ id: string; buyer_price: number | null; price: number }>) {
		const repository = partialMock<CouponRepository>({
			findActiveByCode: vi.fn().mockResolvedValue(baseCoupon),
			findTicketPrices: vi.fn().mockResolvedValue(prices),
		});

		return { service: new CouponService(repository), repository };
	}

	it('builds the subtotal from the prices stored for the event', async () => {
		const { service } = serviceWithTickets([{ id: 'ticket-a', buyer_price: 100, price: 90 }]);

		const result = await service.apply({ eventId: TEST_EVENT_ID, code: 'JOVENS10', items });

		expect(result.subtotal).toBe(200);
		expect(result.discount).toBe(20);
		expect(result.total).toBe(180);
	});

	it('charges the buyer price, which already carries the service fee', async () => {
		const { service } = serviceWithTickets([{ id: 'ticket-a', buyer_price: null, price: 90 }]);

		const result = await service.apply({ eventId: TEST_EVENT_ID, code: 'JOVENS10', items });

		expect(result.subtotal).toBe(180);
	});

	it('refuses an item that does not belong to the event, instead of pricing it as zero', async () => {
		const { service } = serviceWithTickets([]);

		await expect(service.apply({ eventId: TEST_EVENT_ID, code: 'JOVENS10', items })).rejects.toBeInstanceOf(
			TicketNotInEvent,
		);
	});

	it('asks the database only for the tickets the buyer picked', async () => {
		const { service, repository } = serviceWithTickets([{ id: 'ticket-a', buyer_price: 100, price: 90 }]);

		await service.apply({ eventId: TEST_EVENT_ID, code: 'JOVENS10', items });

		expect(repository.findTicketPrices).toHaveBeenCalledWith(TEST_EVENT_ID, ['ticket-a']);
	});
});

describe('CouponService, gestão pelo organizador', () => {
	function serviceOwning(owns: boolean, extra: Partial<Record<keyof CouponRepository, unknown>> = {}) {
		const repository = partialMock<CouponRepository>({
			ownsEvent: vi.fn().mockResolvedValue(owns),
			listByEvent: vi.fn().mockResolvedValue([baseCoupon]),
			createForEvent: vi.fn().mockResolvedValue(baseCoupon),
			updateForEvent: vi.fn().mockResolvedValue(baseCoupon),
			deleteForEvent: vi.fn().mockResolvedValue(true),
			...extra,
		});

		return { service: new CouponService(repository), repository };
	}

	it('lists the coupons of an event the person organizes', async () => {
		const { service } = serviceOwning(true);

		await expect(service.listForEvent(TEST_USER_ID, TEST_EVENT_ID)).resolves.toHaveLength(1);
	});

	it.each([
		['listForEvent', (service: CouponService) => service.listForEvent(TEST_USER_ID, TEST_EVENT_ID)],
		[
			'create',
			(service: CouponService) =>
				service.create(TEST_USER_ID, TEST_EVENT_ID, {
					code: 'X10',
					discount_type: 'percentage' as const,
					discount_value: 10,
				}),
		],
		['update', (service: CouponService) => service.update(TEST_USER_ID, TEST_EVENT_ID, 'c-1', { status: 'inactive' })],
		['remove', (service: CouponService) => service.remove(TEST_USER_ID, TEST_EVENT_ID, 'c-1')],
	])('refuses %s on an event the person does not organize', async (_name, call) => {
		const { service } = serviceOwning(false);

		await expect(call(service)).rejects.toBeInstanceOf(EventNotOwned);
	});

	it('never touches the coupons of an event the person does not organize', async () => {
		const { service, repository } = serviceOwning(false);

		await expect(service.listForEvent(TEST_USER_ID, TEST_EVENT_ID)).rejects.toBeInstanceOf(EventNotOwned);
		expect(repository.listByEvent).not.toHaveBeenCalled();
	});
});

describe('rotas de cupom', () => {
	const COUPON_ID = '00000000-0000-4000-8000-000000000100';

	const storedCoupon = {
		...baseCoupon,
		description: null,
		date_created: '2026-09-01T00:00:00.000Z',
		date_updated: '2026-09-01T00:00:00.000Z',
	};

	async function appWith(tables: Record<string, unknown>, user: { id: string; email: string } | null) {
		const { clients } = createSupabaseClientsStub({ tables: tables as never, user });

		return buildRouteTestApp(couponRoutes, { clients });
	}

	const ownedEvent = { data: { id: TEST_EVENT_ID } };
	const authenticated = { id: TEST_USER_ID, email: 'organizador@events.local' };

	describe('POST /api/events/:eventId/coupons/apply', () => {
		it('returns the discount computed from the stored prices', async () => {
			const app = await appWith(
				{
					event_tickets: { data: [{ id: 'ticket-a', buyer_price: 100, price: 90 }] },
					event_coupons: { data: storedCoupon },
				},
				null,
			);

			const response = await app.inject({
				method: 'POST',
				url: `/api/events/${TEST_EVENT_ID}/coupons/apply`,
				payload: { code: 'jovens10', items: [{ ticketId: 'ticket-a', quantity: 2 }] },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toMatchObject({ code: 'JOVENS10', discount: 20, subtotal: 200, total: 180 });
		});

		it('answers 404 for a code the event does not have', async () => {
			const app = await appWith(
				{
					event_tickets: { data: [{ id: 'ticket-a', buyer_price: 100, price: 90 }] },
					event_coupons: { data: null },
				},
				null,
			);

			const response = await app.inject({
				method: 'POST',
				url: `/api/events/${TEST_EVENT_ID}/coupons/apply`,
				payload: { code: 'NAOEXISTE', items: [{ ticketId: 'ticket-a', quantity: 1 }] },
			});

			expect(response.statusCode).toBe(404);
		});

		it('answers 422 for a cart that makes no sense', async () => {
			const app = await appWith({}, null);

			const response = await app.inject({
				method: 'POST',
				url: `/api/events/${TEST_EVENT_ID}/coupons/apply`,
				payload: { code: 'JOVENS10', items: [{ ticketId: 'ticket-a', quantity: 0 }] },
			});

			expect(response.statusCode).toBe(422);
		});

		it('answers 422 for an empty code instead of querying the database', async () => {
			const app = await appWith({}, null);

			const response = await app.inject({
				method: 'POST',
				url: `/api/events/${TEST_EVENT_ID}/coupons/apply`,
				payload: { code: '  ', items: [{ ticketId: 'ticket-a', quantity: 1 }] },
			});

			expect(response.statusCode).toBe(422);
		});
	});

	describe('gestão pelo organizador', () => {
		it('lists the coupons of an event the person organizes', async () => {
			const app = await appWith({ events: ownedEvent, event_coupons: { data: [storedCoupon] } }, authenticated);

			const response = await app.inject({
				method: 'GET',
				url: `/api/events/${TEST_EVENT_ID}/coupons`,
				headers: sessionCookie(),
			});

			expect(response.statusCode).toBe(200);
			expect(response.json().data).toHaveLength(1);
		});

		it('creates a coupon for an event the person organizes', async () => {
			const app = await appWith({ events: ownedEvent, event_coupons: { data: storedCoupon } }, authenticated);

			const response = await app.inject({
				method: 'POST',
				url: `/api/events/${TEST_EVENT_ID}/coupons`,
				headers: sessionCookie(),
				payload: { code: 'jovens10', discount_type: 'percentage', discount_value: 10 },
			});

			expect(response.statusCode).toBe(201);
		});

		it.each([
			['GET', `/api/events/${TEST_EVENT_ID}/coupons`, undefined],
			['POST', `/api/events/${TEST_EVENT_ID}/coupons`, { code: 'X10', discount_type: 'percentage', discount_value: 10 }],
			['PATCH', `/api/events/${TEST_EVENT_ID}/coupons/${COUPON_ID}`, { status: 'inactive' }],
			['DELETE', `/api/events/${TEST_EVENT_ID}/coupons/${COUPON_ID}`, undefined],
		])('answers 401 to %s without a session', async (method, url, payload) => {
			const app = await appWith({ events: ownedEvent }, null);

			const response = await app.inject({ method: method as 'GET', url, payload });

			expect(response.statusCode).toBe(401);
		});

		it.each([
			['GET', `/api/events/${TEST_EVENT_ID}/coupons`, undefined],
			['POST', `/api/events/${TEST_EVENT_ID}/coupons`, { code: 'X10', discount_type: 'percentage', discount_value: 10 }],
			['PATCH', `/api/events/${TEST_EVENT_ID}/coupons/${COUPON_ID}`, { status: 'inactive' }],
			['DELETE', `/api/events/${TEST_EVENT_ID}/coupons/${COUPON_ID}`, undefined],
		])('answers 403 to %s on an event of another organizer', async (method, url, payload) => {
			const app = await appWith({ events: { data: null }, event_coupons: { data: storedCoupon } }, authenticated);

			const response = await app.inject({ method: method as 'GET', url, payload, headers: sessionCookie() });

			expect(response.statusCode).toBe(403);
		});

		it('answers 422 to a percentage above one hundred', async () => {
			const app = await appWith({ events: ownedEvent }, authenticated);

			const response = await app.inject({
				method: 'POST',
				url: `/api/events/${TEST_EVENT_ID}/coupons`,
				headers: sessionCookie(),
				payload: { code: 'METADE', discount_type: 'percentage', discount_value: 150 },
			});

			expect(response.statusCode).toBe(422);
		});

		it('answers 404 when the coupon does not belong to the event', async () => {
			const app = await appWith({ events: ownedEvent, event_coupons: { data: null } }, authenticated);

			const response = await app.inject({
				method: 'DELETE',
				url: `/api/events/${TEST_EVENT_ID}/coupons/${COUPON_ID}`,
				headers: sessionCookie(),
			});

			expect(response.statusCode).toBe(404);
		});
	});
});
