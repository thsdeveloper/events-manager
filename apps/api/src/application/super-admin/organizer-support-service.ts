import { organizerAdminUpdateSchema } from '@events-manager/contracts';
import type {
	OrganizerAdminList,
	OrganizerAdminQuery,
	OrganizerAdminUpdate,
	OrganizerRecordQuery,
	OrganizerSupportDetail,
	OrganizerSupportRecords,
} from '@events-manager/contracts';
import type { AuditContext } from './super-admin-service.js';
import { ApiError } from '../../shared/errors.js';

export interface OrganizerSupportRepository {
	list(query: OrganizerAdminQuery): Promise<OrganizerAdminList>;
	detail(id: string): Promise<OrganizerSupportDetail | null>;
	records(
		id: string,
		query: OrganizerRecordQuery,
	): Promise<{ data: OrganizerSupportRecords['data']; total: number } | null>;
	update(id: string, actor: string, input: OrganizerAdminUpdate, context: AuditContext): Promise<unknown>;
	addNote(id: string, actor: string, note: string, context: AuditContext): Promise<void>;
}
export class OrganizerSupportService {
	constructor(private readonly repository: OrganizerSupportRepository) {}
	list(query: OrganizerAdminQuery) {
		return this.repository.list(query);
	}
	async detail(id: string) {
		const detail = await this.repository.detail(id);
		if (!detail) throw new ApiError('Organizador não encontrado.', 404, 'ORGANIZER_NOT_FOUND');
		return detail;
	}
	async records(id: string, query: OrganizerRecordQuery): Promise<OrganizerSupportRecords> {
		const result = await this.repository.records(id, query);
		if (!result) throw new ApiError('Organizador não encontrado.', 404, 'ORGANIZER_NOT_FOUND');
		return {
			data: result.data,
			pagination: {
				page: query.page,
				limit: query.limit,
				total: result.total,
				pageCount: Math.ceil(result.total / query.limit),
			},
		};
	}
	async update(id: string, actor: string, input: OrganizerAdminUpdate, context: AuditContext) {
		input = organizerAdminUpdateSchema.parse(input);
		return { success: true, organizer: await this.repository.update(id, actor, input, context) };
	}
	async addNote(id: string, actor: string, note: string, context: AuditContext) {
		await this.repository.addNote(id, actor, note, context);
		return { success: true };
	}
}
