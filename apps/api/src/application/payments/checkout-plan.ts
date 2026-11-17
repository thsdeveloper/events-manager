import { calculatePlatformFee, type PaymentFeeConfiguration } from './fees.js';

export type CheckoutRule =
	| 'fee_exceeds_price'
	| 'duplicate_ticket'
	| 'insufficient_stock'
	| 'maximum_quantity'
	| 'minimum_quantity'
	| 'ticket_unavailable';

export class CheckoutRuleViolation extends Error {
	constructor(
		public readonly rule: CheckoutRule,
		public readonly details: Record<string, number | string> = {},
	) {
		super(rule);
		this.name = 'CheckoutRuleViolation';
	}
}

export interface CheckoutTicketSnapshot {
	id: string;
	maxQuantityPerPurchase: number;
	minQuantityPerPurchase: number;
	price: number;
	quantity: number;
	quantitySold: number;
	saleEndDate: string | null;
	saleStartDate: string | null;
	serviceFeeType: string;
	status: string;
	visibility: string;
}

export interface CheckoutSelection {
	quantity: number;
	ticketId: string;
}

export interface CheckoutPlanItem {
	baseAmount: number;
	platformFee: number;
	quantity: number;
	serviceFee: number;
	ticket: CheckoutTicketSnapshot;
	totalAmount: number;
}

const money = (value: number) => Math.round(value * 100) / 100;

export function buildCheckoutPlan({
	configuration,
	now = new Date(),
	selections,
	tickets,
}: {
	configuration: PaymentFeeConfiguration;
	now?: Date;
	selections: CheckoutSelection[];
	tickets: CheckoutTicketSnapshot[];
}): CheckoutPlanItem[] {
	const ticketsById = new Map(tickets.map((ticket) => [ticket.id, ticket]));
	const selectedTicketIds = new Set<string>();

	return selections.map((selection) => {
		if (selectedTicketIds.has(selection.ticketId)) {
			throw new CheckoutRuleViolation('duplicate_ticket', { ticketId: selection.ticketId });
		}
		selectedTicketIds.add(selection.ticketId);

		const ticket = ticketsById.get(selection.ticketId);
		if (!ticket) {
			throw new CheckoutRuleViolation('ticket_unavailable', { ticketId: selection.ticketId });
		}
		assertTicketAvailable(ticket, selection.quantity, now);

		const baseAmount = money(ticket.price * selection.quantity);
		const platformFee = money(calculatePlatformFee(ticket.price, configuration) * selection.quantity);
		if (ticket.price > 0 && ticket.serviceFeeType === 'absorbed' && platformFee > baseAmount)
			throw new CheckoutRuleViolation('fee_exceeds_price', { ticketId: ticket.id });
		const serviceFee = ticket.serviceFeeType === 'passed_to_buyer' ? platformFee : 0;

		return {
			baseAmount,
			platformFee,
			quantity: selection.quantity,
			serviceFee,
			ticket,
			totalAmount: money(baseAmount + serviceFee),
		};
	});
}

export function assertTicketAvailable(ticket: CheckoutTicketSnapshot, quantity: number, now = new Date()) {
	if (
		ticket.status !== 'active' ||
		ticket.visibility !== 'public' ||
		(ticket.saleStartDate && new Date(ticket.saleStartDate) > now) ||
		(ticket.saleEndDate && new Date(ticket.saleEndDate) < now)
	) {
		throw new CheckoutRuleViolation('ticket_unavailable', { ticketId: ticket.id });
	}

	const available = ticket.quantity - ticket.quantitySold;
	if (quantity > available) {
		throw new CheckoutRuleViolation('insufficient_stock', { available, ticketId: ticket.id });
	}
	if (quantity > ticket.maxQuantityPerPurchase) {
		throw new CheckoutRuleViolation('maximum_quantity', { limit: ticket.maxQuantityPerPurchase, ticketId: ticket.id });
	}
	if (quantity < ticket.minQuantityPerPurchase) {
		throw new CheckoutRuleViolation('minimum_quantity', {
			minimum: ticket.minQuantityPerPurchase,
			ticketId: ticket.id,
		});
	}
}

/**
 * Reparte o desconto de um cupom entre os itens do plano.
 *
 * O cupom vale para o carrinho inteiro, mas o checkout cria uma inscrição por
 * ingresso e cobra cada uma no gateway. O abatimento é dividido em centavos, na
 * proporção do valor de cada item, e a sobra da divisão é distribuída um centavo
 * por vez — assim a soma cobrada bate exatamente com o total que a pessoa viu.
 */
export function applyDiscountToPlan(plan: CheckoutPlanItem[], discount: number) {
	const cents = plan.map((item) => Math.round(item.totalAmount * 100));
	const cartCents = cents.reduce((total, value) => total + value, 0);
	const discountCents = Math.min(Math.max(Math.round(discount * 100), 0), cartCents);

	const withDiscount = plan.map((item) => ({ ...item, discount: 0 }));
	if (discountCents === 0 || cartCents === 0) return withDiscount;

	const shares = cents.map((value) => Math.floor((discountCents * value) / cartCents));
	// A divisão inteira sempre sobra: devolve cada centavo restante ao item com o
	// maior resto, que é quem foi mais prejudicado pelo arredondamento para baixo.
	const remainders = cents
		.map((value, index) => ({ index, remainder: (discountCents * value) % cartCents }))
		.sort((left, right) => right.remainder - left.remainder);

	let leftover = discountCents - shares.reduce((total, value) => total + value, 0);
	for (const { index } of remainders) {
		if (leftover <= 0) break;
		if (shares[index] >= cents[index]) continue;
		shares[index] += 1;
		leftover -= 1;
	}

	return withDiscount.map((item, index) => {
		const totalAmount = money((cents[index] - shares[index]) / 100);
		// Política do projeto: o desconto também limita as taxas à receita desta linha.
		// O preço base permanece como referência; pedidos anteriores não são recalculados.
		return {
			...item,
			discount: money(shares[index] / 100),
			totalAmount,
			platformFee: money(Math.min(item.platformFee, totalAmount)),
			serviceFee: money(Math.min(item.serviceFee, totalAmount)),
		};
	});
}

/**
 * Rateia um valor em `parts` unidades, ao centavo. A sobra da divisão inteira
 * vai para a última unidade, então a soma das partes é sempre o valor inteiro:
 * é o que permite reembolsar ou relatar um ingresso de cada vez.
 */
export function splitAmount(amount: number, parts: number): number[] {
	if (parts <= 0) return [];
	const totalCents = Math.round(amount * 100);
	const base = Math.floor(totalCents / parts);
	const remainder = totalCents - base * parts;

	return Array.from({ length: parts }, (_, index) => (base + (index === parts - 1 ? remainder : 0)) / 100);
}
