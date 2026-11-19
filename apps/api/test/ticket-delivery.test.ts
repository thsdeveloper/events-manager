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
	type AttendeeTicketNotice,
	type PurchaseConfirmationNotice,
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

		expect(mailer.sendPurchaseConfirmation).toHaveBeenCalledWith(
			expect.anything(),
			'purchase-confirmation-group-1-req-8',
		);
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
		const pdf = {
			render: vi.fn(
				async (notice: AttendeeTicketNotice) => new Uint8Array(Buffer.from(`%PDF-1.7\n${notice.ticketCode}\n%%EOF`)),
			),
		};

		return {
			deliveries,
			gateway,
			pdf,
			service: new EmailService(deliveries, gateway, 'events@example.com', stubBranding, pdf),
		};
	}

	const attendeeNotice: AttendeeTicketNotice = {
		attendeeName: 'Bia',
		attendeeEmail: 'bia@events.local',
		buyerName: 'Ana',
		eventTitle: 'Congresso',
		eventDate: '2026-09-19T12:00:00.000Z',
		locationName: 'Ginásio',
		ticketCode: 'EVT-2',
		ticketTypeTitle: 'Inteira',
	};

	const purchaseNotice: PurchaseConfirmationNotice = {
		buyerName: order.buyerName,
		buyerEmail: order.buyerEmail,
		eventTitle: order.event.title,
		eventDate: order.event.startDate,
		locationName: order.event.locationName,
		receiptUrl: order.receiptUrl,
		tickets: order.tickets,
	};

	it('attaches the buyer ticket to a single-ticket purchase confirmation, with the participant and event location', async () => {
		const { gateway, pdf, service } = mailer();
		await service.sendPurchaseConfirmation({ ...purchaseNotice, tickets: [order.tickets[0]] }, 'purchase-single');
		const message = vi.mocked(gateway.send).mock.calls[0][0];
		expect(message.to).toBe(order.buyerEmail);
		expect(message.attachments).toEqual([
			{
				filename: 'ingresso-EVT-1.pdf',
				contentType: 'application/pdf',
				content: new Uint8Array(Buffer.from('%PDF-1.7\nEVT-1\n%%EOF')),
			},
		]);
		expect(pdf.render).toHaveBeenCalledWith({
			attendeeName: 'Ana',
			attendeeEmail: 'ana@events.local',
			buyerName: 'Ana',
			eventTitle: 'Congresso',
			eventDate: order.event.startDate,
			locationName: 'Ginásio',
			ticketCode: 'EVT-1',
			ticketTypeTitle: 'Inteira',
		});
		expect(message.html).toContain('PDF em anexo');
		expect(message.text).toContain('PDF em anexo');
	});

	it('includes one distinct PDF per named ticket in the purchase, excluding tickets waiting for a participant', async () => {
		const { gateway, pdf, service } = mailer();
		await service.sendPurchaseConfirmation(purchaseNotice, 'purchase-multiple');
		const message = vi.mocked(gateway.send).mock.calls[0][0];
		expect(message.attachments?.map((file) => file.filename)).toEqual(['ingresso-EVT-1.pdf', 'ingresso-EVT-2.pdf']);
		expect(message.attachments?.map((file) => Buffer.from(file.content).toString())).toEqual([
			'%PDF-1.7\nEVT-1\n%%EOF',
			'%PDF-1.7\nEVT-2\n%%EOF',
		]);
		expect(pdf.render).toHaveBeenCalledTimes(2);
		expect(pdf.render).toHaveBeenCalledWith(
			expect.objectContaining({ attendeeName: 'Bia', attendeeEmail: 'bia@events.local', ticketCode: 'EVT-2' }),
		);
		expect(message.text).toContain('PDFs em anexo');
		expect(message.text).toContain('Um ingresso ainda não tem participante');
	});

	it('does not generate entry PDFs or announce attachments while all participants are incomplete', async () => {
		const { gateway, pdf, service } = mailer();
		await service.sendPurchaseConfirmation(
			{ ...purchaseNotice, tickets: [order.tickets[2], { ...order.tickets[1], attendeeEmail: null }] },
			'purchase-pending-names',
		);
		expect(pdf.render).not.toHaveBeenCalled();
		const message = vi.mocked(gateway.send).mock.calls[0][0];
		expect(message.attachments ?? []).toHaveLength(0);
		expect(message.text).not.toContain('em anexo');
		expect(message.text).toContain('2 ingressos ainda não têm participante');
	});

	it('skips PDF generation and delivery when the purchase confirmation was already sent', async () => {
		const { deliveries, gateway, pdf, service } = mailer();
		vi.mocked(deliveries.claim).mockResolvedValue({ id: 'delivery', attempts: 1, status: 'sent', shouldSend: false });
		await service.sendPurchaseConfirmation(purchaseNotice, 'purchase-existing');
		expect(pdf.render).not.toHaveBeenCalled();
		expect(gateway.send).not.toHaveBeenCalled();
	});

	it('retries the complete set of attachments if any purchase PDF fails, without sending an incomplete email', async () => {
		const { deliveries, gateway, pdf, service } = mailer();
		pdf.render.mockResolvedValueOnce(new Uint8Array([1])).mockRejectedValueOnce(new Error('Second PDF failed'));
		await expect(service.sendPurchaseConfirmation(purchaseNotice, 'purchase-retry')).rejects.toThrow(
			'Second PDF failed',
		);
		expect(gateway.send).not.toHaveBeenCalled();
		expect(deliveries.markSent).not.toHaveBeenCalled();
		expect(deliveries.markFailed).toHaveBeenCalledWith('delivery', 1, 'Second PDF failed');
		vi.mocked(deliveries.claim).mockResolvedValue({ id: 'delivery', attempts: 1, status: 'failed', shouldSend: true });
		await service.sendPurchaseConfirmation(purchaseNotice, 'purchase-retry');
		expect(vi.mocked(gateway.send).mock.calls[0][0].attachments).toHaveLength(2);
		expect(deliveries.markSent).toHaveBeenCalledWith('delivery', 2, 'provider-message');
	});

	it.each(['paid', 'free'])(
		'includes purchase PDFs when the organizer resends a buyer ticket from a %s order',
		async (paymentStatus) => {
			const { deliveries, gateway, pdf, service } = mailer();
			const delivery = new DeliverTickets({ findOrders: async () => [{ ...order, paymentStatus }] }, service);
			await delivery.execute([order.id], { onlyTicketId: order.tickets[0].id, keySuffix: 'resend-1' });
			expect(deliveries.claim).toHaveBeenCalledWith(
				expect.objectContaining({ idempotencyKey: 'purchase-confirmation-group-1-resend-1' }),
			);
			expect(pdf.render).toHaveBeenCalledWith(
				expect.objectContaining({ locationName: 'Ginásio', ticketCode: 'EVT-1' }),
			);
			expect(vi.mocked(gateway.send).mock.calls[0][0].attachments).toHaveLength(2);
		},
	);

	it('attaches the recipient’s own PDF to the attendee email and mentions the attachment', async () => {
		const { gateway, pdf, service } = mailer();
		await service.sendAttendeeTicket(attendeeNotice, 'attendee-pdf');
		const message = vi.mocked(gateway.send).mock.calls[0][0];
		expect(pdf.render).toHaveBeenCalledWith(attendeeNotice);
		expect(message.attachments).toEqual([
			{
				filename: 'ingresso-EVT-2.pdf',
				contentType: 'application/pdf',
				content: await pdf.render.mock.results[0].value,
			},
		]);
		expect(message.html).toContain('PDF em anexo');
		expect(message.text).toContain('PDF em anexo');
	});

	it('does not generate or resend a PDF for an already claimed delivery', async () => {
		const { deliveries, gateway, pdf, service } = mailer();
		vi.mocked(deliveries.claim).mockResolvedValue({ id: 'delivery', attempts: 1, status: 'sent', shouldSend: false });
		await service.sendAttendeeTicket(attendeeNotice, 'attendee-pdf');
		expect(pdf.render).not.toHaveBeenCalled();
		expect(gateway.send).not.toHaveBeenCalled();
	});

	it('marks PDF failures as failed without sending an incomplete email, and attaches the PDF on retry', async () => {
		const { deliveries, gateway, pdf, service } = mailer();
		pdf.render.mockRejectedValueOnce(new Error('PDF unavailable'));
		await expect(service.sendAttendeeTicket(attendeeNotice, 'attendee-pdf')).rejects.toThrow('PDF unavailable');
		expect(deliveries.markFailed).toHaveBeenCalledWith('delivery', 1, 'PDF unavailable');
		expect(deliveries.markSent).not.toHaveBeenCalled();
		expect(gateway.send).not.toHaveBeenCalled();
		vi.mocked(deliveries.claim).mockResolvedValue({ id: 'delivery', attempts: 1, status: 'failed', shouldSend: true });
		await service.sendAttendeeTicket(attendeeNotice, 'attendee-pdf');
		expect(gateway.send).toHaveBeenCalledWith(
			expect.objectContaining({ attachments: [expect.objectContaining({ contentType: 'application/pdf' })] }),
		);
		expect(deliveries.markSent).toHaveBeenCalledWith('delivery', 2, 'provider-message');
	});

	it('keeps the attachment available on a fresh organizer resend and records SMTP failures', async () => {
		const { deliveries, gateway, pdf, service } = mailer();
		vi.mocked(gateway.send).mockRejectedValueOnce(new Error('SMTP unavailable'));
		await expect(service.sendAttendeeTicket(attendeeNotice, 'attendee-pdf-resend')).rejects.toThrow('SMTP unavailable');
		expect(pdf.render).toHaveBeenCalledWith(attendeeNotice);
		expect(deliveries.markFailed).toHaveBeenCalledWith('delivery', 1, 'SMTP unavailable');
		expect(deliveries.markSent).not.toHaveBeenCalled();
	});

	it('lists every ticket of the purchase for the buyer and says which still need a name', async () => {
		const { deliveries, gateway, service } = mailer();

		await service.sendPurchaseConfirmation(
			{
				buyerName: 'Ana',
				buyerEmail: 'ana@events.local',
				eventTitle: 'Congresso <2026>',
				eventDate: '2026-09-19T12:00:00.000Z',
				locationName: 'Ginásio',
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

it('delivers Pix tickets only when the reconciliation of the last installment makes the order paid', async () => {
	const { ReconcileInstallmentCharges } = await import('../src/application/payments/reconcile-installment-charges.js');
	const { MockPaymentGateway } = await import('../src/infrastructure/payments/mock-payment-gateway.js');
	const delivery = build([{ ...order, paymentStatus: 'pending' }]);
	const reconciliation = new ReconcileInstallmentCharges(
		new MockPaymentGateway(),
		{
			claimPending: vi.fn().mockResolvedValue([{ chargeId: 'pix1', installmentId: 'i1', registrationId: 'r-1' }]),
			settlePaid: vi.fn(),
			cancel: vi.fn(),
		},
		delivery.useCase,
	);
	await reconciliation.execute({ before: new Date('2026-11-19'), batchSize: 10 });
	expect(delivery.mailer.sendPurchaseConfirmation).not.toHaveBeenCalled();
	vi.mocked(delivery.repository.findOrders).mockResolvedValue([order]);
	await reconciliation.execute({ before: new Date('2026-11-19'), batchSize: 10 });
	expect(delivery.mailer.sendPurchaseConfirmation).toHaveBeenCalledTimes(1);
});
