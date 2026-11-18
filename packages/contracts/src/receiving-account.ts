import { z } from 'zod';
import { brDocumentSchema, cpfSchema, cnpjSchema } from './schemas.js';

export const receivingDocumentKindSchema = z.enum([
	'representative_identity',
	'company_registration',
	'account_ownership',
]);
export const receivingDocumentKinds = receivingDocumentKindSchema.options;
export const receivingDocumentLabels: Record<z.infer<typeof receivingDocumentKindSchema>, string> = {
	representative_identity: 'Documento do responsável',
	company_registration: 'Comprovante da empresa',
	account_ownership: 'Comprovante de titularidade da conta',
};
const holder = { holder_name: z.string().trim().min(3).max(160), holder_document: brDocumentSchema };
const pixTypes = z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM']);
const validators = {
	CPF: cpfSchema,
	CNPJ: cnpjSchema,
	EMAIL: z.string().email(),
	PHONE: z.string().regex(/^\+[1-9]\d{7,14}$/),
	RANDOM: z.string().uuid(),
};
export const receivingAccountSchema = z
	.discriminatedUnion('method', [
		z
			.object({
				...holder,
				method: z.literal('pix'),
				pix_key_type: pixTypes,
				pix_key: z.string().trim().min(3).max(254),
			})
			.strict(),
		z
			.object({
				...holder,
				method: z.literal('bank_transfer'),
				bank_code: z.string().regex(/^\d{3}$/, 'Informe o código de 3 dígitos do banco.'),
				bank_name: z.string().trim().min(2).max(100),
				branch: z.string().regex(/^\d{1,6}$/),
				branch_digit: z
					.string()
					.regex(/^[\dXx]{0,2}$/)
					.default(''),
				account_number: z.string().regex(/^\d{1,20}$/),
				account_digit: z.string().regex(/^[\dXx]{1,2}$/),
				account_type: z.enum(['checking', 'savings']),
			})
			.strict(),
	])
	.superRefine((input, ctx) => {
		if (input.method === 'pix' && !validators[input.pix_key_type].safeParse(input.pix_key).success)
			ctx.addIssue({
				code: 'custom',
				path: ['pix_key'],
				message: 'Informe uma chave PIX válida para o tipo escolhido.',
			});
	})
	.transform((input) =>
		input.method === 'pix' && ['CPF', 'CNPJ'].includes(input.pix_key_type)
			? { ...input, pix_key: input.pix_key.replace(/\D/g, '') }
			: input,
	);
export const receivingAccountSubmissionSchema = z
	.object({
		account: receivingAccountSchema,
		document_ids: z
			.array(z.string().uuid())
			.min(2)
			.max(3)
			.refine((ids) => new Set(ids).size === ids.length, 'Envie documentos distintos.'),
		expected_request_id: z.string().uuid().nullable(),
		confirm_ownership: z.literal(true, { message: 'Confirme a titularidade e a veracidade dos documentos.' }),
	})
	.strict();
export const receivingAccountReviewSchema = z
	.object({
		decision: z.enum(['approved', 'rejected']),
		reason: z.string().trim().min(5).max(2000),
		documents_checked: z.literal(true),
	})
	.strict();
export const receivingHistoryQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type ReceivingAccount = z.infer<typeof receivingAccountSchema>;
export type ReceivingSubmission = z.infer<typeof receivingAccountSubmissionSchema>;
export type ReceivingReview = z.infer<typeof receivingAccountReviewSchema>;
export type ReceivingDocumentKind = z.infer<typeof receivingDocumentKindSchema>;
export interface ReceivingDocument {
	id: string;
	kind: ReceivingDocumentKind;
	filename: string;
	mime_type: string;
	size: number;
	uploaded_at: string;
}
export interface ReceivingRequest {
	id: string;
	organizer_id: string;
	version: number;
	account: ReceivingAccount;
	status: 'pending' | 'approved' | 'rejected' | 'superseded' | 'legacy';
	submitted_at: string;
	reviewed_at: string | null;
	review_reason: string | null;
	reviewer_name: string | null;
	documents: ReceivingDocument[];
}
export interface ReceivingAccountOverview {
	organizer: {
		id: string;
		name: string;
		document: string | null;
		status: string;
		payout_status: string;
		production_approved_at: string | null;
		current_receiving_request_id: string | null;
	};
	current: ReceivingRequest | null;
	history: ReceivingRequest[];
	pagination: { page: number; limit: number; total: number; pageCount: number };
}
