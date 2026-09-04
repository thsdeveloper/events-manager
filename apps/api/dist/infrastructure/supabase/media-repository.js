function safeSegment(value) {
    return value
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 120);
}
export class SupabaseMediaRepository {
    clients;
    constructor(clients) {
        this.clients = clients;
    }
    async store(input) {
        const path = `${input.userId}/${safeSegment(input.folder)}/${crypto.randomUUID()}-${safeSegment(input.filename)}`;
        const { error: storageError } = await this.clients.admin.storage.from('media').upload(path, input.buffer, {
            contentType: input.mimetype,
            upsert: false,
        });
        if (storageError)
            throw storageError;
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
    async findPublicUrl(id) {
        const { data, error } = await this.clients.admin
            .from('media_files')
            .select('bucket,path')
            .eq('id', id)
            .maybeSingle();
        if (error)
            throw error;
        if (!data)
            return null;
        return this.clients.public.storage.from(data.bucket).getPublicUrl(data.path).data.publicUrl;
    }
}
//# sourceMappingURL=media-repository.js.map