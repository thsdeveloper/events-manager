export type PaymentProvider = 'mock' | 'abacatepay';
export type CheckoutMethod = 'PIX' | 'CARD';

export interface CreateProductInput {
	externalId: string;
	name: string;
	description?: string;
	priceInCents: number;
}

export interface PaymentProduct {
	id: string;
	externalId: string;
}

export interface CreateCheckoutInput {
	externalId: string;
	items: Array<{ productId: string; quantity: number }>;
	methods: CheckoutMethod[];
	returnUrl: string;
	completionUrl: string;
	metadata: Record<string, string>;
}

export interface PaymentCheckout {
	id: string;
	url: string;
	amountInCents: number;
}

export type PaymentCheckoutStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';

export interface PaymentCheckoutState {
	id: string;
	externalId: string | null;
	status: PaymentCheckoutStatus;
	amountInCents: number;
	paidAmountInCents: number | null;
}

export interface CreatePixInput {
	externalId: string;
	amountInCents: number;
	description: string;
	pixKey: string;
	pixKeyType: 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM';
}

export interface PixTransfer {
	id: string;
	status: string;
	receiptUrl: string | null;
	providerFeeInCents: number;
}

export interface PixCharge {
	id: string;
	copyPasteCode: string;
	qrCodeBase64: string | null;
	expiresAt: string | null;
}

export interface PixChargeState {
	id: string;
	status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
	expiresAt: string | null;
}

export interface PaymentGateway {
	readonly provider: PaymentProvider;
	createProduct(input: CreateProductInput): Promise<PaymentProduct>;
	createCheckout(input: CreateCheckoutInput): Promise<PaymentCheckout>;
	getCheckout(checkoutId: string): Promise<PaymentCheckoutState>;
	createPixCharge(input: {
		externalId: string;
		amountInCents: number;
		description: string;
		expiresInSeconds: number;
		customer: { name: string; email: string; taxId?: string; cellphone?: string };
		metadata: Record<string, string>;
	}): Promise<PixCharge>;
	getPixCharge(chargeId: string): Promise<PixChargeState>;
	sendPix(input: CreatePixInput): Promise<PixTransfer>;
}
