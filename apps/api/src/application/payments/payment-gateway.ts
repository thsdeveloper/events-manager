import type { TransparentPayment } from '@events-manager/contracts';
export type PaymentProvider = 'mock' | 'abacatepay';
export type CheckoutMethod = 'PIX' | 'CARD' | 'BOLETO';

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
	/** Cliente já cadastrado no provedor; a página hospedada chega preenchida. */
	customerId?: string;
	/** Parcelas que a página hospedada pode oferecer no cartão (2 a 12). */
	cardMaxInstallments?: number;
}

export interface CreateCustomerInput {
	name: string;
	email: string;
	taxId?: string;
	cellphone?: string;
}

export interface PaymentCustomer {
	id: string;
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
	/** Comprovante do provedor; preenchido depois do pagamento. */
	receiptUrl: string | null;
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

export interface PaymentRefund {
	refundId: string;
}

export interface PaymentGateway {
	createTransparentCharge(input: CreateTransparentInput): Promise<TransparentCharge>;
	findTransparentCharge(
		lookup: { id: string } | { attemptId: string; createdAt: string },
	): Promise<TransparentCharge | null>;
	readonly provider: PaymentProvider;
	createProduct(input: CreateProductInput): Promise<PaymentProduct>;
	/** Cria ou devolve o cliente existente (o provedor deduplica por CPF/CNPJ). */
	createCustomer(input: CreateCustomerInput): Promise<PaymentCustomer>;
	createCheckout(input: CreateCheckoutInput): Promise<PaymentCheckout>;
	getCheckout(checkoutId: string): Promise<PaymentCheckoutState>;
	/** Reembolso integral de um checkout hospedado pago; o provedor não parcela estornos. */
	refundCheckout(checkoutId: string, reason?: string): Promise<PaymentRefund>;
	/** Reembolso integral de uma cobrança PIX transparente paga (uma parcela). */
	refundPixCharge(chargeId: string, reason?: string): Promise<PaymentRefund>;
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

export interface TransparentCharge extends TransparentPayment {
	providerUpdatedAt?: string;
	providerFeeInCents: number | null;
	devMode: boolean;
	receiptUrl: string | null;
	metadata: Record<string, string>;
}
export interface CreateTransparentInput {
	method: CheckoutMethod;
	externalId: string;
	amountInCents: number;
	description: string;
	customer: CreateCustomerInput;
	metadata: Record<string, string>;
	token?: string;
	installments?: number;
}
