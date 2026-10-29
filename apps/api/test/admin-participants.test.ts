/**
 * Painel do organizador por ingresso nominal.
 *
 * Cada linha da lista de participantes é uma unidade: quem vai, quem comprou,
 * o pagamento do pedido e o check-in daquela pessoa. Cancelamento continua
 * sendo do pedido inteiro, então o serviço resolve o pedido a partir do
 * ingresso escolhido.
 */
import { describe, expect, it, vi } from 'vitest';
import type { NominalTicket } from '@events-manager/contracts';
import { AdminService, type AdminRepository } from '../src/application/admin/admin-service.js';
import type { TicketDelivery } from '../src/application/tickets/deliver-tickets.js';
import { partialMock } from './support/index.js';

function ticket(overrides: Partial<NominalTicket> = {}): NominalTicket {
	return {
		id: 't-1',
		sequence: 1,
		ticket_code: 'EVT-1',
		attendee_name: 'Bia',
		attendee_email: 'bia@events.local',
		attendee_phone: null,
		attendee_document: null,
		is_buyer: false,
		named_at: '2026-09-17T12:00:00.000Z',
		unit_price: 100,
		service_fee: 0,
		discount: 0,
		total_amount: 100,
		check_in_date: null,
		date_created: '2026-09-17T12:00:00.000Z',
		date_updated: '2026-09-17T12:00:00.000Z',
		registration: {
			id: 'r-1',
			user_id: 'u-1',
			participant_name: 'Ana',
			participant_email: 'ana@events.local',
			participant_phone: null,
			participant_document: null,
			status: 'confirmed',
			payment_status: 'paid',
			payment_method: 'pix',
			total_amount: 200,
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

const query = {
	page: 1,
	limit: 25,
	search: '',
	sortField: 'date_created',
	sortDirection: 'desc' as const,
};

function build(found: NominalTicket | null = ticket()) {
	const repository = partialMock<AdminRepository>({
		listOwnedEventIds: vi.fn().mockResolvedValue(['e-1']),
		listParticipantTickets: vi.fn().mockResolvedValue({
			data: [ticket()],
			total: 1,
			metricRows: [
				{ check_in_date: '2026-09-19T13:00:00.000Z', registration_status: 'confirmed' },
				{ check_in_date: null, registration_status: 'pending' },
			],
		}),
		findOwnedTicket: vi.fn().mockResolvedValue(found),
		findOwnedRegistration: vi.fn().mockResolvedValue({ id: 'r-1', payment_status: 'paid' }),
		updateRegistrationTicket: vi.fn(async (_id, input) => ({ ...ticket(), ...input })),
		updateRegistration: vi.fn().mockResolvedValue({ id: 'r-1' }),
		cancelRegistration: vi.fn().mockResolvedValue({ id: 'r-1', status: 'cancelled' }),
	});
	const delivery = partialMock<TicketDelivery>({ execute: vi.fn().mockResolvedValue({}) });
	const service = new AdminService(repository, undefined, () => new Date('2026-09-19T13:00:00.000Z'), delivery);

	return { delivery, repository, service };
}

describe('AdminService: participantes por ingresso', () => {
	it('lists tickets, counting check-ins per ticket and pending orders', async () => {
		const { repository, service } = build();

		const result = await service.listParticipants('org-1', query);

		expect(repository.listParticipantTickets).toHaveBeenCalledWith(['e-1'], query);
		expect(result.data).toEqual([expect.objectContaining({ id: 't-1' })]);
		expect(result.metrics).toEqual({ total: 2, checkedIn: 1, pending: 1, checkInRate: 50 });
	});

	it('checks in one ticket, not the whole order', async () => {
		const { repository, service } = build();

		await service.checkIn('org-1', 't-1');

		expect(repository.updateRegistrationTicket).toHaveBeenCalledWith('t-1', {
			check_in_date: '2026-09-19T13:00:00.000Z',
		});
		expect(repository.updateRegistration).not.toHaveBeenCalled();
	});

	it('refuses check-in for a ticket nobody was named on, and for an unpaid order', async () => {
		const unnamed = build(ticket({ attendee_name: null, attendee_email: null }));
		const unpaid = build(
			ticket({ registration: { ...ticket().registration, status: 'pending', payment_status: 'pending' } }),
		);

		await expect(unnamed.service.checkIn('org-1', 't-1')).rejects.toMatchObject({
			statusCode: 409,
			code: 'TICKET_UNNAMED',
		});
		await expect(unpaid.service.checkIn('org-1', 't-1')).rejects.toMatchObject({
			statusCode: 409,
			code: 'TICKET_NOT_CONFIRMED',
		});
	});

	it('edits the attendee of one ticket and keeps the notes on the order', async () => {
		const { repository, service } = build();

		await service.editParticipant('org-1', 't-1', {
			participant_name: 'Ana',
			participant_email: 'ANA@events.local',
			participant_phone: '11999999999',
			notes: 'VIP',
		});

		expect(repository.updateRegistrationTicket).toHaveBeenCalledWith(
			't-1',
			expect.objectContaining({
				attendee_name: 'Ana',
				attendee_email: 'ANA@events.local',
				attendee_phone: '11999999999',
				is_buyer: true,
				named_at: '2026-09-19T13:00:00.000Z',
			}),
		);
		expect(repository.updateRegistration).toHaveBeenCalledWith('r-1', { notes: 'VIP' });
	});

	it('refuses to change a ticket after check-in: undo the check-in first', async () => {
		const { repository, service } = build(ticket({ check_in_date: '2026-09-19T13:00:00.000Z' }));

		await expect(
			service.editParticipant('org-1', 't-1', { participant_name: 'Outra', participant_email: 'outra@events.local' }),
		).rejects.toMatchObject({ statusCode: 409, code: 'TICKET_CHECKED_IN' });
		expect(repository.updateRegistrationTicket).not.toHaveBeenCalled();
		expect(repository.updateRegistration).not.toHaveBeenCalled();
	});

	it('cancels the order a ticket belongs to', async () => {
		const { repository, service } = build();

		await service.cancelParticipant('org-1', 't-1', 'Solicitação do comprador');

		expect(repository.cancelRegistration).toHaveBeenCalledWith('org-1', 'r-1', 'Solicitação do comprador');
	});

	it('answers 404 for a ticket outside the organizer’s events', async () => {
		const { service } = build(null);

		await expect(service.checkIn('org-1', 't-1')).rejects.toMatchObject({ statusCode: 404 });
	});

	it('resends one ticket with a fresh idempotency key, so a real resend goes out', async () => {
		const { delivery, service } = build();

		await service.resendTicket('org-1', 't-1', 'req-7');

		expect(delivery.execute).toHaveBeenCalledWith(['r-1'], { keySuffix: 'req-7', onlyTicketId: 't-1' });
	});

	it('exports one line per ticket, with the buyer beside the attendee', async () => {
		const { service } = build();

		const csv = await service.exportParticipants('org-1');
		const [header, line] = csv.replace('﻿', '').split('\n');

		expect(header).toBe('Participante,Email,Telefone,Comprador,Evento,Ingresso,Código,Status,Pagamento,Check-in');
		expect(line).toContain('"Bia","bia@events.local"');
		expect(line).toContain('"Ana"');
		expect(line).toContain('"EVT-1"');
	});
});
