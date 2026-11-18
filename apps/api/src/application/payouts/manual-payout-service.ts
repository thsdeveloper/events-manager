import { ApiError } from '../../shared/errors.js';
import { hasValidFileSignature } from '../media/media-service.js';
export interface ManualPayoutRecord extends Record<string, unknown> {
	id: string;
	organizer_id: string;
	provider: string;
	status: string;
	receipt_document_id: string | null;
}
export interface PayoutReceipt {
	id: string;
	payout_id: string;
	filename: string;
	mime_type: string;
	storage_path: string;
}
export interface ManualPayoutRepository {
	list(organizerId: string, page: number, limit: number): Promise<{ data: ManualPayoutRecord[]; total: number }>;
	payout(id: string): Promise<ManualPayoutRecord | null>;
	storeReceipt(input: {
		id: string;
		payoutId: string;
		actor: string;
		filename: string;
		mimetype: string;
		buffer: Buffer;
	}): Promise<{ id: string; filename: string }>;
	receipt(id: string): Promise<PayoutReceipt | null>;
	download(path: string): Promise<Buffer>;
	finish(
		id: string,
		actor: string,
		receiptId: string | null,
		reference: string | null,
		cancelReason: string | null,
	): Promise<unknown>;
}
export class ManualPayoutService {
	constructor(private readonly repository: ManualPayoutRepository) {}
	async list(organizerId: string, page: number, limit: number) {
		const result = await this.repository.list(organizerId, page, limit);
		return {
			data: result.data,
			pagination: { page, limit, total: result.total, pageCount: Math.ceil(result.total / limit) },
		};
	}
	async upload(id: string, actor: string, file: { filename: string; mimetype: string; buffer: Buffer }) {
		const payout = await this.repository.payout(id);
		if (!payout || payout.provider !== 'manual' || payout.status !== 'pending')
			throw new ApiError('Este repasse não aguarda uma transferência manual.', 409, 'MANUAL_PAYOUT_CHANGED');
		if (
			!['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype) ||
			!hasValidFileSignature(file.mimetype, file.buffer)
		)
			throw new ApiError('Envie um comprovante válido em PDF, JPG ou PNG.', 422, 'INVALID_FILE_CONTENT');
		if (file.buffer.length > 10 * 1024 * 1024)
			throw new ApiError('O comprovante pode ter até 10 MB.', 413, 'FILE_TOO_LARGE');
		return this.repository.storeReceipt({
			...file,
			id: crypto.randomUUID(),
			payoutId: id,
			actor,
			filename: file.filename.replace(/[\x00-\x1f\x7f/\\"]/g, '_').slice(0, 180) || 'comprovante',
		});
	}
	finish(id: string, actor: string, receiptId: string | null, reference: string | null, cancelReason: string | null) {
		return this.repository.finish(id, actor, receiptId, reference, cancelReason);
	}
	async download(organizerId: string, payoutId: string) {
		const payout = await this.repository.payout(payoutId);
		if (!payout || payout.organizer_id !== organizerId || !payout.receipt_document_id)
			throw new ApiError('Comprovante não encontrado.', 404, 'RECEIPT_NOT_FOUND');
		const receipt = await this.repository.receipt(payout.receipt_document_id);
		if (!receipt || receipt.payout_id !== payout.id)
			throw new ApiError('Comprovante não encontrado.', 404, 'RECEIPT_NOT_FOUND');
		return { receipt, buffer: await this.repository.download(receipt.storage_path) };
	}
}
