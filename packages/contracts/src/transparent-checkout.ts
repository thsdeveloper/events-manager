import { z } from 'zod';
import { brDocumentSchema, brPhoneSchema } from './schemas.js';
import { checkoutTicketSelectionSchema } from './tickets.js';

const cartFields = {
	eventId: z.string().uuid(),
	tickets: z
		.array(checkoutTicketSelectionSchema)
		.min(1)
		.max(50)
		.refine(
			(items) => items.reduce((total, item) => total + item.quantity, 0) <= 100,
			'Compre no máximo 100 ingressos por pedido.',
		)
		.refine(
			(items) => new Set(items.map((item) => item.ticketId)).size === items.length,
			'Não repita o mesmo ingresso no carrinho.',
		),
	couponCode: z.string().trim().min(1).max(32).optional(),
	participantInfo: z
		.object({
			name: z.string().trim().min(2).max(150),
			email: z.string().trim().email().max(150),
			phone: brPhoneSchema.optional(),
			document: brDocumentSchema.optional(),
		})
		.strict(),
};
export const checkoutQuoteSchema = z.object(cartFields).strict();
export const transparentCheckoutSchema = z
	.object({
		...cartFields,
		requestId: z.string().uuid(),
		paymentMethod: z.enum(['PIX', 'CARD', 'BOLETO']).default('PIX'),
		expectedAmountInCents: z.number().int().min(0).max(100_000_000),
		installments: z.number().int().min(1).max(12).default(1),
		token: z
			.string()
			.regex(/^ctok_[A-Za-z0-9_-]+$/, 'Token de cartão inválido.')
			.max(512)
			.optional(),
	})
	.strict()
	.superRefine((value, ctx) => {
		if (value.paymentMethod !== 'CARD' && (value.token || value.installments !== 1))
			ctx.addIssue({ code: 'custom', path: ['paymentMethod'], message: 'Parcelas e token são exclusivos do cartão.' });
		if (value.expectedAmountInCents === 0) return;
		if (value.paymentMethod === 'CARD' && !value.token)
			ctx.addIssue({ code: 'custom', path: ['token'], message: 'Preencha o cartão no formulário seguro.' });
		if (value.paymentMethod !== 'PIX' && !value.participantInfo.document)
			ctx.addIssue({
				code: 'custom',
				path: ['participantInfo', 'document'],
				message: 'Informe o CPF ou CNPJ do comprador.',
			});
		if (value.paymentMethod === 'CARD' && !value.participantInfo.phone)
			ctx.addIssue({ code: 'custom', path: ['participantInfo', 'phone'], message: 'Informe o celular do comprador.' });
	});
export type CheckoutQuoteInput = z.infer<typeof checkoutQuoteSchema>;
export type TransparentCheckoutInput = z.infer<typeof transparentCheckoutSchema>;
export interface CheckoutQuote {
	amountInCents: number;
	items?: Array<{ id: string; title: string; quantity: number; unitPrice: number; unitFee: number }>;
	discountInCents?: number;
	maxInstallments: number;
	methods: Array<'PIX' | 'CARD' | 'BOLETO'>;
	publicKey: string | null;
	mock?: boolean;
}
export interface TransparentPayment {
	/** Confirmação local de sandbox; não representa liquidação no provedor. */
	developmentSimulation?: boolean;
	id: string;
	method: 'PIX' | 'CARD' | 'BOLETO';
	status: string;
	amountInCents: number;
	copyPasteCode: string | null;
	qrCodeBase64: string | null;
	barcode: string | null;
	boletoUrl: string | null;
	expiresAt: string | null;
}
export interface TransparentCheckoutResult {
	attemptId: string;
	/** Disponibilidade calculada pela API para uma cobrança pendente no ambiente de testes. */
	canSimulatePayment?: boolean;
	status: 'processing' | 'pending' | 'confirmed' | 'failed' | 'cancelled' | 'refunded' | 'disputed';
	payment: TransparentPayment | null;
	registrationId?: string;
	confirmationUrl?: string;
	message?: string;
}
