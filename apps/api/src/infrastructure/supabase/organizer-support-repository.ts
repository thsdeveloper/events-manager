import type {
	Json,
	OrganizerAdminList,
	OrganizerAdminQuery,
	OrganizerAdminUpdate,
	OrganizerRecordQuery,
	OrganizerSupportDetail,
	OrganizerSupportRecords,
} from '@events-manager/contracts';
import type { OrganizerSupportRepository } from '../../application/super-admin/organizer-support-service.js';
import type { AuditContext } from '../../application/super-admin/super-admin-service.js';
import type { SupabaseClients } from './clients.js';
import { ApiError } from '../../shared/errors.js';

function checkError(error: { message: string } | null) {
	if (!error) return;
	const errors: Record<string, [number, string]> = {
		ORGANIZER_NOT_FOUND: [404, 'Organizador não encontrado.'],
		PIX_REVIEW_CHANGED: [409, 'A chave PIX mudou desde sua consulta. Atualize a página e confira a nova chave.'],
		PAYOUT_ACCOUNT_INVALID: [422, 'Informe uma chave PIX válida e ative a conta antes de aprovar os repasses.'],
	};
	const code = Object.keys(errors).find((key) => error.message.includes(key));
	if (code) throw new ApiError(errors[code][1], errors[code][0], code);
	throw error;
}
export class SupabaseOrganizerSupportRepository implements OrganizerSupportRepository {
	constructor(private readonly clients: SupabaseClients) {}
	async list(query: OrganizerAdminQuery) {
		const { data, error } = await this.clients.admin.rpc('list_organizer_support', {
			target_page: query.page,
			target_limit: query.limit,
			target_search: query.search,
			target_status: query.status ?? null,
			target_sort: query.sort,
			target_direction: query.direction,
		});
		checkError(error);
		return data as unknown as OrganizerAdminList;
	}
	async detail(id: string) {
		const { data, error } = await this.clients.admin.rpc('get_organizer_support_detail', { target_organizer: id });
		checkError(error);
		return data as unknown as OrganizerSupportDetail | null;
	}
	async records(id: string, query: OrganizerRecordQuery) {
		const { data, error } = await this.clients.admin.rpc('list_organizer_support_records', {
			target_organizer: id,
			target_kind: query.kind,
			target_page: query.page,
			target_limit: query.limit,
		});
		checkError(error);
		return data as unknown as { data: OrganizerSupportRecords['data']; total: number } | null;
	}
	async update(id: string, actor: string, input: OrganizerAdminUpdate, context: AuditContext) {
		const { reason, ...patch } = input;
		const { data, error } = await this.clients.admin.rpc('update_organizer_support', {
			target_organizer: id,
			target_actor: actor,
			target_patch: patch as Json,
			target_reason: reason,
			target_reviewed_pix_key: null,
			target_context: context as unknown as Json,
		});
		checkError(error);
		return data;
	}
	async addNote(id: string, actor: string, note: string, context: AuditContext) {
		const { error } = await this.clients.admin.rpc('add_organizer_support_note', {
			target_organizer: id,
			target_actor: actor,
			target_note: note,
			target_context: context as unknown as Json,
		});
		checkError(error);
	}
}
