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
//# sourceMappingURL=checkout-plan.js.map