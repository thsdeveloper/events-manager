/**
 * Área de ingressos da pessoa compradora, por unidade nominal.
 *
 * Quem comprou vê os ingressos do pedido e pode nomear os que ficaram
 * pendentes; quem foi nomeado com o e-mail da própria conta vê o ingresso,
 * mas não o edita. Nomear um ingresso já pago dispara o e-mail da pessoa.
 */
import { describe, expect, it, vi } from 'vitest';
import type { NominalTicket } from '@events-manager/contracts';
import { TicketService, type TicketRepository } from '../src/application/tickets/ticket-service.js';
import type { TicketDelivery } from '../src/application/tickets/deliver-tickets.js';
import { partialMock, TEST_USER_ID } from './support/index.js';

const OTHER_USER = '00000000-0000-4000-8000-000000000099';

function ticket(overrides: Partial<NominalTicket> = {}): NominalTicket {
	return {
		id: 't-1',
		sequence: 2,
		ticket_code: 'EVT-2',
		attendee_name: null,
		attendee_email: null,
		attendee_phone: null,
		attendee_document: null,
		is_buyer: false,
		named_at: null,
		unit_price: 100,
		service_fee: 10,
		discount: 0,
		total_amount: 110,
		check_in_date: null,
		date_created: '2026-09-17T12:00:00.000Z',
		date_updated: '2026-09-17T12:00:00.000Z',
		registration: {
			id: 'r-1',
			user_id: TEST_USER_ID,
			participant_name: 'Ana',
			participant_email: 'ana@events.local',
			participant_phone: null,
			participant_document: null,
			status: 'confirmed',
			payment_status: 'paid',
			payment_method: 'pix',
			total_amount: 220,
			quantity: 2,
			receipt_url: null,
			notes: null,
			date_created: '2026-09-17T12:00:00.000Z',
			cancelled_at: null,
			user: null,
		},
		event: {
			id: 'e-1',
			title: 'Congresso',
			slug: 'congresso',
			start_date: '2026-09-19T12:00:00.000Z',
			end_date: null,
			location_name: null,
			location_address: null,
			event_type: 'in_person',
			online_url: null,
			organizer_id: 'org-1',
			cover_image: null,
		},
		ticket_type: { id: 'tt-1', title: 'Inteira', price: 100, description: null },
		...overrides,
	};
}

function build(found: NominalTicket | null = ticket()) {
	const repository = partialMock<TicketRepository>({
		listForUser: vi
			.fn()
			.mockResolvedValue([
				ticket(),
				ticket({ id: 't-9', registration: { ...ticket().registration, user_id: OTHER_USER } }),
			]),
		findForBuyer: vi.fn().mockResolvedValue(found),
		updateAttendee: vi.fn(async (_id, patch) => ({ ...(found ?? ticket()), ...patch })),
	});
	const delivery = partialMock<TicketDelivery>({ execute: vi.fn().mockResolvedValue({}) });
	const service = new TicketService(repository, delivery, () => new Date('2026-09-18T10:00:00.000Z'));

	return { delivery, repository, service };
}

describe('TicketService.listForUser', () => {
	it('lets the buyer edit their own pending tickets, but not one bought by someone else', async () => {
		const { repository, service } = build();

		const tickets = await service.listForUser(TEST_USER_ID, 'ana@events.local');

		expect(repository.listForUser).toHaveBeenCalledWith(TEST_USER_ID, 'ana@events.local');
		expect(tickets[0].can_edit_attendee).toBe(true);
		expect(tickets[1].can_edit_attendee).toBe(false);
	});
});

describe('TicketService.nameAttendee', () => {
	const bia = { name: 'Bia', email: 'Bia@events.local' };

	it('names the ticket, stamps when, and sends the person her ticket because the order is paid', async () => {
		const { delivery, repository, service } = build();

		const updated = await service.nameAttendee(TEST_USER_ID, 't-1', bia);

		expect(repository.updateAttendee).toHaveBeenCalledWith('t-1', {
			attendee_name: 'Bia',
			attendee_email: 'Bia@events.local',
			attendee_phone: null,
			attendee_document: null,
			is_buyer: false,
			named_at: '2026-09-18T10:00:00.000Z',
		});
		expect(updated.attendee_name).toBe('Bia');
		expect(delivery.execute).toHaveBeenCalledWith(['r-1']);
	});

	it('recognizes the buyer naming herself, without e-mailing her twice', async () => {
		const { delivery, repository, service } = build();

		await service.nameAttendee(TEST_USER_ID, 't-1', { name: 'Ana Souza', email: 'ANA@events.local' });

		expect(repository.updateAttendee).toHaveBeenCalledWith('t-1', expect.objectContaining({ is_buyer: true }));
		expect(delivery.execute).toHaveBeenCalledWith(['r-1']);
	});

	it('holds the e-mail while the order is still unpaid', async () => {
		const { delivery, service } = build(
			ticket({ registration: { ...ticket().registration, status: 'pending', payment_status: 'pending' } }),
		);

		await service.nameAttendee(TEST_USER_ID, 't-1', bia);

		expect(delivery.execute).not.toHaveBeenCalled();
	});

	it('refuses when the ticket is not in one of the buyer’s orders', async () => {
		const { service } = build(null);

		await expect(service.nameAttendee(TEST_USER_ID, 't-1', bia)).rejects.toMatchObject({
			statusCode: 404,
			code: 'TICKET_NOT_FOUND',
		});
	});

	it('refuses to rename a ticket after check-in or after the order was cancelled', async () => {
		const checkedIn = build(ticket({ check_in_date: '2026-09-19T13:00:00.000Z' }));
		const cancelled = build(ticket({ registration: { ...ticket().registration, status: 'cancelled' } }));

		await expect(checkedIn.service.nameAttendee(TEST_USER_ID, 't-1', bia)).rejects.toMatchObject({
			statusCode: 409,
			code: 'TICKET_CHECKED_IN',
		});
		await expect(cancelled.service.nameAttendee(TEST_USER_ID, 't-1', bia)).rejects.toMatchObject({
			statusCode: 409,
			code: 'TICKET_CANCELLED',
		});
	});
});

describe('TicketService: access only after payment', () => {
	const onlineTicket = () =>
		ticket({
			attendee_name: 'Ana',
			attendee_email: 'ana@events.local',
			event: { ...ticket().event, online_url: 'https://example.test/transmissao' },
			registration: { ...ticket().registration, receipt_url: 'https://example.test/comprovante' },
		});
	it.each([
		{ status: 'pending', payment_status: 'pending' },
		{ status: 'confirmed', payment_status: 'pending' },
		{ status: 'cancelled', payment_status: 'paid' },
		{ status: 'confirmed', payment_status: 'refunded' },
	])('withholds online access and receipts for an unconfirmed or cancelled payment: %j', async (registration) => {
		const original = onlineTicket();
		const unpaid = { ...original, registration: { ...original.registration, ...registration } };
		const { service, repository } = build(unpaid);
		vi.mocked(repository.listForUser).mockResolvedValue([unpaid]);
		const [result] = await service.listForUser(TEST_USER_ID, 'ana@events.local');
		expect(result.registration.payment_status).toBe(registration.payment_status);
		expect(result.event.online_url).toBeNull();
		expect(result.registration.receipt_url).toBeNull();
	});
	it.each(['paid', 'free'])('preserves online access for a named %s ticket', async (payment_status) => {
		const original = onlineTicket();
		const { service, repository } = build();
		vi.mocked(repository.listForUser).mockResolvedValue([
			{ ...original, registration: { ...original.registration, payment_status } },
		]);
		const [result] = await service.listForUser(TEST_USER_ID, 'ana@events.local');
		expect(result.event.online_url).toBe(original.event.online_url);
	});
	it('naming a participant cannot release online access or a receipt for a pending payment', async () => {
		const original = onlineTicket();
		const { service, delivery } = build({
			...original,
			registration: { ...original.registration, status: 'pending', payment_status: 'pending' },
		});
		const result = await service.nameAttendee(TEST_USER_ID, original.id, { name: 'Bia', email: 'bia@events.local' });
		expect(result.attendee_name).toBe('Bia');
		expect(result.event.online_url).toBeNull();
		expect(result.registration.receipt_url).toBeNull();
		expect(delivery.execute).not.toHaveBeenCalled();
	});
});

it('locks the buyer’s own ticket while preserving purchase ownership', async () => {
	const own = ticket({ is_buyer: true });
	const { service, repository } = build(own);
	vi.mocked(repository.listForUser).mockResolvedValue([own]);
	expect((await service.listForUser(TEST_USER_ID, 'ana@events.local'))[0]).toMatchObject({
		can_edit_attendee: false,
		purchased_by_me: true,
	});
	await expect(
		service.nameAttendee(TEST_USER_ID, own.id, { name: 'Bia', email: 'bia@example.test' }),
	).rejects.toMatchObject({ code: 'BUYER_TICKET_LOCKED', statusCode: 409 });
	expect(repository.updateAttendee).not.toHaveBeenCalled();
});
it('groups all ticket types from the same purchase and loads only the buyer’s installments', async () => {
	const first = ticket({ registration: { ...ticket().registration, checkout_group_id: 'purchase-1' } });
	const second = ticket({
		id: 't-2',
		registration: { ...ticket().registration, id: 'r-2', checkout_group_id: 'purchase-1' },
	});
	const { service, repository } = build();
	vi.mocked(repository.listForUser).mockResolvedValue([first, second, ticket({ id: 'other' })]);
	Object.assign(repository, { listInstallments: vi.fn().mockResolvedValue([{ id: 'i-1', status: 'paid' }]) });
	const purchase = await service.purchaseDetails(TEST_USER_ID, 'ana@events.local', 'purchase-1');
	expect(purchase.tickets.map((item) => item.id)).toEqual(['t-1', 't-2']);
	expect(purchase.installments).toEqual([{ id: 'i-1', status: 'paid' }]);
	expect(repository.listInstallments).toHaveBeenCalledWith(['r-1', 'r-2'], TEST_USER_ID);
});
it('never loads purchaser payments for a recipient, and hides unknown purchases', async () => {
	const gift = ticket({ registration: { ...ticket().registration, user_id: OTHER_USER } });
	const { service, repository } = build();
	vi.mocked(repository.listForUser).mockResolvedValue([gift]);
	Object.assign(repository, { listInstallments: vi.fn() });
	expect((await service.purchaseDetails(TEST_USER_ID, 'ana@events.local', 'r-1')).installments).toEqual([]);
	expect(repository.listInstallments).not.toHaveBeenCalled();
	await expect(service.purchaseDetails(TEST_USER_ID, 'ana@events.local', 'missing')).rejects.toMatchObject({
		statusCode: 404,
	});
});
