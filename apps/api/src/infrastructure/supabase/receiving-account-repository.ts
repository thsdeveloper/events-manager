import type {
	ReceivingAccountOverview,
	ReceivingDocumentKind,
	ReceivingReview,
	ReceivingSubmission,
} from '@events-manager/contracts';
import type {
	PrivateReceivingDocument,
	ReceivingAccountRepository,
	ReceivingOrganizer,
} from '../../application/receiving-accounts/receiving-account-service.js';
import { ApiError } from '../../shared/errors.js';
import type { SupabaseClients } from './clients.js';
export const RECEIVING_BUCKET = 'organizer-verification';
export function receivingError(error: { message: string } | null) {
	if (!error) return;
	const errors: Record<string, [number, string]> = {
		RECEIPT_REQUIRED: [422, 'Anexe um comprovante válido e informe a referência da transferência.'],
		ORGANIZER_NOT_FOUND: [404, 'Organização não encontrada.'],
		ORGANIZER_FORBIDDEN: [403, 'Você não pode alterar esta organização.'],
		RECEIVING_REQUEST_CHANGED: [409, 'Os dados mudaram desde sua consulta. Atualize a página antes de continuar.'],
		RECEIVING_DOCUMENTS_REQUIRED: [
			422,
			'Envie o documento do responsável, o comprovante de titularidade e, para CNPJ, o comprovante da empresa.',
		],
		ACCOUNT_HOLDER_MISMATCH: [422, 'A conta deve pertencer ao CPF/CNPJ da organização.'],
		RECEIVING_REVIEW_FORBIDDEN: [403, 'Você não tem permissão para analisar os dados de recebimento.'],
		ORGANIZER_ARCHIVED: [409, 'Reative a organização antes de analisar os dados de recebimento.'],
		PAYOUT_ACCOUNT_DISABLED: [422, 'Os dados de recebimento precisam estar aprovados para criar um repasse.'],
		MANUAL_PAYOUT_CHANGED: [409, 'Este repasse já foi concluído ou cancelado. Atualize a página.'],
	};
	const code = Object.keys(errors).find((key) => error.message.includes(key));
	if (code) throw new ApiError(errors[code][1], errors[code][0], code);
	throw error;
}
export class SupabaseReceivingAccountRepository implements ReceivingAccountRepository {
	constructor(private readonly clients: SupabaseClients) {}
	async organizer(id: string) {
		const { data, error } = await this.clients.admin
			.from('organizers')
			.select('id,user_id,name,document,status')
			.eq('id', id)
			.maybeSingle();
		receivingError(error);
		return data as ReceivingOrganizer | null;
	}
	async overview(id: string, page: number, limit: number) {
		const { data, error } = await this.clients.admin.rpc('get_receiving_account_overview', {
			target_organizer: id,
			target_page: page,
			target_limit: limit,
		});
		receivingError(error);
		return data as ReceivingAccountOverview;
	}
	async submit(id: string, actor: string, input: ReceivingSubmission) {
		const { data, error } = await this.clients.admin.rpc('submit_receiving_account', {
			target_organizer: id,
			target_actor: actor,
			target_account: input.account,
			target_document_ids: input.document_ids,
			target_expected_request: input.expected_request_id,
		});
		receivingError(error);
		return data;
	}
	async review(id: string, requestId: string, actor: string, input: ReceivingReview) {
		const { data, error } = await this.clients.admin.rpc('review_receiving_account', {
			target_organizer: id,
			target_request: requestId,
			target_actor: actor,
			target_decision: input.decision,
			target_reason: input.reason,
		});
		receivingError(error);
		return data;
	}
	async storeDocument(input: {
		id: string;
		organizerId: string;
		actor: string;
		kind: ReceivingDocumentKind;
		filename: string;
		mimetype: string;
		buffer: Buffer;
	}) {
		const path = `${input.organizerId}/${input.id}`;
		const bucket = this.clients.admin.storage.from(RECEIVING_BUCKET);
		const uploaded = await bucket.upload(path, input.buffer, { contentType: input.mimetype, upsert: false });
		receivingError(uploaded.error);
		const { data, error } = await this.clients.admin
			.from('organizer_receiving_documents')
			.insert({
				id: input.id,
				organizer_id: input.organizerId,
				uploaded_by: input.actor,
				kind: input.kind,
				filename: input.filename,
				mime_type: input.mimetype,
				size: input.buffer.length,
				storage_path: path,
			})
			.select('id,kind,filename,mime_type,size,uploaded_at')
			.single();
		if (error) {
			await bucket.remove([path]);
			receivingError(error);
		}
		if (!data) throw new Error('Document persistence failed');
		return data;
	}
	async document(organizerId: string, id: string) {
		const { data, error } = await this.clients.admin
			.from('organizer_receiving_documents')
			.select('*')
			.eq('id', id)
			.eq('organizer_id', organizerId)
			.maybeSingle();
		receivingError(error);
		return data as PrivateReceivingDocument | null;
	}
	async download(path: string) {
		const { data, error } = await this.clients.admin.storage.from(RECEIVING_BUCKET).download(path);
		receivingError(error);
		if (!data) throw new ApiError('Documento não encontrado.', 404, 'DOCUMENT_NOT_FOUND');
		return Buffer.from(await data.arrayBuffer());
	}
}
