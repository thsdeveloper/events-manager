import { describe, expect, it, vi } from 'vitest';
import { AdminService, type AdminRepository } from '../src/application/admin/admin-service.js';
import { AuthService, type AuthRepository } from '../src/application/auth/auth-service.js';
import {
	EmailService,
	type EmailDeliveryRepository,
	type EmailGateway,
} from '../src/application/email/email-service.js';
import {
	EventCoverService,
	type CoverImageGenerator,
	type EventCategoryReader,
} from '../src/application/external/external-service.js';
import { FinanceService, type FinanceRepository } from '../src/application/finance/finance-service.js';
import { LocationService, type LocationRepository } from '../src/application/locations/location-service.js';
import { CheckHealth } from '../src/application/health/check-health.js';
import type { MediaService } from '../src/application/media/media-service.js';
import { PaymentService, type PaymentRepository } from '../src/application/payments/payment-service.js';
import type { GetCheckoutStatus } from '../src/application/payments/get-checkout-status.js';
import type { ManageTicketInventory } from '../src/application/payments/manage-ticket-inventory.js';
import type { PaymentGateway } from '../src/application/payments/payment-gateway.js';
import type { EnforceRateLimit } from '../src/application/security/rate-limit.js';
import { UserService, type UserRepository } from '../src/application/users/user-service.js';
import { ApiError } from '../src/shared/errors.js';

function partialMock<T>(value: Partial<Record<keyof T, unknown>>) {
	return value as T;
}

describe('AdminService', () => {
	it('intersects requested event IDs with organizer ownership before querying tickets', async () => {
		const repository = partialMock<AdminRepository>({
			listOwnedEventIds: vi.fn().mockResolvedValue(['owned-event']),
			listTickets: vi.fn().mockResolvedValue({ data: [{ id: 'ticket' }], total: 1 }),
		});
		const service = new AdminService(repository);

		await service.listTickets('organizer', {
			eventIds: 'owned-event,foreign-event',
			page: 1,
			search: '',
		});

		expect(repository.listTickets).toHaveBeenCalledWith(
			['owned-event'],
			expect.objectContaining({ eventIds: 'owned-event,foreign-event' }),
		);
	});

	it('delegates cancellation to the atomic organizer-scoped repository operation', async () => {
		const repository = partialMock<AdminRepository>({
			cancelRegistration: vi.fn().mockResolvedValue({ id: 'registration', status: 'cancelled' }),
		});

		await expect(
			new AdminService(repository).cancelParticipant('organizer', 'registration', 'Solicitação'),
		).resolves.toMatchObject({
			success: true,
		});
		expect(repository.cancelRegistration).toHaveBeenCalledWith('organizer', 'registration', 'Solicitação');
	});
});

describe('LocationService', () => {
	const states = [{ id: 31, uf: 'MG', name: 'Minas Gerais' }];

	it('reads each reference list once and serves the rest from memory', async () => {
		const repository = partialMock<LocationRepository>({
			listStates: vi.fn().mockResolvedValue(states),
			listCitiesByState: vi.fn().mockResolvedValue([{ id: 3170206, state_id: 31, name: 'Uberlândia' }]),
		});
		const service = new LocationService(repository);

		// Concurrent first calls must share one query, not race into two.
		await Promise.all([service.listStates(), service.listStates()]);
		await service.listCitiesByState(31);
		await service.listCitiesByState(31);

		expect(repository.listStates).toHaveBeenCalledTimes(1);
		expect(repository.listCitiesByState).toHaveBeenCalledTimes(1);
	});

	it('rejects a state code that does not exist instead of returning an empty list', async () => {
		const repository = partialMock<LocationRepository>({
			listStates: vi.fn().mockResolvedValue(states),
			listCitiesByState: vi.fn(),
		});

		await expect(new LocationService(repository).listCitiesByState(99)).rejects.toMatchObject({
			statusCode: 404,
			code: 'STATE_NOT_FOUND',
		});
		expect(repository.listCitiesByState).not.toHaveBeenCalled();
	});

	it('retries after a failure instead of caching the error forever', async () => {
		const listStates = vi
			.fn()
			.mockRejectedValueOnce(new Error('provider down'))
			.mockResolvedValue(states);
		const service = new LocationService(partialMock<LocationRepository>({ listStates }));

		await expect(service.listStates()).rejects.toThrow('provider down');
		await expect(service.listStates()).resolves.toEqual(states);
		expect(listStates).toHaveBeenCalledTimes(2);
	});
});

describe('AuthService', () => {
	it('rejects missing and expired sessions with stable domain errors', async () => {
		const repository = partialMock<AuthRepository>({ getIdentity: vi.fn().mockResolvedValue(null) });
		const service = new AuthService(repository);

		await expect(service.authenticate(null)).rejects.toMatchObject({ statusCode: 401, code: 'UNAUTHORIZED' });
		await expect(service.authenticate('expired')).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_SESSION' });
	});

	it('requires an active organizer returned by the authorization port', async () => {
		const repository = partialMock<AuthRepository>({ findActiveOrganizer: vi.fn().mockResolvedValue(null) });
		await expect(new AuthService(repository).requireOrganizer('user')).rejects.toMatchObject({
			statusCode: 403,
			code: 'ORGANIZER_REQUIRED',
		});
	});
});

describe('EmailService', () => {
	// The template needs branding; the values are irrelevant to these assertions.
	const stubBranding = {
		load: async () => ({
			accentColor: '#6644ff',
			logoUrl: null,
			siteName: 'Events Manager',
			siteUrl: 'https://events.example.com',
			supportEmail: null,
			tagline: null,
		}),
	};

	const registration = {
		id: 'registration',
		participant_email: 'ana@example.com',
		participant_name: '<Ana & Silva>',
		ticket_code: 'EVT-123',
		event_id: { title: 'Evento <Especial>' },
	};

	it('does not send again when another worker already claimed the idempotency key', async () => {
		const deliveries = partialMock<EmailDeliveryRepository>({
			claim: vi.fn().mockResolvedValue({ id: 'delivery', attempts: 1, status: 'sent', shouldSend: false }),
		});
		const gateway = partialMock<EmailGateway>({ send: vi.fn() });

		await new EmailService(deliveries, gateway, 'events@example.com', stubBranding).sendRegistrationConfirmation(registration, 'key');
		expect(gateway.send).not.toHaveBeenCalled();
	});

	it('escapes user-controlled HTML and marks the claimed delivery as sent', async () => {
		const deliveries = partialMock<EmailDeliveryRepository>({
			claim: vi.fn().mockResolvedValue({ id: 'delivery', attempts: 0, status: 'sending', shouldSend: true }),
			markSent: vi.fn().mockResolvedValue({ id: 'delivery', attempts: 1, status: 'sent', shouldSend: false }),
			markFailed: vi.fn(),
		});
		const gateway = partialMock<EmailGateway>({ send: vi.fn().mockResolvedValue({ messageId: 'provider-message' }) });

		await new EmailService(deliveries, gateway, 'events@example.com', stubBranding).sendRegistrationConfirmation(registration, 'key');
		const html = vi.mocked(gateway.send).mock.calls[0][0].html;
		expect(html).toContain('&lt;Ana &amp; Silva&gt;');
		expect(html).not.toContain('<Ana & Silva>');
		expect(deliveries.markSent).toHaveBeenCalledWith('delivery', 1, 'provider-message');
	});
});

describe('FinanceService', () => {
	it('calculates paid metrics without charging buyer-paid platform fees twice', async () => {
		const repository = partialMock<FinanceRepository>({
			listRegistrations: vi.fn().mockResolvedValue([
				{
					id: 'registration',
					date_created: '2026-08-01T12:00:00.000Z',
					payment_status: 'paid',
					payment_amount: 100,
					total_amount: 105,
					platform_fee: 5,
					provider_fee: 1,
					quantity: 2,
				},
			]),
		});

		const result = await new FinanceService(repository, 'abacatepay').overview('organizer', {});
		expect(result.metrics).toMatchObject({ gross: 105, serviceFees: 6, net: 99, ticketsSold: 2 });
	});

	it('escapes CSV fields that contain quotes', async () => {
		const repository = partialMock<FinanceRepository>({
			listRegistrations: vi
				.fn()
				.mockResolvedValue([
					{ id: 'registration', participant_name: 'Ana "Silva"', event_id: { id: 'event', title: 'Evento' } },
				]),
		});
		await expect(new FinanceService(repository, 'mock').exportCsv('organizer')).resolves.toContain('Ana ""Silva""');
	});
});

describe('UserService', () => {
	it('marks past pending installments as overdue and selects the next payment', async () => {
		const repository = partialMock<UserRepository>({
			listPendingInstallmentRegistrations: vi.fn().mockResolvedValue([
				{
					id: 'registration',
					installments: [
						{ installment_number: 2, due_date: '2026-09-01T00:00:00.000Z', status: 'pending' },
						{ installment_number: 1, due_date: '2026-07-01T00:00:00.000Z', status: 'pending' },
					],
				},
			]),
		});
		const result = await new UserService(repository, () => Date.parse('2026-08-06T00:00:00.000Z')).listPendingPayments(
			'user',
		);

		expect(result.data[0]).toMatchObject({
			installment_stats: { total: 2, overdue: 1, pending: 1 },
			next_installment: { installment_number: 1, status: 'overdue' },
		});
	});
});

describe('external and health services', () => {
	it('builds a categorized cover prompt and stores the generated image through media', async () => {
		const categories = partialMock<EventCategoryReader>({
			findById: vi.fn().mockResolvedValue({ name: 'Tecnologia', description: 'Produtos digitais' }),
		});
		const generator = partialMock<CoverImageGenerator>({ generate: vi.fn().mockResolvedValue(Buffer.from('png')) });
		const media = {
			upload: vi.fn().mockResolvedValue({ file: { id: 'media' }, url: 'https://media' }),
		} as unknown as MediaService;
		const result = await new EventCoverService(categories, generator, media).generate({
			categoryId: 'category',
			title: 'Conferência',
			userId: 'user',
		});

		expect(result).toMatchObject({ fileId: 'media', assetUrl: 'https://media' });
		expect(generator.generate).toHaveBeenCalledWith(expect.stringContaining('Theme: Tecnologia'));
	});

	it('reports a degraded health state without leaking infrastructure errors', async () => {
		await expect(new CheckHealth({ isDatabaseAvailable: vi.fn().mockResolvedValue(false) }).execute()).resolves.toEqual(
			{
				status: 'degraded',
				database: 'unavailable',
			},
		);
	});
});

describe('PaymentService webhook routing', () => {
	function service(repository: PaymentRepository) {
		return new PaymentService(
			repository,
			{ provider: 'abacatepay' } as PaymentGateway,
			{} as ManageTicketInventory,
			{} as GetCheckoutStatus,
			{} as EnforceRateLimit,
			'https://events.example.com',
			() => new Date('2026-08-06T12:00:00.000Z'),
		);
	}

	it('accepts payout webhook movements delivered directly in data', async () => {
		const repository = partialMock<PaymentRepository>({ updatePayoutForWebhook: vi.fn().mockResolvedValue(undefined) });

		await service(repository).processWebhook({
			event: 'payout.completed',
			data: { id: 'provider-payout', externalId: 'local-payout', receiptUrl: 'https://receipt.example.com' },
		});

		expect(repository.updatePayoutForWebhook).toHaveBeenCalledWith(
			'provider-payout',
			'local-payout',
			expect.objectContaining({ status: 'completed', processed_at: '2026-08-06T12:00:00.000Z' }),
		);
	});

	it('ignores unrelated signed provider events safely', async () => {
		await expect(
			service(partialMock<PaymentRepository>({})).processWebhook({ event: 'customer.updated' }),
		).resolves.toEqual({
			received: true,
		});
	});

	it('delegates a completed installment to one atomic settlement operation', async () => {
		const repository = partialMock<PaymentRepository>({
			findInstallmentForWebhook: vi.fn().mockResolvedValue({
				id: 'installment',
				amount: 52.5,
				registration_id: { id: 'registration' },
			}),
			settleInstallmentWebhook: vi.fn().mockResolvedValue(undefined),
		});
		const payload = {
			event: 'transparent.completed',
			data: { transparent: { id: 'provider-charge', externalId: 'installment', platformFee: 125 } },
		};

		await expect(service(repository).processWebhook(payload)).resolves.toEqual({ received: true });
		expect(repository.settleInstallmentWebhook).toHaveBeenCalledWith({
			chargeId: 'provider-charge',
			installmentId: 'installment',
			metadata: payload,
			providerFee: 1.25,
			registrationId: 'registration',
		});
		expect(repository.recordTransaction).toBeUndefined();
	});
});

describe('ApiError shape', () => {
	it('retains machine-readable status and code in application failures', () => {
		const error = new ApiError('Falha', 409, 'CONFLICT');
		expect(error).toMatchObject({ statusCode: 409, code: 'CONFLICT' });
	});
});
