import crypto from 'node:crypto';
import type { PaymentGateway } from '../payments/payment-gateway.js';
import { ApiError } from '../../shared/errors.js';

type Row = Record<string, unknown>;

export interface AuditContext {
	ip: string;
	userAgent: string | null;
}

export interface OrganizerPageQuery {
	limit: number;
	page: number;
	search: string;
	status?: 'active' | 'pending' | 'archived';
}

export interface TransactionPageQuery {
	limit: number;
	page: number;
	search: string;
	status?: 'succeeded' | 'pending' | 'failed' | 'refunded';
}

export interface SuperAdminRepository {
	createPayout(input: {
		actorId: string;
		amount: number;
		id: string;
		organizerId: string;
		provider: string;
		providerFee: number;
	}): Promise<Row>;
	failPayout(id: string, reason: string, processedAt: string): Promise<void>;
	finishPayout(id: string, input: Record<string, unknown>): Promise<Row>;
	getAvailableBalance(organizerId: string): Promise<number>;
	getConfiguration(): Promise<Row>;
	getOrganizer(id: string): Promise<Row | null>;
	getOverviewData(): Promise<{
		events: Row[];
		organizers: Row[];
		payouts: Row[];
		recentTransactions: Row[];
		registrations: Row[];
		transactions: Row[];
	}>;
	listOrganizerPage(query: OrganizerPageQuery): Promise<{
		data: Row[];
		events: Row[];
		registrations: Row[];
		total: number;
	}>;
	listPayouts(): Promise<Row[]>;
	listTransactionPage(query: TransactionPageQuery): Promise<{ data: Row[]; total: number }>;
	recordAudit(input: {
		action: string;
		actorId: string;
		after: unknown;
		before: unknown;
		context: AuditContext;
		resourceId: string | number | null;
		resourceType: string;
	}): Promise<void>;
	updateConfiguration(input: Record<string, unknown>): Promise<{ before: Row; data: Row }>;
	updateOrganizer(id: string, input: Record<string, unknown>): Promise<{ before: Row; data: Row } | null>;
}

export class SuperAdminService {
	constructor(
		private readonly repository: SuperAdminRepository,
		private readonly payments: PaymentGateway,
		private readonly now: () => Date = () => new Date(),
	) {}

	async overview() {
		const data = await this.repository.getOverviewData();
		const succeeded = data.transactions.filter((transaction) => transaction.status === 'succeeded');
		const paid = data.registrations.filter((registration) => registration.payment_status === 'paid');
		const grossRevenue = sum(paid, 'total_amount');
		const eventMap = new Map(data.events.map((event) => [String(event.id), event]));
		const performance = new Map<string, { id: string; name: string; gross: number; tickets: number; events: number }>();
		for (const organizer of data.organizers) {
			performance.set(String(organizer.id), {
				id: String(organizer.id),
				name: String(organizer.name),
				gross: 0,
				tickets: 0,
				events: 0,
			});
		}
		for (const event of data.events) performance.get(String(event.organizer_id))!.events += 1;
		for (const registration of paid) {
			const owner = eventMap.get(String(registration.event_id))?.organizer_id;
			const current = owner ? performance.get(String(owner)) : undefined;
			if (current) {
				current.gross += Number(registration.total_amount ?? 0);
				current.tickets += Number(registration.quantity ?? 0);
			}
		}
		const lastThirtyDays = this.now();
		lastThirtyDays.setDate(lastThirtyDays.getDate() - 29);
		lastThirtyDays.setHours(0, 0, 0, 0);
		const timeline = new Map<string, { gross: number; tickets: number }>();
		for (const registration of paid) {
			const created = String(registration.date_created);
			if (new Date(created) < lastThirtyDays) continue;
			const day = created.slice(0, 10);
			const value = timeline.get(day) ?? { gross: 0, tickets: 0 };
			value.gross += Number(registration.total_amount ?? 0);
			value.tickets += Number(registration.quantity ?? 0);
			timeline.set(day, value);
		}
		return {
			metrics: {
				organizers: data.organizers.length,
				activeOrganizers: countBy(data.organizers, 'status', 'active'),
				events: data.events.length,
				publishedEvents: countBy(data.events, 'status', 'published'),
				ticketsSold: sum(paid, 'quantity'),
				grossRevenue,
				platformRevenue: sum(succeeded, 'platform_fee'),
				providerFees: sum(succeeded, 'provider_fee'),
				organizerPayable: Math.max(
					0,
					sum(succeeded, 'organizer_net') -
						sum(
							data.payouts.filter((payout) => payout.status === 'completed'),
							'amount',
						),
				),
			},
			timeline: [...timeline].map(([date, value]) => ({ date, ...value })).sort((a, b) => a.date.localeCompare(b.date)),
			topOrganizers: [...performance.values()].sort((a, b) => b.gross - a.gross).slice(0, 6),
			recentTransactions: data.recentTransactions,
			status: {
				organizers: Object.fromEntries(
					['active', 'pending', 'archived'].map((status) => [status, countBy(data.organizers, 'status', status)]),
				),
				events: Object.fromEntries(
					['published', 'draft', 'cancelled', 'archived'].map((status) => [
						status,
						countBy(data.events, 'status', status),
					]),
				),
			},
			provider: this.payments.provider,
			organizers: data.organizers.length,
		};
	}

	async listOrganizers(query: OrganizerPageQuery) {
		const result = await this.repository.listOrganizerPage(query);
		const eventOwner = new Map(result.events.map((event) => [event.id, event.organizer_id]));
		return {
			data: result.data.map((organizer) => {
				const events = result.events.filter((event) => event.organizer_id === organizer.id);
				const paid = result.registrations.filter(
					(registration) =>
						eventOwner.get(registration.event_id) === organizer.id && registration.payment_status === 'paid',
				);
				return {
					...organizer,
					metrics: {
						events: events.length,
						ticketsSold: sum(paid, 'quantity'),
						grossRevenue: sum(paid, 'total_amount'),
					},
				};
			}),
			pagination: {
				page: query.page,
				limit: query.limit,
				total: result.total,
				pageCount: Math.ceil(result.total / query.limit),
			},
		};
	}

	async updateOrganizerStatus(actorId: string, id: string, input: Record<string, unknown>, context: AuditContext) {
		const result = await this.repository.updateOrganizer(id, input);
		if (!result) throw new ApiError('Organizador não encontrado.', 404, 'ORGANIZER_NOT_FOUND');
		await this.repository.recordAudit({
			actorId,
			action: 'organizer.status_updated',
			resourceType: 'organizer',
			resourceId: id,
			before: result.before,
			after: result.data,
			context,
		});
		return { success: true, organizer: result.data };
	}

	async listTransactions(query: TransactionPageQuery) {
		const result = await this.repository.listTransactionPage(query);
		return {
			data: result.data,
			pagination: {
				page: query.page,
				limit: query.limit,
				total: result.total,
				pageCount: Math.ceil(result.total / query.limit),
			},
		};
	}

	async listPayouts() {
		return { data: await this.repository.listPayouts() };
	}

	async createPayout(actorId: string, organizerId: string, amount: number, context: AuditContext) {
		const [organizer, configuration, available] = await Promise.all([
			this.repository.getOrganizer(organizerId),
			this.repository.getConfiguration(),
			this.repository.getAvailableBalance(organizerId),
		]);
		if (!organizer) throw new ApiError('Organizador não encontrado.', 404, 'ORGANIZER_NOT_FOUND');
		if (!organizer.payout_pix_key || !organizer.payout_pix_key_type || organizer.payout_status !== 'enabled') {
			throw new ApiError('Os dados PIX do organizador ainda não estão habilitados.', 422, 'PAYOUT_ACCOUNT_DISABLED');
		}
		const pixKeyType = parsePixKeyType(organizer.payout_pix_key_type);
		if (!configuration.payouts_enabled && this.payments.provider !== 'mock') {
			throw new ApiError('Os repasses reais estão pausados nas configurações da plataforma.', 409, 'PAYOUTS_DISABLED');
		}
		if (amount < Number(configuration.minimum_payout)) {
			throw new ApiError(
				`O repasse mínimo é de R$ ${Number(configuration.minimum_payout).toFixed(2)}.`,
				422,
				'PAYOUT_BELOW_MINIMUM',
			);
		}
		if (amount > available)
			throw new ApiError('Saldo disponível insuficiente para este repasse.', 409, 'INSUFFICIENT_BALANCE');

		const providerFee = this.payments.provider === 'mock' ? 0 : Number(configuration.payout_fee_fixed);
		let payout: Row;
		try {
			payout = await this.repository.createPayout({
				actorId,
				amount,
				id: crypto.randomUUID(),
				organizerId,
				provider: this.payments.provider,
				providerFee,
			});
		} catch (error) {
			throw payoutCreationError(error, configuration);
		}
		try {
			const transfer = await this.payments.sendPix({
				externalId: String(payout.id),
				amountInCents: Math.round(Number(payout.net_amount) * 100),
				description: `Repasse Events Manager · ${String(organizer.name)}`,
				pixKey: String(organizer.payout_pix_key),
				pixKeyType,
			});
			const completed = transfer.status === 'COMPLETE';
			const updated = await this.repository.finishPayout(String(payout.id), {
				provider_payout_id: transfer.id,
				provider_fee: transfer.providerFeeInCents ? transfer.providerFeeInCents / 100 : providerFee,
				status: completed ? 'completed' : 'processing',
				receipt_url: transfer.receiptUrl,
				processed_at: completed ? this.now().toISOString() : null,
			});
			await this.repository.recordAudit({
				actorId,
				action: 'payout.created',
				resourceType: 'organizer_payout',
				resourceId: String(payout.id),
				before: null,
				after: updated,
				context,
			});
			return { success: true, payout: updated };
		} catch (error) {
			await this.repository.failPayout(
				String(payout.id),
				error instanceof Error ? error.message : 'Falha no provedor de pagamentos.',
				this.now().toISOString(),
			);
			throw error;
		}
	}

	async getPaymentSettings() {
		return { settings: await this.repository.getConfiguration(), runtimeProvider: this.payments.provider };
	}

	async updatePaymentSettings(actorId: string, input: Record<string, unknown>, context: AuditContext) {
		const result = await this.repository.updateConfiguration(input);
		await this.repository.recordAudit({
			actorId,
			action: 'payment_settings.updated',
			resourceType: 'event_configuration',
			resourceId: 1,
			before: result.before,
			after: result.data,
			context,
		});
		return { success: true, settings: result.data };
	}
}

function sum(rows: Row[], key: string) {
	return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function countBy(rows: Row[], key: string, value: unknown) {
	return rows.filter((row) => row[key] === value).length;
}

function parsePixKeyType(value: unknown): 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM' {
	const normalized = String(value);
	if (['CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM'].includes(normalized)) {
		return normalized as 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM';
	}
	throw new ApiError('Os dados PIX do organizador ainda não estão habilitados.', 422, 'PAYOUT_ACCOUNT_DISABLED');
}

function payoutCreationError(error: unknown, configuration: Row) {
	const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error);
	if (message.includes('ORGANIZER_NOT_FOUND'))
		return new ApiError('Organizador não encontrado.', 404, 'ORGANIZER_NOT_FOUND');
	if (message.includes('PAYOUT_ACCOUNT_DISABLED'))
		return new ApiError('Os dados PIX do organizador ainda não estão habilitados.', 422, 'PAYOUT_ACCOUNT_DISABLED');
	if (message.includes('PAYOUTS_DISABLED'))
		return new ApiError('Os repasses reais estão pausados nas configurações da plataforma.', 409, 'PAYOUTS_DISABLED');
	if (message.includes('PAYOUT_BELOW_MINIMUM'))
		return new ApiError(
			`O repasse mínimo é de R$ ${Number(configuration.minimum_payout).toFixed(2)}.`,
			422,
			'PAYOUT_BELOW_MINIMUM',
		);
	if (message.includes('INSUFFICIENT_BALANCE'))
		return new ApiError('Saldo disponível insuficiente para este repasse.', 409, 'INSUFFICIENT_BALANCE');
	return error;
}
