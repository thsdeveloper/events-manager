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
export class MediaService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async upload(input) {
        if (!allowedTypes.has(input.mimetype))
            throw new ApiError('Tipo de arquivo não permitido.', 422, 'INVALID_FILE_TYPE');
        if (input.buffer.length > 20 * 1024 * 1024) {
            throw new ApiError('O arquivo excede o limite de 20 MB.', 413, 'FILE_TOO_LARGE');
        }
        if (!hasValidFileSignature(input.mimetype, input.buffer)) {
            throw new ApiError('O conteúdo do arquivo não corresponde ao formato informado.', 422, 'INVALID_FILE_CONTENT');
        }
        return this.repository.store(input);
    }
    async getPublicUrl(id) {
        const url = await this.repository.findPublicUrl(id);
        if (!url)
            throw new ApiError('Arquivo não encontrado.', 404, 'MEDIA_NOT_FOUND');
        return url;
    }
}
//# sourceMappingURL=media-service.js.map