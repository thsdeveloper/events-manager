import { z } from 'zod';
import type { CreateTransparentInput, TransparentCharge } from '../../application/payments/payment-gateway.js';
import { ApiError } from '../../shared/errors.js';

// PIX rejects emoji and typographic punctuation allowed in event titles.
export function paymentDescription(title: string) {
	return (
		title
			.normalize('NFKD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^A-Za-z0-9 .-]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
			.slice(0, 140) || 'Ingresso Flouvi'
	);
}

const record = z.object({
	id: z.string().min(1),
	amount: z.number().int().nonnegative(),
	status: z.enum([
		'PENDING',
		'PAID',
		'APPROVED',
		'EXPIRED',
		'CANCELLED',
		'REFUNDED',
		'FAILED',
		'UNDER_DISPUTE',
		'REDEEMED',
	]),
	devMode: z.boolean(),
	platformFee: z.number().int().nonnegative().nullish(),
	method: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).nullish(),
	brCode: z.string().nullish(),
	brCodeBase64: z.string().nullish(),
	identificationNumber: z.string().nullish(),
	barCode: z.string().nullish(),
	url: z.string().nullish(),
	expiresAt: z.string().nullish(),
	receiptUrl: z.string().nullish(),
	installmentCount: z.number().int().min(1).max(12).nullish(),
	installmentGroupId: z.string().nullish(),
	createdAt: z.string().optional(),
	updatedAt: z.string().datetime().optional(),
});
function trustedUrl(value: string | null | undefined) {
	if (!value) return null;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' && ['app.abacatepay.com', 'abacatepay.com'].includes(url.hostname)
			? url.href
			: null;
	} catch {
		return null;
	}
}
export function transparentRecord(value: unknown, method?: CreateTransparentInput['method']): TransparentCharge {
	const row = record.parse(value);
	return {
		id: row.id,
		providerUpdatedAt: row.updatedAt,
		method:
			method ??
			(row.id.startsWith('card_') || row.method === 'CARD'
				? 'CARD'
				: row.id.startsWith('bole_') || row.method === 'BOLETO'
					? 'BOLETO'
					: 'PIX'),
		status: row.status,
		amountInCents: row.amount,
		providerFeeInCents: (row.installmentCount ?? 1) > 1 ? null : (row.platformFee ?? null),
		devMode: row.devMode,
		receiptUrl: trustedUrl(row.receiptUrl),
		metadata: Object.fromEntries(
			Object.entries(row.metadata ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
		),
		copyPasteCode: row.brCode ?? null,
		qrCodeBase64: row.brCodeBase64?.match(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/) ? row.brCodeBase64 : null,
		barcode: row.identificationNumber ?? row.barCode ?? null,
		boletoUrl: trustedUrl(row.url),
		expiresAt: row.expiresAt ?? null,
	};
}
export class AbacatePayTransparent {
	constructor(
		private readonly key: string,
		private readonly baseUrl: string,
	) {}
	private async request(path: string, init: RequestInit, creating = false, envelope = false) {
		try {
			const response = await fetch(`${this.baseUrl}${path}`, {
				...init,
				headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
				signal: AbortSignal.timeout(25_000),
			});
			const body = await response.json().catch(() => null);
			if (!response.ok || !body?.success || !body.data) {
				if (creating && response.status >= 400 && response.status < 500 && response.status !== 408) {
					throw new ApiError(
						response.status === 429
							? 'Muitas tentativas. Aguarde um minuto antes de tentar novamente.'
							: 'Não foi possível processar o pagamento. Confira seus dados ou escolha outra forma de pagamento.',
						422,
						'PAYMENT_DECLINED',
					);
				}
				throw new ApiError(
					'Estamos verificando o pagamento. Não refaça a compra enquanto a confirmação estiver pendente.',
					503,
					'PAYMENT_OUTCOME_UNKNOWN',
					undefined,
					{ exposeDetail: true },
				);
			}
			return (envelope ? body : body.data) as unknown;
		} catch (error) {
			if (error instanceof ApiError) throw error;
			throw new ApiError(
				'Estamos verificando o pagamento. Não refaça a compra enquanto a confirmação estiver pendente.',
				503,
				'PAYMENT_OUTCOME_UNKNOWN',
				undefined,
				{ exposeDetail: true },
			);
		}
	}
	async create(input: CreateTransparentInput) {
		const data = {
			amount: input.amountInCents,
			metadata: input.metadata,
			...(input.method === 'CARD'
				? {
						token: input.token,
						installmentCount: input.installments ?? 1,
						customer: input.customer,
						passFeesToCustomer: false,
					}
				: {
						externalId: input.externalId,
						description: paymentDescription(input.description),
						...(input.method === 'PIX' ? { expiresIn: 1800 } : {}),
						...(input.customer.taxId ? { customer: input.customer } : {}),
					}),
		};
		const raw = await this.request(
			'/transparents/create',
			{ method: 'POST', body: JSON.stringify({ method: input.method, data }) },
			true,
		);
		try {
			return this.completeRecord(raw, input.method, input.method === 'CARD' ? input.installments : 1);
		} catch {
			throw new ApiError('Pagamento em verificação.', 503, 'PAYMENT_OUTCOME_UNKNOWN');
		}
	}
	private async list(query: URLSearchParams) {
		const raw = await this.request(`/transparents/list?${query}`, { method: 'GET' }, false, true);
		return z
			.object({
				data: z.array(z.record(z.string(), z.unknown())),
				pagination: z.object({ hasMore: z.boolean(), next: z.string().nullable() }).optional(),
			})
			.parse(raw);
	}
	private async statementFee(parts: Array<{ id: string; amount: number }>, createdAt?: string) {
		const query = new URLSearchParams({ method: 'CARD', limit: '100' });
		if (createdAt) query.set('startDate', previousDate(createdAt));
		const totals = new Map<string, { credit: number; fee: number }>();
		const seen = new Set<string>();
		for (let page = 0; page < 5; page++) {
			const raw = await this.request(`/bank-statement/list?${query}`, { method: 'GET' }, false, true);
			const batch = z
				.object({
					data: z.array(
						z.object({
							id: z.string(),
							paymentIntentId: z.string().nullable(),
							currency: z.string(),
							movements: z.array(
								z.object({ amount: z.number().int().nonnegative(), category: z.string(), balanceEffect: z.string() }),
							),
						}),
					),
					pagination: z.object({ hasMore: z.boolean(), next: z.string().nullable() }).optional(),
				})
				.parse(raw);
			for (const item of batch.data) {
				if (seen.has(item.id) || item.currency !== 'BRL' || !parts.some((part) => part.id === item.paymentIntentId))
					continue;
				seen.add(item.id);
				const total = totals.get(item.paymentIntentId!) ?? { credit: 0, fee: 0 };
				for (const movement of item.movements) {
					if (movement.category === 'transaction' && movement.balanceEffect === 'credit')
						total.credit += movement.amount;
					if (movement.category === 'fee' && movement.balanceEffect === 'debit') total.fee += movement.amount;
				}
				totals.set(item.paymentIntentId!, total);
			}
			if (!batch.pagination?.hasMore || !batch.pagination.next) {
				if (
					parts.every((part) => totals.get(part.id)?.credit === part.amount && totals.get(part.id)!.fee <= part.amount)
				)
					return parts.reduce((sum, part) => sum + totals.get(part.id)!.fee, 0);
				return null;
			}
			query.set('after', batch.pagination.next);
		}
		return null;
	}
	private async completeRecord(raw: unknown, method?: CreateTransparentInput['method'], installments = 1) {
		const row = record.parse(raw);
		const count = row.installmentCount ?? installments;
		const charge = transparentRecord({ ...row, installmentCount: count }, method);
		if (charge.method !== 'CARD') return charge;
		try {
			if (count <= 1) {
				if (charge.status === 'PAID' && charge.providerFeeInCents === null)
					charge.providerFeeInCents = await this.statementFee(
						[{ id: charge.id, amount: charge.amountInCents }],
						row.createdAt,
					);
				return charge;
			}
			// Approval of the sale and settlement of all its installments are distinct.
			if (charge.status === 'PAID') charge.status = 'APPROVED';
			if (!row.installmentGroupId) return charge;
			const parts = new Map<number, { id: string; fee: number | null; amount: number; settled: boolean }>();
			const query = new URLSearchParams({ method: 'CARD', limit: '100' });
			if (row.createdAt) query.set('startDate', previousDate(row.createdAt));
			for (let page = 0; page < 5; page++) {
				const batch = await this.list(query);
				for (const part of batch.data) {
					if (part.installmentGroupId !== row.installmentGroupId || part.devMode !== row.devMode) continue;
					const number = Number(part.installmentNumber),
						fee = part.platformFee,
						amount = part.installmentAmount;
					if (
						Number.isInteger(number) &&
						number >= 1 &&
						number <= count &&
						typeof amount === 'number' &&
						Number.isSafeInteger(amount) &&
						amount > 0 &&
						typeof part.id === 'string'
					)
						parts.set(number, {
							id: part.id,
							amount,
							settled: part.status === 'PAID',
							fee: typeof fee === 'number' && Number.isSafeInteger(fee) && fee >= 0 && fee <= amount ? fee : null,
						});
				}
				if (parts.size === count) {
					const values = [...parts.values()];
					if (
						new Set(values.map((part) => part.id)).size !== count ||
						values.reduce((total, part) => total + part.amount, 0) !== charge.amountInCents
					)
						return charge;
					if (values.every((part) => part.fee !== null))
						charge.providerFeeInCents = values.reduce((total, part) => total + part.fee!, 0);
					if (row.status === 'PAID' && values.every((part) => part.settled)) {
						charge.status = 'PAID';
						if (charge.providerFeeInCents === null)
							charge.providerFeeInCents = await this.statementFee(values, row.createdAt);
					}
					break;
				}
				if (!batch.pagination?.hasMore || !batch.pagination.next) break;
				query.set('after', batch.pagination.next);
			}
		} catch {
			/* Keep financial entries pending until settlement and fees are verified. */
		}
		return charge;
	}
	async find(lookup: { id: string } | { attemptId: string; createdAt: string }) {
		// Card ignores externalId. Recover uncertain submissions by our metadata instead.
		let after: string | undefined;
		for (let page = 0; page < 5; page++) {
			const query = new URLSearchParams('limit=100');
			if ('id' in lookup) query.set('id', lookup.id);
			else query.set('startDate', previousDate(lookup.createdAt));
			if (after) query.set('after', after);
			const batch = await this.list(query);
			const match = batch.data.find((row) =>
				'id' in lookup
					? row.id === lookup.id
					: (row.metadata as Record<string, unknown> | null)?.checkout_attempt_id === lookup.attemptId,
			);
			if (match) return this.completeRecord(match);
			if (!batch.pagination?.hasMore || !batch.pagination.next || 'id' in lookup) return null;
			after = batch.pagination.next;
		}
		return null;
	}
}
function previousDate(value: string) {
	return new Date(new Date(value).getTime() - 86400000).toISOString().slice(0, 10);
}
