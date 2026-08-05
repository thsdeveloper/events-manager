import { ApiError } from '../../shared/errors.js';
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf']);
function safeSegment(value) {
    return value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 120);
}
export async function uploadMedia(clients, userId, file, folder = 'uploads') {
    if (!allowedTypes.has(file.mimetype))
        throw new ApiError('Tipo de arquivo não permitido.', 422, 'INVALID_FILE_TYPE');
    const buffer = await file.toBuffer();
    if (buffer.length > 20 * 1024 * 1024)
        throw new ApiError('O arquivo excede o limite de 20 MB.', 413, 'FILE_TOO_LARGE');
    const path = `${userId}/${safeSegment(folder)}/${crypto.randomUUID()}-${safeSegment(file.filename)}`;
    const { error: storageError } = await clients.admin.storage.from('media').upload(path, buffer, {
        contentType: file.mimetype,
        upsert: false,
    });
    if (storageError)
        throw storageError;
    const { data, error } = await clients.admin
        .from('media_files')
        .insert({
        bucket: 'media',
        path,
        filename: file.filename,
        title: file.filename,
        type: file.mimetype,
        filesize: buffer.length,
        uploaded_by: userId,
    })
        .select('*')
        .single();
    if (error) {
        await clients.admin.storage.from('media').remove([path]);
        throw error;
    }
    const { data: publicUrl } = clients.public.storage.from('media').getPublicUrl(path);
    return { ...data, url: publicUrl.publicUrl };
}
//# sourceMappingURL=media-service.js.map