import { createHash } from 'node:crypto';
import type {
	TransparentCheckoutInput,
	TransparentCheckoutResult,
	TransparentPayment,
} from '@events-manager/contracts';
import type { PaymentService, PaymentOperationLogger } from './payment-service.js';
import type { PaymentGateway, TransparentCharge, CheckoutMethod } from './payment-gateway.js';
import type { TicketDelivery } from '../tickets/deliver-tickets.js';
import { ApiError } from '../../shared/errors.js';

export interface TransparentAttempt {
	id: string;
	user_id: string;
	fingerprint: string;
	method: string;
	amount: number;
	status: TransparentCheckoutResult['status'];
	registration_ids: string[];
	provider_id: string | null;
	charge: TransparentPayment | null;
	confirmation_url: string | null;
	error_message: string | null;
	created_at: string;
}
export interface TransparentAttemptRepository {
	claim(input: {
		id: string;
		user_id: string;
		fingerprint: string;
		method: CheckoutMethod;
		amount: number;
	}): Promise<{ created: boolean; attempt: TransparentAttempt }>;
	find(id: string, userId: string): Promise<TransparentAttempt | null>;
	findForProvider(providerId: string, attemptId?: string): Promise<TransparentAttempt | null>;
	prepare(
		id: string,
		input: { registrationIds: string[]; amountInCents: number; method: CheckoutMethod },
	): Promise<void>;
	saveResult(
		id: string,
		input: { payment?: TransparentPayment; registrationId?: string; confirmationUrl?: string; confirmed?: boolean },
	): Promise<void>;
	fail(id: string, message: string): Promise<void>;
	settle(id: string, charge: TransparentCharge, event?: string): Promise<void>;
	pending(limit: number): Promise<TransparentAttempt[]>;
}
export function publicPayment(charge: TransparentPayment): TransparentPayment {
	return {
		id: charge.id,
		method: charge.method,
		status: charge.status,
		amountInCents: charge.amountInCents,
		copyPasteCode: charge.copyPasteCode,
		qrCodeBase64: charge.qrCodeBase64,
		barcode: charge.barcode,
		boletoUrl: charge.boletoUrl,
		expiresAt: charge.expiresAt,
		...(charge.developmentSimulation ? { developmentSimulation: true } : {}),
	};
}
function result(row: TransparentAttempt): TransparentCheckoutResult {
	return {
		attemptId: row.id,
		status: row.status,
		payment: row.charge ? publicPayment(row.charge) : null,
		...(row.registration_ids[0] ? { registrationId: row.registration_ids[0] } : {}),
		...(row.confirmation_url ? { confirmationUrl: row.confirmation_url } : {}),
		...(row.error_message ? { message: row.error_message } : {}),
	};
}
export class TransparentCheckoutService {
	constructor(
		private readonly repository: TransparentAttemptRepository,
		private readonly payment: PaymentService,
		private readonly gateway: PaymentGateway,
		private readonly devMode: boolean,
		private readonly delivery?: TicketDelivery,
		private readonly simulationEnabled = false,
	) {}
	private get allowsSimulation() {
		return this.simulationEnabled && this.devMode && this.gateway.provider === 'abacatepay';
	}
	private result(row: TransparentAttempt): TransparentCheckoutResult {
		return {
			...result(row),
			canSimulatePayment: this.allowsSimulation && row.status === 'pending' && Boolean(row.provider_id),
		};
	}
	async create(userId: string, input: TransparentCheckoutInput, logger: PaymentOperationLogger) {
		const { token, requestId, ...cart } = input;
		const fingerprint = createHash('sha256').update(JSON.stringify(cart)).digest('hex');
		const claim = await this.repository.claim({
			id: requestId,
			user_id: userId,
			fingerprint,
			method: input.paymentMethod,
			amount: input.expectedAmountInCents,
		});
		if (claim.attempt.fingerprint !== fingerprint)
			throw new ApiError(
				'Esta tentativa já pertence a outra compra. Confira o pagamento existente.',
				409,
				'CHECKOUT_REQUEST_CONFLICT',
			);
		if (!claim.created) return this.result(claim.attempt);
		let submitted = false;
		try {
			const created = await this.payment.checkout(userId, input, logger, {
				attemptId: requestId,
				token,
				installments: input.installments,
				expectedAmountInCents: input.expectedAmountInCents,
				ready: async (data) => {
					await this.repository.prepare(requestId, data);
					submitted = true;
				},
			});
			if ('payment' in created && created.payment) {
				this.validate(claim.attempt, created.payment);
				await this.repository.saveResult(requestId, {
					payment: publicPayment(created.payment),
					registrationId: created.registrationId,
					confirmationUrl: created.confirmationUrl,
				});
				await this.apply(claim.attempt, created.payment);
			} else {
				await this.repository.saveResult(requestId, {
					registrationId: created.registrationId,
					confirmationUrl: created.url,
					confirmed: true,
				});
			}
			return this.result((await this.repository.find(requestId, userId))!);
		} catch (error) {
			if (error instanceof ApiError && error.statusCode < 500 && (!submitted || error.code === 'PAYMENT_DECLINED')) {
				await this.repository.fail(requestId, error.message);
				throw error;
			}
			// Do not retry an upstream mutation after a timeout or persistence failure.
			logger.error({ attemptId: requestId }, 'Transparent payment awaits reconciliation');
			return this.result((await this.repository.find(requestId, userId)) ?? claim.attempt);
		}
	}
	async status(userId: string, id: string) {
		let row = await this.repository.find(id, userId);
		if (!row) throw new ApiError('Compra não encontrada.', 404, 'CHECKOUT_NOT_FOUND');
		if (['processing', 'pending', 'disputed'].includes(row.status)) {
			try {
				await this.reconcile(row);
				row = (await this.repository.find(id, userId)) ?? row;
			} catch {
				/* Existing state remains authoritative on provider failures. */
			}
		}
		return this.result(row);
	}
	async simulatePayment(userId: string, id: string) {
		if (!this.allowsSimulation)
			throw new ApiError('Simulação disponível apenas no ambiente de testes.', 403, 'PAYMENT_SIMULATION_DISABLED');
		const row = await this.repository.find(id, userId);
		if (!row || row.user_id !== userId) throw new ApiError('Compra não encontrada.', 404, 'CHECKOUT_NOT_FOUND');
		if (row.status === 'confirmed') return this.result(row);
		if (row.status !== 'pending' || !row.provider_id)
			throw new ApiError('A simulação exige um pagamento pendente.', 409, 'PAYMENT_NOT_PENDING');
		const charge = await this.gateway.findTransparentCharge({ id: row.provider_id });
		if (!charge) throw new ApiError('Cobrança não encontrada.', 404, 'PAYMENT_NOT_FOUND');
		this.validate(row, charge);
		if (charge.status === 'PENDING') {
			if (row.method === 'PIX') {
				await this.gateway.simulateTransparentPixPayment(row.provider_id);
				await this.reconcile(row);
			} else {
				// The provider has no boleto/card simulation endpoint. Keep this local sandbox
				// confirmation identifiable and never invent a settled fee or withdrawable balance.
				await this.apply(
					row,
					{ ...charge, status: 'PAID', developmentSimulation: true, providerFeeInCents: null, receiptUrl: null },
					'development.simulated',
				);
			}
		} else if (['PAID', 'APPROVED'].includes(charge.status)) {
			await this.apply(row, charge);
		} else {
			throw new ApiError('Esta cobrança não está mais pendente.', 409, 'PAYMENT_NOT_PENDING');
		}
		return this.result((await this.repository.find(id, userId)) ?? row);
	}
	private validate(row: TransparentAttempt, charge: TransparentCharge) {
		if (!Number.isSafeInteger(charge.amountInCents) || charge.amountInCents !== row.amount)
			throw new ApiError(
				'Valor do pagamento divergente. A compra está em verificação.',
				409,
				'PAYMENT_AMOUNT_MISMATCH',
			);
		if (charge.devMode !== this.devMode)
			throw new ApiError('Ambiente de pagamento incompatível.', 409, 'PAYMENT_ENVIRONMENT_MISMATCH');
		if (charge.method !== row.method && !(row.method === 'BOLETO' && charge.method === 'PIX'))
			throw new ApiError('Método de pagamento incompatível.', 409, 'PAYMENT_METHOD_MISMATCH');
		if (row.provider_id && row.provider_id !== charge.id)
			throw new ApiError('Cobrança incompatível com o pedido.', 409, 'PAYMENT_REFERENCE_MISMATCH');
		if (
			charge.providerFeeInCents !== null &&
			(!Number.isSafeInteger(charge.providerFeeInCents) ||
				charge.providerFeeInCents < 0 ||
				charge.providerFeeInCents > row.amount)
		)
			throw new ApiError('Tarifa do pagamento inválida.', 409, 'PAYMENT_FEE_MISMATCH');
	}
	private async apply(row: TransparentAttempt, charge: TransparentCharge, event?: string) {
		this.validate(row, charge);
		await this.repository.settle(row.id, charge, event);
		if (
			['PAID', 'APPROVED'].includes(charge.status) &&
			(!event || event === 'transparent.completed' || event === 'development.simulated')
		) {
			const current = await this.repository.find(row.id, row.user_id);
			if (current?.status === 'confirmed')
				await this.delivery?.execute(current.registration_ids).catch(() => undefined);
		}
	}
	async reconcile(row: TransparentAttempt) {
		if (row.charge?.developmentSimulation) return;
		const charge = await this.gateway.findTransparentCharge(
			row.provider_id ? { id: row.provider_id } : { attemptId: row.id, createdAt: row.created_at },
		);
		if (charge) await this.apply(row, charge);
	}
	async reconcilePending() {
		const rows = await this.repository.pending(5);
		await Promise.allSettled(rows.map((row) => this.reconcile(row)));
	}
	async webhook(payload: {
		event: string;
		devMode?: boolean;
		data?: { transparent?: Record<string, unknown>; payerInformation?: { method?: string } };
	}) {
		if (!payload.event.startsWith('transparent.') || !payload.data?.transparent) return null;
		const raw = payload.data.transparent;
		if (typeof raw.id !== 'string') return null;
		const metadata = raw.metadata as Record<string, string> | undefined;
		const row = await this.repository.findForProvider(raw.id, metadata?.checkout_attempt_id);
		if (!row) return null;
		if (row.charge?.developmentSimulation) return { received: true };
		if (
			![
				'transparent.completed',
				'transparent.refunded',
				'transparent.disputed',
				'transparent.lost',
				'transparent.expired',
				'transparent.cancelled',
			].includes(payload.event)
		)
			return { received: true };
		const method = payload.data.payerInformation?.method;
		const charge: TransparentCharge = {
			id: raw.id,
			providerUpdatedAt:
				typeof raw.updatedAt === 'string' && Number.isFinite(Date.parse(raw.updatedAt))
					? new Date(raw.updatedAt).toISOString()
					: undefined,
			method: method === 'CARD' || method === 'BOLETO' || method === 'PIX' ? method : (row.method as CheckoutMethod),
			status: String(raw.status ?? 'PENDING'),
			amountInCents: Number(raw.amount),
			// Credit webhooks report only the first installment's portion of the fee.
			providerFeeInCents:
				Number(raw.installmentCount ?? 1) > 1 || raw.platformFee == null ? null : Number(raw.platformFee),
			devMode: (raw.devMode ?? payload.devMode) as boolean,
			metadata: metadata ?? {},
			receiptUrl: safeReceipt(raw.receiptUrl),
			copyPasteCode: row.charge?.copyPasteCode ?? null,
			qrCodeBase64: row.charge?.qrCodeBase64 ?? null,
			barcode: row.charge?.barcode ?? null,
			boletoUrl: row.charge?.boletoUrl ?? null,
			expiresAt: row.charge?.expiresAt ?? null,
		};
		if (payload.event === 'transparent.completed' && !['PAID', 'APPROVED'].includes(charge.status))
			throw new ApiError('Status de pagamento incompatível.', 409, 'PAYMENT_STATUS_MISMATCH');
		await this.apply(row, charge, payload.event);
		return { received: true };
	}
}
function safeReceipt(value: unknown) {
	if (typeof value !== 'string') return null;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' && ['app.abacatepay.com', 'abacatepay.com'].includes(url.hostname)
			? url.href
			: null;
	} catch {
		return null;
	}
}
