/**
 * Entrega dos ingressos depois do pagamento.
 *
 * Quem comprou recebe um recibo com todos os ingressos do pedido. Cada
 * participante nomeado com e-mail diferente do de quem comprou recebe o seu
 * ingresso. As chaves de idempotência tornam a entrega segura para repetir:
 * webhook, reconciliação e consulta de status podem todos disparar, e cada
 * pessoa recebe uma mensagem só.
 */
import { describe, expect, it, vi } from 'vitest';
import {
	DeliverTickets,
	type DeliverableOrder,
	type TicketDeliveryRepository,
	type TicketMailer,
} from '../src/application/tickets/deliver-tickets.js';
import {
	EmailService,
	type EmailDeliveryRepository,
	type EmailGateway,
} from '../src/application/email/email-service.js';
import { partialMock } from './support/index.js';

const order: DeliverableOrder = {
	id: 'r-1',
	checkoutGroupId: 'group-1',
	buyerName: 'Ana',
	buyerEmail: 'Ana@events.local',
	paymentStatus: 'paid',
	receiptUrl: 'https://app.abacatepay.com/receipt/tran_1',
	event: {
		id: 'e-1',
		title: 'Congresso',
		slug: 'congresso',
		startDate: '2026-09-19T12:00:00.000Z',
		locationName: 'Ginásio',
	},
	tickets: [
		{
			id: 't-1',
			ticketCode: 'EVT-1',
			attendeeName: 'Ana',
			attendeeEmail: 'ana@events.local',
			isBuyer: true,
			ticketTypeTitle: 'Inteira',
		},
		{
			id: 't-2',
			ticketCode: 'EVT-2',
			attendeeName: 'Bia',
			attendeeEmail: 'bia@events.local',
			isBuyer: false,
			ticketTypeTitle: 'Inteira',
		},
		{
			id: 't-3',
			ticketCode: 'EVT-3',
			attendeeName: null,
			attendeeEmail: null,
			isBuyer: false,
			ticketTypeTitle: 'Meia',
		},
	],
};

function build(orders: DeliverableOrder[] = [order]) {
	const repository = partialMock<TicketDeliveryRepository>({
		findOrders: vi.fn().mockResolvedValue(orders),
	});
	const mailer = partialMock<TicketMailer>({
		sendPurchaseConfirmation: vi.fn().mockResolvedValue({ id: 'd-1' }),
		sendAttendeeTicket: vi.fn().mockResolvedValue({ id: 'd-2' }),
	});
	const logger = { error: vi.fn() };
	const useCase = new DeliverTickets(repository, mailer, logger);

	return { logger, mailer, repository, useCase };
}

describe('DeliverTickets', () => {
	it('sends the buyer one receipt per checkout with every ticket, pending ones included', async () => {
		const { mailer, useCase } = build();

		await useCase.execute(['r-1']);

		expect(mailer.sendPurchaseConfirmation).toHaveBeenCalledTimes(1);
		expect(mailer.sendPurchaseConfirmation).toHaveBeenCalledWith(
			expect.objectContaining({
				buyerEmail: 'Ana@events.local',
				tickets: expect.arrayContaining([expect.objectContaining({ ticketCode: 'EVT-3', attendeeName: null })]),
			}),
			'purchase-confirmation-group-1',
		);
	});

	it('sends each named attendee their own ticket, but not the buyer twice', async () => {
		const { mailer, useCase } = build();

		await useCase.execute(['r-1']);

		expect(mailer.sendAttendeeTicket).toHaveBeenCalledTimes(1);
		expect(mailer.sendAttendeeTicket).toHaveBeenCalledWith(
			expect.objectContaining({ attendeeEmail: 'bia@events.local', ticketCode: 'EVT-2', buyerName: 'Ana' }),
			'attendee-ticket-t-2-bia@events.local',
		);
	});

	it('groups the orders of one checkout into a single receipt', async () => {
		const second: DeliverableOrder = { ...order, id: 'r-2', tickets: [order.tickets[2]] };
		const { mailer, useCase } = build([order, second]);

		await useCase.execute(['r-1', 'r-2']);

		expect(mailer.sendPurchaseConfirmation).toHaveBeenCalledTimes(1);
		const [notice] = vi.mocked(mailer.sendPurchaseConfirmation).mock.calls[0];
		expect(notice.tickets).toHaveLength(4);
	});

	it('delivers nothing for an order that is not paid yet', async () => {
		const { mailer, useCase } = build([{ ...order, paymentStatus: 'pending' }]);

		await useCase.execute(['r-1']);

		expect(mailer.sendPurchaseConfirmation).not.toHaveBeenCalled();
		expect(mailer.sendAttendeeTicket).not.toHaveBeenCalled();
	});

	it('resends a single ticket under a fresh key when the organizer asks, skipping the receipt', async () => {
		const { mailer, useCase } = build();

		await useCase.execute(['r-1'], { keySuffix: 'req-7', onlyTicketId: 't-2' });

		expect(mailer.sendPurchaseConfirmation).not.toHaveBeenCalled();
		expect(mailer.sendAttendeeTicket).toHaveBeenCalledWith(
			expect.objectContaining({ ticketCode: 'EVT-2' }),
			'attendee-ticket-t-2-bia@events.local-req-7',
		);
	});

	it('resends the receipt when the chosen ticket belongs to the buyer', async () => {
		const { mailer, useCase } = build();

		await useCase.execute(['r-1'], { keySuffix: 'req-8', onlyTicketId: 't-1' });

		expect(mailer.sendPurchaseConfirmation).toHaveBeenCalledWith(expect.anything(), 'purchase-confirmation-group-1-req-8');
		expect(mailer.sendAttendeeTicket).not.toHaveBeenCalled();
	});

	it('keeps going and reports when one message fails, so a bad address never blocks the others', async () => {
		const { logger, mailer, useCase } = build();
		vi.mocked(mailer.sendPurchaseConfirmation).mockRejectedValue(new Error('smtp down'));

		const result = await useCase.execute(['r-1']);

		expect(result).toMatchObject({ confirmations: 0, attendeeTickets: 1, failed: 1 });
		expect(logger.error).toHaveBeenCalled();
	});
});

describe('EmailService: ingressos', () => {
	const stubBranding = {
		load: async () => ({
			accentColor: '#6644ff',
			logoUrl: null,
			siteName: 'Flouvi',
			siteUrl: 'https://events.example.com',
			supportEmail: null,
			tagline: null,
		}),
	};

	function mailer() {
		const deliveries = partialMock<EmailDeliveryRepository>({
			claim: vi.fn().mockResolvedValue({ id: 'delivery', attempts: 0, status: 'sending', shouldSend: true }),
			markSent: vi.fn().mockResolvedValue({ id: 'delivery', attempts: 1, status: 'sent', shouldSend: false }),
			markFailed: vi.fn(),
		});
		const gateway = partialMock<EmailGateway>({ send: vi.fn().mockResolvedValue({ messageId: 'provider-message' }) });

		return { deliveries, gateway, service: new EmailService(deliveries, gateway, 'events@example.com', stubBranding) };
	}

	it('lists every ticket of the purchase for the buyer and says which still need a name', async () => {
		const { deliveries, gateway, service } = mailer();

		await service.sendPurchaseConfirmation(
			{
				buyerName: 'Ana',
				buyerEmail: 'ana@events.local',
				eventTitle: 'Congresso <2026>',
				eventDate: '2026-09-19T12:00:00.000Z',
				receiptUrl: 'https://app.abacatepay.com/receipt/tran_1',
				tickets: order.tickets,
			},
			'purchase-confirmation-group-1',
		);

		expect(deliveries.claim).toHaveBeenCalledWith(expect.objectContaining({ template: 'purchase-confirmation' }));
		const message = vi.mocked(gateway.send).mock.calls[0][0];
		expect(message.to).toBe('ana@events.local');
		expect(message.subject).toContain('Congresso <2026>');
		expect(message.html).toContain('Congresso &lt;2026&gt;');
		expect(message.html).toContain('EVT-1');
		expect(message.html).toContain('EVT-2');
		expect(message.html).toContain('Bia');
		expect(message.html).toMatch(/EVT-3[\s\S]*participante a informar/i);
		expect(message.html).toContain('https://app.abacatepay.com/receipt/tran_1');
		expect(message.html).toContain('/perfil?section=ingressos');
	});

	it('hands a named attendee their ticket, saying who bought it', async () => {
		const { deliveries, gateway, service } = mailer();

		await service.sendAttendeeTicket(
			{
				attendeeName: 'Bia',
				attendeeEmail: 'bia@events.local',
				buyerName: 'Ana',
				eventTitle: 'Congresso',
				eventDate: '2026-09-19T12:00:00.000Z',
				locationName: 'Ginásio',
				ticketCode: 'EVT-2',
				ticketTypeTitle: 'Inteira',
			},
			'attendee-ticket-t-2-bia@events.local',
		);

		expect(deliveries.claim).toHaveBeenCalledWith(expect.objectContaining({ template: 'attendee-ticket' }));
		const message = vi.mocked(gateway.send).mock.calls[0][0];
		expect(message.to).toBe('bia@events.local');
		expect(message.subject).toContain('Congresso');
		expect(message.html).toContain('Olá, Bia');
		expect(message.html).toContain('Ana');
		expect(message.html).toContain('EVT-2');
		expect(message.html).toContain('Ginásio');
		expect(message.text).toContain('EVT-2');
	});
});
