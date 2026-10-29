import { calculatePlatformFee } from './fees.js';
export class CheckoutRuleViolation extends Error {
    rule;
    details;
    constructor(rule, details = {}) {
        super(rule);
        this.rule = rule;
        this.details = details;
        this.name = 'CheckoutRuleViolation';
    }
}
const money = (value) => Math.round(value * 100) / 100;
export function buildCheckoutPlan({ configuration, now = new Date(), registrationWindow, selections, tickets, }) {
    assertRegistrationOpen(registrationWindow, now);
    const ticketsById = new Map(tickets.map((ticket) => [ticket.id, ticket]));
    const selectedTicketIds = new Set();
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
        const platformFee = calculatePlatformFee(baseAmount, configuration);
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
export function assertRegistrationOpen(window, now = new Date()) {
    if (!window)
        return;
    if (window.start && new Date(window.start) > now)
        throw new CheckoutRuleViolation('registration_closed');
    if (window.end && new Date(window.end) < now)
        throw new CheckoutRuleViolation('registration_closed');
}
export function assertTicketAvailable(ticket, quantity, now = new Date()) {
    if (ticket.status !== 'active' ||
        ticket.visibility !== 'public' ||
        (ticket.saleStartDate && new Date(ticket.saleStartDate) > now) ||
        (ticket.saleEndDate && new Date(ticket.saleEndDate) < now)) {
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
export function applyDiscountToPlan(plan, discount) {
    const cents = plan.map((item) => Math.round(item.totalAmount * 100));
    const cartCents = cents.reduce((total, value) => total + value, 0);
    const discountCents = Math.min(Math.max(Math.round(discount * 100), 0), cartCents);
    const withDiscount = plan.map((item) => ({ ...item, discount: 0 }));
    if (discountCents === 0 || cartCents === 0)
        return withDiscount;
    const shares = cents.map((value) => Math.floor((discountCents * value) / cartCents));
    // A divisão inteira sempre sobra: devolve cada centavo restante ao item com o
    // maior resto, que é quem foi mais prejudicado pelo arredondamento para baixo.
    const remainders = cents
        .map((value, index) => ({ index, remainder: (discountCents * value) % cartCents }))
        .sort((left, right) => right.remainder - left.remainder);
    let leftover = discountCents - shares.reduce((total, value) => total + value, 0);
    for (const { index } of remainders) {
        if (leftover <= 0)
            break;
        if (shares[index] >= cents[index])
            continue;
        shares[index] += 1;
        leftover -= 1;
    }
    return withDiscount.map((item, index) => ({
        ...item,
        discount: money(shares[index] / 100),
        totalAmount: money((cents[index] - shares[index]) / 100),
    }));
}
//# sourceMappingURL=checkout-plan.js.map