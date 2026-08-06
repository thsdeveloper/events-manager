import { eventInputSchema, eventPatchSchema } from '@events-manager/contracts';
import { z } from 'zod';
import { requireUser } from '../application/auth/session.js';
import { ApiError } from '../shared/errors.js';
const publicEventSelection = `
  id,
  status,
  sort,
  date_created,
  date_updated,
  title,
  slug,
  description,
  short_description,
  event_type,
  start_date,
  end_date,
  location_name,
  location_address,
  online_url,
  max_attendees,
  registration_start,
  registration_end,
  is_free,
  tags,
  featured,
  cover_image:media_files(id,bucket,path,filename,title,type,filesize,width,height,description,metadata,date_created),
  organizer_id:organizers(id,name,email,phone,description,logo,website),
  category_id:event_categories(id,sort,name,slug,description,icon,color),
  tickets:event_tickets(id,event_id,title,description,status,quantity,quantity_sold,price,service_fee_type,buyer_price,sale_start_date,sale_end_date,min_quantity_per_purchase,max_quantity_per_purchase,visibility,allow_installments,max_installments,min_amount_for_installments,sort,date_created,date_updated)
`;
const organizerEventSelection = `
  *,
  cover_image:media_files(*),
  organizer_id:organizers(id,name,email,phone,description,logo,website),
  category_id:event_categories(*),
  tickets:event_tickets(*),
  registrations:event_registrations(id,status,payment_status,quantity)
`;
export async function eventRoutes(app, options) {
    const { clients } = options;
    app.get('/api/events/slug/:slug', async (request) => {
        const { slug } = z.object({ slug: z.string() }).parse(request.params);
        const { data, error } = await clients.public
            .from('events')
            .select(publicEventSelection)
            .eq('slug', slug)
            .eq('status', 'published')
            .eq('event_tickets.status', 'active')
            .eq('event_tickets.visibility', 'public')
            .maybeSingle();
        if (error)
            throw error;
        if (!data)
            throw new ApiError('Evento não encontrado.', 404, 'EVENT_NOT_FOUND');
        if (Array.isArray(data.tickets))
            data.tickets.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
        return data;
    });
    app.get('/api/events', async (request) => {
        const auth = await requireUser(request, clients);
        const database = clients.forAccessToken(auth.accessToken);
        const { data: organizer } = await clients.admin
            .from('organizers')
            .select('id')
            .eq('user_id', auth.user.id)
            .maybeSingle();
        if (!organizer)
            return { data: [] };
        const { data, error } = await database
            .from('events')
            .select('*,cover_image:media_files(*),category_id:event_categories(*),tickets:event_tickets(*),registrations:event_registrations(id,status,payment_status,quantity)')
            .eq('organizer_id', organizer.id)
            .order('date_created', { ascending: false });
        if (error)
            throw error;
        return { data: data ?? [] };
    });
    app.get('/api/event-categories', async () => {
        const { data, error } = await clients.public
            .from('event_categories')
            .select('id,sort,name,slug,description,icon,color')
            .order('name');
        if (error)
            throw error;
        return { data: data ?? [] };
    });
    app.post('/api/events', async (request, reply) => {
        const auth = await requireUser(request, clients);
        const database = clients.forAccessToken(auth.accessToken);
        const input = eventInputSchema.parse(request.body);
        const { data: organizer } = await clients.admin
            .from('organizers')
            .select('id,status')
            .eq('user_id', auth.user.id)
            .maybeSingle();
        if (!organizer || organizer.status !== 'active')
            throw new ApiError('Seu perfil de organizador ainda não está ativo.', 403, 'ORGANIZER_REQUIRED');
        const { data, error } = await database
            .from('events')
            .insert({ ...input, organizer_id: organizer.id, user_created: auth.user.id })
            .select('*')
            .single();
        if (error)
            throw error;
        return reply.code(201).send(data);
    });
    app.get('/api/events/:id', async (request) => {
        const auth = await requireUser(request, clients);
        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
        const database = clients.forAccessToken(auth.accessToken);
        const { data, error } = await database.from('events').select(organizerEventSelection).eq('id', id).maybeSingle();
        if (error)
            throw error;
        if (!data)
            throw new ApiError('Evento não encontrado.', 404, 'EVENT_NOT_FOUND');
        return data;
    });
    app.patch('/api/events/:id', async (request) => {
        const auth = await requireUser(request, clients);
        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
        const input = eventPatchSchema.parse(request.body);
        const database = clients.forAccessToken(auth.accessToken);
        const { data: current, error: currentError } = await database.from('events').select('*').eq('id', id).maybeSingle();
        if (currentError)
            throw currentError;
        if (!current)
            throw new ApiError('Evento não encontrado ou sem permissão.', 404, 'EVENT_NOT_FOUND');
        eventInputSchema.parse({ ...current, ...input });
        const { data, error } = await database
            .from('events')
            .update({ ...input, user_updated: auth.user.id })
            .eq('id', id)
            .select('*')
            .maybeSingle();
        if (error)
            throw error;
        if (!data)
            throw new ApiError('Evento não encontrado ou sem permissão.', 404, 'EVENT_NOT_FOUND');
        return data;
    });
    app.delete('/api/events/:id', async (request, reply) => {
        const auth = await requireUser(request, clients);
        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
        const database = clients.forAccessToken(auth.accessToken);
        const { error, count } = await database.from('events').delete({ count: 'exact' }).eq('id', id);
        if (error)
            throw error;
        if (!count)
            throw new ApiError('Evento não encontrado ou sem permissão.', 404, 'EVENT_NOT_FOUND');
        return reply.code(204).send();
    });
}
//# sourceMappingURL=events.js.map