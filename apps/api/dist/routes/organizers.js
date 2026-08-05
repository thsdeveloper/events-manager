import { z } from 'zod';
import { requireOrganizer } from '../application/auth/organizer-context.js';
import { requireUser } from '../application/auth/session.js';
import { uploadMedia } from '../application/media/media-service.js';
import { ApiError } from '../shared/errors.js';
const organizerInput = z.object({
    name: z.string().trim().min(2).optional(),
    email: z.string().email(),
    phone: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    website: z.string().url().or(z.literal('')).nullable().optional(),
    document: z.string().nullable().optional(),
    logo: z.string().uuid().optional(),
});
const payoutInput = z.object({
    payout_pix_key: z.string().trim().min(3),
    payout_pix_key_type: z.enum(['CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM']),
});
export async function organizerRoutes(app, options) {
    const { env, clients } = options;
    const initialOrganizerStatus = env.PAYMENTS_MODE === 'mock' ? 'active' : 'pending';
    const grantOrganizerRole = async (userId) => {
        const { error } = await clients.admin
            .from('profiles')
            .update({ role: 'organizer' })
            .eq('id', userId)
            .neq('role', 'super_admin');
        if (error)
            throw error;
    };
    app.get('/api/organizer/profile', async (request) => {
        const auth = await requireUser(request, clients);
        const { data, error } = await clients.admin
            .from('organizers')
            .select('*,logo:media_files(*)')
            .eq('user_id', auth.user.id)
            .maybeSingle();
        if (error)
            throw error;
        return { organizer: data };
    });
    app.post('/api/organizer/request', async (request, reply) => {
        const auth = await requireUser(request, clients);
        const input = organizerInput.extend({ name: z.string().trim().min(2), description: z.string().trim().min(10) }).parse(request.body);
        const { data: existing } = await clients.admin.from('organizers').select('*').eq('user_id', auth.user.id).maybeSingle();
        if (existing)
            throw new ApiError('Já existe uma solicitação ou perfil para este usuário.', 409, 'ORGANIZER_EXISTS');
        const { data, error } = await clients.admin
            .from('organizers')
            .insert({ ...input, website: input.website || null, user_id: auth.user.id, status: initialOrganizerStatus })
            .select('*')
            .single();
        if (error)
            throw error;
        if (initialOrganizerStatus === 'active')
            await grantOrganizerRole(auth.user.id);
        return reply.code(201).send({ success: true, organizer: data });
    });
    app.post('/api/organizer/profile', async (request, reply) => {
        const auth = await requireUser(request, clients);
        const input = organizerInput.extend({ name: z.string().trim().min(2) }).parse(request.body);
        const { data, error } = await clients.admin
            .from('organizers')
            .insert({ ...input, website: input.website || null, user_id: auth.user.id, status: initialOrganizerStatus })
            .select('*')
            .single();
        if (error)
            throw error;
        if (initialOrganizerStatus === 'active')
            await grantOrganizerRole(auth.user.id);
        return reply.code(201).send({ success: true, organizer: data });
    });
    app.patch('/api/organizer/profile', async (request) => {
        const auth = await requireUser(request, clients);
        const input = organizerInput.partial().parse(request.body);
        const { data, error } = await clients.admin
            .from('organizers')
            .update({ ...input, website: input.website || null })
            .eq('user_id', auth.user.id)
            .select('*')
            .maybeSingle();
        if (error)
            throw error;
        if (!data)
            throw new ApiError('Perfil de organizador não encontrado.', 404, 'ORGANIZER_NOT_FOUND');
        return { success: true, organizer: data };
    });
    app.post('/api/organizer/logo', async (request) => {
        const context = await requireOrganizer(request, clients);
        const file = await request.file();
        if (!file)
            throw new ApiError('Nenhum arquivo foi enviado.', 400, 'FILE_REQUIRED');
        const uploaded = await uploadMedia(clients, context.user.id, file, 'organizers');
        const { data, error } = await clients.admin
            .from('organizers')
            .update({ logo: uploaded.id })
            .eq('id', context.organizer.id)
            .select('*,logo:media_files(*)')
            .single();
        if (error)
            throw error;
        return { success: true, file: uploaded, organizer: data };
    });
    app.get('/api/organizer/stats', async (request) => {
        const context = await requireOrganizer(request, clients);
        const { data: events, error } = await clients.admin.from('events').select('id').eq('organizer_id', context.organizer.id);
        if (error)
            throw error;
        const eventIds = (events ?? []).map((event) => event.id);
        if (!eventIds.length)
            return { success: true, stats: { totalEvents: 0, totalRegistrations: 0, totalRevenue: 0 } };
        const { data: registrations, error: registrationsError } = await clients.admin
            .from('event_registrations')
            .select('payment_amount,payment_status')
            .in('event_id', eventIds);
        if (registrationsError)
            throw registrationsError;
        return {
            success: true,
            stats: {
                totalEvents: eventIds.length,
                totalRegistrations: registrations?.length ?? 0,
                totalRevenue: (registrations ?? []).filter((item) => item.payment_status === 'paid').reduce((sum, item) => sum + Number(item.payment_amount ?? 0), 0),
            },
        };
    });
    app.patch('/api/organizer/payout-settings', async (request) => {
        const context = await requireOrganizer(request, clients);
        const input = payoutInput.parse(request.body);
        const { data, error } = await clients.admin
            .from('organizers')
            .update({ ...input, payout_status: 'pending_review' })
            .eq('id', context.organizer.id)
            .select('*')
            .single();
        if (error)
            throw error;
        return {
            success: true,
            organizer: data,
            message: 'Dados de repasse enviados para validação pela plataforma.',
        };
    });
}
//# sourceMappingURL=organizers.js.map