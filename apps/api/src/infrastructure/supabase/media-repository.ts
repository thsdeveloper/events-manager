import type { MediaRepository, MediaUpload } from '../../application/media/media-service.js';
import type { SupabaseClients } from './clients.js';

function safeSegment(value: string) {
	return value
		.normalize('NFKD')
		.replace(/[^a-zA-Z0-9._-]/g, '-')
		.replace(/-+/g, '-')
		.slice(0, 120);
}

export class SupabaseMediaRepository implements MediaRepository {
	constructor(private readonly clients: SupabaseClients) {}

	async store(input: MediaUpload) {
		const path = `${input.userId}/${safeSegment(input.folder)}/${crypto.randomUUID()}-${safeSegment(input.filename)}`;
		const { error: storageError } = await this.clients.admin.storage.from('media').upload(path, input.buffer, {
			contentType: input.mimetype,
			upsert: false,
		});
		if (storageError) throw storageError;

		const { data, error } = await this.clients.admin
			.from('media_files')
			.insert({
				bucket: 'media',
				path,
				filename: input.filename,
				title: input.title ?? input.filename,
				type: input.mimetype,
				filesize: input.buffer.length,
				uploaded_by: input.userId,
				metadata: input.metadata,
			})
			.select('*')
			.single();
		if (error) {
			await this.clients.admin.storage.from('media').remove([path]);
			throw error;
		}

		const { data: publicUrl } = this.clients.public.storage.from('media').getPublicUrl(path);
		return { file: data, url: publicUrl.publicUrl };
	}

	/**
	 * A propriedade é checada na própria consulta (`uploaded_by`), então um id de
	 * arquivo alheio não apaga nada. O registro sai antes do objeto: as chaves
	 * estrangeiras ficam nulas na hora, e se a remoção no bucket falhar sobra um
	 * objeto sem referência, e não uma referência para um objeto que não existe.
	 */
	async removeOwnedFile(id: string, ownerId: string) {
		const { data, error } = await this.clients.admin
			.from('media_files')
			.select('bucket,path')
			.eq('id', id)
			.eq('uploaded_by', ownerId)
			.maybeSingle();
		if (error) throw error;
		if (!data) return false;

		const { error: deleteError } = await this.clients.admin.from('media_files').delete().eq('id', id);
		if (deleteError) throw deleteError;

		const { error: storageError } = await this.clients.admin.storage.from(data.bucket).remove([data.path]);
		if (storageError) throw storageError;
		return true;
	}

	async findPublicUrl(id: string) {
		const { data, error } = await this.clients.admin
			.from('media_files')
			.select('bucket,path')
			.eq('id', id)
			.maybeSingle();
		if (error) throw error;
		if (!data) return null;
		return this.clients.public.storage.from(data.bucket).getPublicUrl(data.path).data.publicUrl;
	}
}
