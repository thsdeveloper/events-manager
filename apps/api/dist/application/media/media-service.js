import { ApiError } from '../../shared/errors.js';
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']);
export function hasValidFileSignature(mimetype, buffer) {
    if (mimetype === 'image/jpeg')
        return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    if (mimetype === 'image/png')
        return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mimetype === 'image/gif')
        return ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
    if (mimetype === 'image/webp') {
        return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    }
    if (mimetype === 'application/pdf')
        return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    return false;
}
function safeSegment(value) {
    return value
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 120);
}
export async function uploadMedia(clients, userId, file, folder = 'uploads') {
    if (!allowedTypes.has(file.mimetype))
        throw new ApiError('Tipo de arquivo não permitido.', 422, 'INVALID_FILE_TYPE');
    const buffer = await file.toBuffer();
    if (buffer.length > 20 * 1024 * 1024)
        throw new ApiError('O arquivo excede o limite de 20 MB.', 413, 'FILE_TOO_LARGE');
    if (!hasValidFileSignature(file.mimetype, buffer)) {
        throw new ApiError('O conteúdo do arquivo não corresponde ao formato informado.', 422, 'INVALID_FILE_CONTENT');
    }
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