import { z } from 'zod';
import { requireUser } from '../application/auth/session.js';
import { uploadMedia } from '../application/media/media-service.js';
import { ApiError } from '../shared/errors.js';
export async function uploadRoutes(app, options) {
    const { clients } = options;
    app.post('/api/upload', async (request, reply) => {
        const auth = await requireUser(request, clients);
        const query = z.object({ folder: z.string().default('uploads') }).parse(request.query);
        const file = await request.file();
        if (!file)
            throw new ApiError('Nenhum arquivo foi enviado.', 400, 'FILE_REQUIRED');
        const uploaded = await uploadMedia(clients, auth.user.id, file, query.folder);
        return reply.code(201).send({
            fileId: uploaded.id,
            filename: uploaded.filename,
            url: uploaded.url,
            file: uploaded,
        });
    });
    app.get('/api/media/:id', async (request, reply) => {
        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
        const { data, error } = await clients.public.from('media_files').select('bucket,path').eq('id', id).maybeSingle();
        if (error)
            throw error;
        if (!data)
            throw new ApiError('Arquivo não encontrado.', 404, 'MEDIA_NOT_FOUND');
        const { data: publicUrl } = clients.public.storage.from(data.bucket).getPublicUrl(data.path);
        return reply.redirect(publicUrl.publicUrl);
    });
}
//# sourceMappingURL=uploads.js.map