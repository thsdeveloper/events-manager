import type {
	ReceivingAccountOverview,
	ReceivingDocument,
	ReceivingDocumentKind,
	ReceivingReview,
	ReceivingSubmission,
} from '@events-manager/contracts';
import { hasValidFileSignature } from '../media/media-service.js';
import { ApiError } from '../../shared/errors.js';
export interface ReceivingOrganizer {
	id: string;
	user_id: string | null;
	name: string;
	document: string | null;
	status: string;
}
export interface PrivateReceivingDocument extends ReceivingDocument {
	organizer_id: string;
	storage_path: string;
}
export interface ReceivingAccountRepository {
	organizer(id: string): Promise<ReceivingOrganizer | null>;
	overview(id: string, page: number, limit: number): Promise<ReceivingAccountOverview>;
	submit(id: string, actor: string, input: ReceivingSubmission): Promise<unknown>;
	review(id: string, requestId: string, actor: string, input: ReceivingReview): Promise<unknown>;
	storeDocument(input: {
		id: string;
		organizerId: string;
		actor: string;
		kind: ReceivingDocumentKind;
		filename: string;
		mimetype: string;
		buffer: Buffer;
	}): Promise<ReceivingDocument>;
	document(organizerId: string, id: string): Promise<PrivateReceivingDocument | null>;
	download(path: string): Promise<Buffer>;
}
export class ReceivingAccountService {
	constructor(private readonly repository: ReceivingAccountRepository) {}
	async owner(id: string, userId: string) {
		const organizer = await this.repository.organizer(id);
		if (!organizer) throw new ApiError('Organização não encontrada.', 404, 'ORGANIZER_NOT_FOUND');
		if (organizer.user_id !== userId)
			throw new ApiError('Esta organização não pertence à sua conta.', 403, 'ORGANIZER_FORBIDDEN');
		if (organizer.status === 'archived')
			throw new ApiError('Esta organização está arquivada.', 403, 'ORGANIZER_ARCHIVED');
		return organizer;
	}
	async overview(id: string, page: number, limit: number) {
		if (!(await this.repository.organizer(id)))
			throw new ApiError('Organização não encontrada.', 404, 'ORGANIZER_NOT_FOUND');
		return this.repository.overview(id, page, limit);
	}
	async submit(organizer: ReceivingOrganizer, actor: string, input: ReceivingSubmission) {
		if (input.account.holder_document !== organizer.document?.replace(/\D/g, ''))
			throw new ApiError(
				'A conta de recebimento deve pertencer ao mesmo CPF ou CNPJ da organização.',
				422,
				'ACCOUNT_HOLDER_MISMATCH',
			);
		return this.repository.submit(organizer.id, actor, input);
	}
	review(id: string, requestId: string, actor: string, input: ReceivingReview) {
		return this.repository.review(id, requestId, actor, input);
	}
	async upload(
		organizerId: string,
		actor: string,
		kind: ReceivingDocumentKind,
		file: { buffer: Buffer; filename: string; mimetype: string },
	) {
		if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.mimetype))
			throw new ApiError('Envie um PDF, JPG ou PNG.', 422, 'INVALID_FILE_TYPE');
		if (file.buffer.length > 10 * 1024 * 1024)
			throw new ApiError('Cada documento pode ter até 10 MB.', 413, 'FILE_TOO_LARGE');
		if (!hasValidFileSignature(file.mimetype, file.buffer))
			throw new ApiError('O conteúdo não corresponde ao formato do documento.', 422, 'INVALID_FILE_CONTENT');
		const filename = file.filename.replace(/[\x00-\x1f\x7f/\\"]/g, '_').slice(0, 180) || 'documento';
		return this.repository.storeDocument({ ...file, filename, id: crypto.randomUUID(), organizerId, actor, kind });
	}
	async download(organizerId: string, id: string) {
		const document = await this.repository.document(organizerId, id);
		if (!document || document.organizer_id !== organizerId)
			throw new ApiError('Documento não encontrado.', 404, 'DOCUMENT_NOT_FOUND');
		return { document, buffer: await this.repository.download(document.storage_path) };
	}
}
