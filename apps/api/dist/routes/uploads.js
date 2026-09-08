import { z } from 'zod';
import { MediaService } from '../application/media/media-service.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { SupabaseMediaRepository } from '../infrastructure/supabase/media-repository.js';
import { ApiError } from '../shared/errors.js';
import { requireUser } from './auth-context.js';
export async function uploadRoutes(app, options) {
    const { clients } = options;
    const auth = createSupabaseAuthService(clients);
    const media = new MediaService(new SupabaseMediaRepository(clients));
    app.post('/api/upload', async (request, reply) => {
        const context = await requireUser(request, auth);
        const query = z.object({ folder: z.string().default('uploads') }).parse(request.query);
        const file = await request.file();
        if (!file)
            throw new ApiError('Nenhum arquivo foi enviado.', 400, 'FILE_REQUIRED');
        const uploaded = await media.upload({
            buffer: await file.toBuffer(),
            filename: file.filename,
            folder: query.folder,
            mimetype: file.mimetype,
            userId: context.user.id,
        });
        return reply.code(201).send({
            fileId: uploaded.file.id,
            filename: uploaded.file.filename,
            url: uploaded.url,
            file: uploaded.file,
        });
    });
    app.get('/api/media/:id', async (request, reply) => {
        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
        return reply.redirect(await media.getPublicUrl(id));
    });
}
//# sourceMappingURL=uploads.js.map