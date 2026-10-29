export class CouponNotFound extends Error {
}
export class CouponNotStarted extends Error {
}
export class CouponExpired extends Error {
}
export class CouponExhausted extends Error {
}
export class TicketNotInEvent extends Error {
}
export class EventNotOwned extends Error {
}
export class CouponConflict extends Error {
}
/** Reais com dois decimais, como o resto do cálculo de pagamento. */
const money = (value) => Math.round(value * 100) / 100;
/** O código é digitado pela pessoa: espaços e caixa não devem derrubar a busca. */
export const normalizeCode = (code) => code.trim().toUpperCase();
/** Um cupom nunca abate mais do que o subtotal — o total não fica negativo. */
function discountFor(coupon, subtotal) {
    const value = Number(coupon.discount_value);
    const raw = coupon.discount_type === 'percentage' ? subtotal * (value / 100) : value;
    return money(Math.min(Math.max(raw, 0), subtotal));
}
export class CouponService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async validate(input, now = new Date()) {
        const coupon = await this.repository.findActiveByCode(input.eventId, normalizeCode(input.code));
        if (!coupon)
            throw new CouponNotFound();
        if (coupon.starts_at && new Date(coupon.starts_at) > now)
            throw new CouponNotStarted();
        if (coupon.expires_at && new Date(coupon.expires_at) <= now)
            throw new CouponExpired();
        if (coupon.max_uses !== null && coupon.uses >= coupon.max_uses)
            throw new CouponExhausted();
        const discount = discountFor(coupon, input.subtotal);
        return { code: coupon.code, discount, subtotal: input.subtotal, total: money(input.subtotal - discount) };
    }
    /**
     * Aplica o cupom ao carrinho. O subtotal é montado com os preços gravados
     * para o evento: nada de valor vindo do navegador entra nessa conta.
     */
    async apply(input, now = new Date()) {
        const ticketIds = [...new Set(input.items.map((item) => item.ticketId))];
        const prices = await this.repository.findTicketPrices(input.eventId, ticketIds);
        const subtotal = money(input.items.reduce((total, item) => {
            const ticket = prices.find((price) => price.id === item.ticketId);
            if (!ticket)
                throw new TicketNotInEvent();
            return total + Number(ticket.buyer_price ?? ticket.price) * item.quantity;
        }, 0));
        return this.validate({ code: input.code, eventId: input.eventId, subtotal }, now);
    }
    async listForEvent(userId, eventId) {
        await this.assertOwnership(userId, eventId);
        return this.repository.listByEvent(eventId);
    }
    async create(userId, eventId, input) {
        await this.assertOwnership(userId, eventId);
        return this.repository.createForEvent(eventId, input);
    }
    async update(userId, eventId, couponId, input) {
        await this.assertOwnership(userId, eventId);
        const coupon = await this.repository.updateForEvent(eventId, couponId, input);
        if (!coupon)
            throw new CouponNotFound();
        return coupon;
    }
    async remove(userId, eventId, couponId) {
        await this.assertOwnership(userId, eventId);
        if (!(await this.repository.deleteForEvent(eventId, couponId)))
            throw new CouponNotFound();
    }
    /** Cupom é do evento, e o evento é de um organizador: sem posse, sem acesso. */
    async assertOwnership(userId, eventId) {
        if (!(await this.repository.ownsEvent(userId, eventId)))
            throw new EventNotOwned();
    }
}
//# sourceMappingURL=coupon-service.js.map