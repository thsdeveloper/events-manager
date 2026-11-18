import { expect, it } from 'vitest';
import { transparentCheckoutSchema, checkoutQuoteSchema } from './transparent-checkout.js';
const cart = {
	eventId: '00000000-0000-4000-8000-000000000001',
	tickets: [{ ticketId: '00000000-0000-4000-8000-000000000002', quantity: 1 }],
	participantInfo: { name: 'Ana Silva', email: 'ana@example.test' },
};
const input = {
	...cart,
	requestId: '00000000-0000-4000-8000-000000000003',
	paymentMethod: 'PIX',
	expectedAmountInCents: 10000,
};
it('accepts a Pix purchase without card data', () =>
	expect(transparentCheckoutSchema.parse(input)).toMatchObject(input));
it.each(['amount', 'userId', 'cardToken', 'cardNumber', 'cvv'])('rejects untrusted or sensitive field %s', (field) =>
	expect(transparentCheckoutSchema.safeParse({ ...input, [field]: 'forbidden' }).success).toBe(false),
);
it('requires short-lived token, taxpayer id and phone for paid credit', () => {
	expect(transparentCheckoutSchema.safeParse({ ...input, paymentMethod: 'CARD' }).success).toBe(false);
	expect(
		transparentCheckoutSchema.safeParse({
			...input,
			paymentMethod: 'CARD',
			token: 'ctok_example',
			participantInfo: { ...cart.participantInfo, document: '52998224725', phone: '11999999999' },
		}).success,
	).toBe(true);
});
it('requires taxpayer id for boleto and rejects repeated ticket selections', () => {
	expect(transparentCheckoutSchema.safeParse({ ...input, paymentMethod: 'BOLETO' }).success).toBe(false);
	expect(checkoutQuoteSchema.safeParse({ ...cart, tickets: [...cart.tickets, ...cart.tickets] }).success).toBe(false);
});
it('accepts a free checkout without a card token or document', () =>
	expect(
		transparentCheckoutSchema.safeParse({ ...input, paymentMethod: 'CARD', expectedAmountInCents: 0 }).success,
	).toBe(true));
it('rejects card tokens on Pix, installments on boleto and excessive carts', () => {
	expect(transparentCheckoutSchema.safeParse({ ...input, token: 'ctok_123' }).success).toBe(false);
	expect(transparentCheckoutSchema.safeParse({ ...input, paymentMethod: 'BOLETO', installments: 2 }).success).toBe(
		false,
	);
	expect(checkoutQuoteSchema.safeParse({ ...cart, tickets: [{ ...cart.tickets[0], quantity: 101 }] }).success).toBe(
		false,
	);
});
