import type { CouponInput, CouponPatch } from '@events-manager/contracts';

export type CouponDiscountType = 'percentage' | 'fixed';

export interface Coupon {
	id: string;
	event_id: string;
	code: string;
	discount_type: CouponDiscountType;
	discount_value: number | string;
	status: 'active' | 'inactive';
	starts_at: string | null;
	expires_at: string | null;
	max_uses: number | null;
	uses: number;
}

export interface TicketPrice {
	id: string;
	buyer_price: number | string | null;
	price: number | string;
}

export interface CouponRepository {
	createForEvent(eventId: string, input: CouponInput): Promise<Coupon>;
	deleteForEvent(eventId: string, couponId: string): Promise<boolean>;
	findActiveByCode(eventId: string, code: string): Promise<Coupon | null>;
	findTicketPrices(eventId: string, ticketIds: string[]): Promise<TicketPrice[]>;
	listByEvent(eventId: string): Promise<Coupon[]>;
	ownsEvent(userId: string, eventId: string): Promise<boolean>;
	updateForEvent(eventId: string, couponId: string, input: CouponPatch): Promise<Coupon | null>;
}

export class CouponNotFound extends Error {}
export class CouponNotStarted extends Error {}
export class CouponExpired extends Error {}
export class CouponExhausted extends Error {}
export class TicketNotInEvent extends Error {}
export class EventNotOwned extends Error {}
export class CouponConflict extends Error {}

export interface CartItem {
	quantity: number;
	ticketId: string;
}

export interface ApplyCouponInput {
	code: string;
	eventId: string;
	items: CartItem[];
}

export interface ValidateCouponInput {
	code: string;
	eventId: string;
	subtotal: number;
}

/** Reais com dois decimais, como o resto do cálculo de pagamento. */
const money = (value: number) => Math.round(value * 100) / 100;

/** O código é digitado pela pessoa: espaços e caixa não devem derrubar a busca. */
export const normalizeCode = (code: string) => code.trim().toUpperCase();

/** Um cupom nunca abate mais do que o subtotal — o total não fica negativo. */
function discountFor(coupon: Coupon, subtotal: number) {
	const value = Number(coupon.discount_value);
	const raw = coupon.discount_type === 'percentage' ? subtotal * (value / 100) : value;

	return money(Math.min(Math.max(raw, 0), subtotal));
}

export class CouponService {
	constructor(private readonly repository: CouponRepository) {}

	async validate(input: ValidateCouponInput, now = new Date()) {
		const coupon = await this.repository.findActiveByCode(input.eventId, normalizeCode(input.code));
		if (!coupon) throw new CouponNotFound();
		if (coupon.starts_at && new Date(coupon.starts_at) > now) throw new CouponNotStarted();
		if (coupon.expires_at && new Date(coupon.expires_at) <= now) throw new CouponExpired();
		if (coupon.max_uses !== null && coupon.uses >= coupon.max_uses) throw new CouponExhausted();

		const discount = discountFor(coupon, input.subtotal);

		return { code: coupon.code, discount, subtotal: input.subtotal, total: money(input.subtotal - discount) };
	}

	/**
	 * Aplica o cupom ao carrinho. O subtotal é montado com os preços gravados
	 * para o evento: nada de valor vindo do navegador entra nessa conta.
	 */
	async apply(input: ApplyCouponInput, now = new Date()) {
		const ticketIds = [...new Set(input.items.map((item) => item.ticketId))];
		const prices = await this.repository.findTicketPrices(input.eventId, ticketIds);

		const subtotal = money(
			input.items.reduce((total, item) => {
				const ticket = prices.find((price) => price.id === item.ticketId);
				if (!ticket) throw new TicketNotInEvent();

				return total + Number(ticket.buyer_price ?? ticket.price) * item.quantity;
			}, 0),
		);

		return this.validate({ code: input.code, eventId: input.eventId, subtotal }, now);
	}

	async listForEvent(userId: string, eventId: string) {
		await this.assertOwnership(userId, eventId);

		return this.repository.listByEvent(eventId);
	}

	async create(userId: string, eventId: string, input: CouponInput) {
		await this.assertOwnership(userId, eventId);

		return this.repository.createForEvent(eventId, input);
	}

	async update(userId: string, eventId: string, couponId: string, input: CouponPatch) {
		await this.assertOwnership(userId, eventId);
		const coupon = await this.repository.updateForEvent(eventId, couponId, input);
		if (!coupon) throw new CouponNotFound();

		return coupon;
	}

	async remove(userId: string, eventId: string, couponId: string) {
		await this.assertOwnership(userId, eventId);
		if (!(await this.repository.deleteForEvent(eventId, couponId))) throw new CouponNotFound();
	}

	/** Cupom é do evento, e o evento é de um organizador: sem posse, sem acesso. */
	private async assertOwnership(userId: string, eventId: string) {
		if (!(await this.repository.ownsEvent(userId, eventId))) throw new EventNotOwned();
	}
}
