import type {
	CreateCheckoutInput,
	CreatePixInput,
	CreateProductInput,
	PaymentCheckoutState,
	PaymentGateway,
	PixChargeState,
} from '../../application/payments/payment-gateway.js';

export class MockPaymentGateway implements PaymentGateway {
	readonly provider = 'mock' as const;

	async createProduct(input: CreateProductInput) {
		return { id: `mock_product_${input.externalId}`, externalId: input.externalId };
	}

	async createCheckout(input: CreateCheckoutInput) {
		return { id: `mock_checkout_${input.externalId}`, url: input.completionUrl, amountInCents: 0 };
	}

	async getCheckout(checkoutId: string): Promise<PaymentCheckoutState> {
		return {
			id: checkoutId,
			externalId: checkoutId.replace(/^mock_checkout_/, ''),
			status: 'PAID' as const,
			amountInCents: 0,
			paidAmountInCents: 0,
		};
	}

	async createPixCharge(input: {
		externalId: string;
		amountInCents: number;
		description: string;
		expiresInSeconds: number;
		customer: { name: string; email: string; taxId?: string; cellphone?: string };
		metadata: Record<string, string>;
	}) {
		return {
			id: `mock_pix_${input.externalId}`,
			copyPasteCode: `00020126EVENTSMANAGER${input.externalId}`,
			qrCodeBase64: null,
			expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString(),
		};
	}

	async getPixCharge(chargeId: string): Promise<PixChargeState> {
		return { id: chargeId, status: 'PAID', expiresAt: null };
	}

	async sendPix(input: CreatePixInput) {
		return {
			id: `mock_transfer_${input.externalId}`,
			status: 'COMPLETE',
			receiptUrl: null,
			providerFeeInCents: 0,
		};
	}
}
