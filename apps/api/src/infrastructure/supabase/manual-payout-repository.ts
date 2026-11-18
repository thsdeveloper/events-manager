import type {
	ManualPayoutRecord,
	ManualPayoutRepository,
	PayoutReceipt,
} from '../../application/payouts/manual-payout-service.js';
import type { SupabaseClients } from './clients.js';
import { receivingError, RECEIVING_BUCKET } from './receiving-account-repository.js';
export class SupabaseManualPayoutRepository implements ManualPayoutRepository {
	constructor(private readonly clients: SupabaseClients) {}
	async list(organizerId: string, page: number, limit: number) {
		const { data, error, count } = await this.clients.admin
			.from('organizer_payouts')
			.select(
				'id,organizer_id,provider,method,status,amount,net_amount,bank_account,bank_reference,requested_at,processed_at,receipt_document_id,failure_reason',
				{ count: 'exact' },
			)
			.eq('organizer_id', organizerId)
			.eq('method', 'bank_transfer')
			.order('requested_at', { ascending: false })
			.range((page - 1) * limit, page * limit - 1);
		receivingError(error);
		return { data: (data ?? []) as ManualPayoutRecord[], total: count ?? 0 };
	}
	async payout(id: string) {
		const { data, error } = await this.clients.admin.from('organizer_payouts').select('*').eq('id', id).maybeSingle();
		receivingError(error);
		return data as ManualPayoutRecord | null;
	}
	async storeReceipt(input: {
		id: string;
		payoutId: string;
		actor: string;
		filename: string;
		mimetype: string;
		buffer: Buffer;
	}) {
		const path = `payouts/${input.payoutId}/${input.id}`,
			bucket = this.clients.admin.storage.from(RECEIVING_BUCKET);
		const result = await bucket.upload(path, input.buffer, { contentType: input.mimetype, upsert: false });
		receivingError(result.error);
		const { data, error } = await this.clients.admin
			.from('organizer_payout_receipts')
			.insert({
				id: input.id,
				payout_id: input.payoutId,
				uploaded_by: input.actor,
				filename: input.filename,
				mime_type: input.mimetype,
				size: input.buffer.length,
				storage_path: path,
			})
			.select('id,filename')
			.single();
		if (error) {
			await bucket.remove([path]);
			receivingError(error);
		}
		if (!data) throw new Error('Receipt persistence failed');
		return data;
	}
	async receipt(id: string) {
		const { data, error } = await this.clients.admin
			.from('organizer_payout_receipts')
			.select('*')
			.eq('id', id)
			.maybeSingle();
		receivingError(error);
		return data as PayoutReceipt | null;
	}
	async download(path: string) {
		const { data, error } = await this.clients.admin.storage.from(RECEIVING_BUCKET).download(path);
		receivingError(error);
		if (!data) throw new Error('Receipt storage unavailable');
		return Buffer.from(await data.arrayBuffer());
	}
	async finish(
		id: string,
		actor: string,
		receiptId: string | null,
		reference: string | null,
		cancelReason: string | null,
	) {
		const { data, error } = await this.clients.admin.rpc('finish_manual_payout', {
			target_payout: id,
			target_actor: actor,
			target_receipt: receiptId,
			target_reference: reference,
			target_cancel_reason: cancelReason,
		});
		receivingError(error);
		return data;
	}
}
