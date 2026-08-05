import { ticketInputSchema } from '@events-manager/contracts';
import { z } from 'zod';
import { getOwnedRegistration, requireOrganizer } from '../application/auth/organizer-context.js';
import { ApiError } from '../shared/errors.js';
const registrationSelect = `
  *,
  event_id:events!inner(id,title,slug,start_date,end_date,location_name,location_address,organizer_id),
  ticket_type_id:event_tickets(id,title,price,description),
  user_id:profiles(id,first_name,last_name,email,avatar)
`;
async function organizerEventIds(clients, organizerId) {
    const { data, error } = await clients.admin.from('events').select('id').eq('organizer_id', organizerId);
    if (error)
        throw error;
    return (data ?? []).map((event) => event.id);
}
async function getPlatformFeePercentage(clients) {
    const { data, error } = await clients.admin
        .from('event_configurations')
        .select('platform_fee_percentage')
        .eq('id', 1)
        .single();
    if (error)
        throw error;
    return Number(data.platform_fee_percentage ?? 0);
}
export async function adminRoutes(app, options) {
    const { clients } = options;
    app.get('/api/admin/event-configurations', async (request) => {
        await requireOrganizer(request, clients);
        const { data, error } = await clients.admin.from('event_configurations').select('*').eq('id', 1).single();
        if (error)
            throw error;
        return data;
    });
    app.get('/api/admin/ingressos/filter-options', async (request) => {
        const context = await requireOrganizer(request, clients);
        const { data, error } = await clients.admin
            .from('events')
            .select('id,title,start_date')
            .eq('organizer_id', context.organizer.id)
            .order('start_date', { ascending: false });
        if (error)
            throw error;
        return { events: data ?? [] };
    });
    app.get('/api/admin/ingressos', async (request) => {
        const context = await requireOrganizer(request, clients);
        const query = z.object({
            page: z.coerce.number().int().positive().default(1),
            search: z.string().default(''),
            eventIds: z.string().optional(),
            status: z.string().optional(),
        }).parse(request.query);
        const eventIds = query.eventIds?.split(',').filter(Boolean) ?? await organizerEventIds(clients, context.organizer.id);
        if (!eventIds.length)
            return { data: [], meta: { total: 0, page: query.page, pageCount: 0, perPage: 20 } };
        const from = (query.page - 1) * 20;
        let builder = clients.admin
            .from('event_tickets')
            .select('*,event_id:events!inner(id,title,start_date,cover_image:media_files(*))', { count: 'exact' })
            .in('event_id', eventIds)
            .range(from, from + 19)
            .order('date_created', { ascending: false });
        if (query.search)
            builder = builder.ilike('title', `%${query.search}%`);
        if (query.status)
            builder = builder.in('status', query.status.split(','));
        const { data, count, error } = await builder;
        if (error)
            throw error;
        return { data: data ?? [], meta: { total: count ?? 0, page: query.page, pageCount: Math.ceil((count ?? 0) / 20), perPage: 20 } };
    });
    app.post('/api/admin/ingressos', async (request, reply) => {
        const context = await requireOrganizer(request, clients);
        const input = ticketInputSchema.parse(request.body);
        const eventIds = await organizerEventIds(clients, context.organizer.id);
        if (!eventIds.includes(input.event_id))
            throw new ApiError('Evento não encontrado ou sem permissão.', 403, 'FORBIDDEN');
        const price = Number(input.price);
        const platformFeePercentage = await getPlatformFeePercentage(clients);
        const buyerPrice = input.service_fee_type === 'passed_to_buyer' ? price * (1 + platformFeePercentage / 100) : price;
        const { data, error } = await clients.admin
            .from('event_tickets')
            .insert({ ...input, buyer_price: buyerPrice, quantity_sold: 0, sort: 0 })
            .select('*')
            .single();
        if (error)
            throw error;
        return reply.code(201).send(data);
    });
    app.patch('/api/admin/ingressos/:id', async (request) => {
        const context = await requireOrganizer(request, clients);
        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
        const input = ticketInputSchema.partial().parse(request.body);
        const { data: current } = await clients.admin.from('event_tickets').select('*,event_id:events!inner(organizer_id)').eq('id', id).maybeSingle();
        if (!current || current.event_id.organizer_id !== context.organizer.id)
            throw new ApiError('Ingresso não encontrado.', 404, 'TICKET_NOT_FOUND');
        const price = input.price ?? Number(current.price);
        const feeType = input.service_fee_type ?? current.service_fee_type;
        const platformFeePercentage = await getPlatformFeePercentage(clients);
        const productChanged = input.price !== undefined || input.service_fee_type !== undefined || input.title !== undefined;
        const { data, error } = await clients.admin
            .from('event_tickets')
            .update({
            ...input,
            buyer_price: feeType === 'passed_to_buyer' ? price * (1 + platformFeePercentage / 100) : price,
            ...(productChanged ? { provider_product_id: null } : {}),
        })
            .eq('id', id)
            .select('*')
            .single();
        if (error)
            throw error;
        return data;
    });
    app.delete('/api/admin/ingressos/:id', async (request) => {
        const context = await requireOrganizer(request, clients);
        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
        const { data: current } = await clients.admin.from('event_tickets').select('event_id:events!inner(organizer_id)').eq('id', id).maybeSingle();
        if (!current || current.event_id.organizer_id !== context.organizer.id)
            throw new ApiError('Ingresso não encontrado.', 404, 'TICKET_NOT_FOUND');
        const { error } = await clients.admin.from('event_tickets').delete().eq('id', id);
        if (error)
            throw error;
        return { success: true };
    });
    app.post('/api/admin/ingressos/:id/duplicate', async (request, reply) => {
        const context = await requireOrganizer(request, clients);
        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
        const { data: current } = await clients.admin.from('event_tickets').select('*,event_id:events!inner(organizer_id)').eq('id', id).maybeSingle();
        if (!current || current.event_id.organizer_id !== context.organizer.id)
            throw new ApiError('Ingresso não encontrado.', 404, 'TICKET_NOT_FOUND');
        const { event_id: eventRelation, id: ignoredId, date_created: ignoredCreated, date_updated: ignoredUpdated, provider_product_id: ignoredProduct, ...copy } = current;
        const { data, error } = await clients.admin
            .from('event_tickets')
            .insert({ ...copy, provider_product_id: null, event_id: current.event_id.id ?? current.event_id, title: `${current.title} - Cópia`, status: 'inactive', quantity_sold: 0 })
            .select('*')
            .single();
        if (error)
            throw error;
        return reply.code(201).send(data);
    });
    app.get('/api/admin/participantes/filter-options', async (request) => {
        const context = await requireOrganizer(request, clients);
        const eventIds = await organizerEventIds(clients, context.organizer.id);
        const [events, tickets] = await Promise.all([
            clients.admin.from('events').select('id,title').in('id', eventIds).order('date_created', { ascending: false }),
            eventIds.length ? clients.admin.from('event_tickets').select('id,title').in('event_id', eventIds).order('title') : Promise.resolve({ data: [], error: null }),
        ]);
        if (events.error)
            throw events.error;
        if (tickets.error)
            throw tickets.error;
        return { events: events.data ?? [], ticketTypes: tickets.data ?? [] };
    });
    app.get('/api/admin/participantes', async (request) => {
        const context = await requireOrganizer(request, clients);
        const query = z.object({
            page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(25),
            search: z.string().default(''), eventIds: z.string().optional(), ticketTypeIds: z.string().optional(),
            registrationStatus: z.string().optional(), paymentStatus: z.string().optional(), hasCheckedIn: z.enum(['true', 'false']).optional(),
            sortField: z.string().default('date_created'), sortDirection: z.enum(['asc', 'desc']).default('desc'),
        }).parse(request.query);
        const ownedEventIds = await organizerEventIds(clients, context.organizer.id);
        const requestedIds = query.eventIds?.split(',').filter((id) => ownedEventIds.includes(id));
        const eventIds = requestedIds?.length ? requestedIds : ownedEventIds;
        if (!eventIds.length)
            return { data: [], meta: { total: 0, page: query.page, limit: query.limit, pageCount: 0 }, metrics: { total: 0, checkedIn: 0, pending: 0, checkInRate: 0 } };
        let builder = clients.admin.from('event_registrations').select(registrationSelect, { count: 'exact' }).in('event_id', eventIds);
        if (query.search)
            builder = builder.or(`participant_name.ilike.%${query.search}%,participant_email.ilike.%${query.search}%,ticket_code.ilike.%${query.search}%`);
        if (query.ticketTypeIds)
            builder = builder.in('ticket_type_id', query.ticketTypeIds.split(','));
        if (query.registrationStatus)
            builder = builder.in('status', query.registrationStatus.split(','));
        if (query.paymentStatus)
            builder = builder.in('payment_status', query.paymentStatus.split(','));
        if (query.hasCheckedIn === 'true')
            builder = builder.not('check_in_date', 'is', null);
        if (query.hasCheckedIn === 'false')
            builder = builder.is('check_in_date', null);
        const from = (query.page - 1) * query.limit;
        const result = await builder.order(query.sortField, { ascending: query.sortDirection === 'asc' }).range(from, from + query.limit - 1);
        if (result.error)
            throw result.error;
        const { data: metricRows, error: metricsError } = await clients.admin.from('event_registrations').select('status,check_in_date').in('event_id', eventIds);
        if (metricsError)
            throw metricsError;
        const total = result.count ?? 0;
        const checkedIn = metricRows?.filter((row) => row.check_in_date).length ?? 0;
        const pending = metricRows?.filter((row) => row.status === 'pending').length ?? 0;
        return { data: result.data ?? [], meta: { total, page: query.page, limit: query.limit, pageCount: Math.ceil(total / query.limit) }, metrics: { total: metricRows?.length ?? 0, checkedIn, pending, checkInRate: metricRows?.length ? (checkedIn / metricRows.length) * 100 : 0 } };
    });
    app.get('/api/admin/participantes/:id', async (request) => {
        const context = await requireOrganizer(request, clients);
        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
        return { success: true, data: await getOwnedRegistration(clients, context.organizer.id, id) };
    });
    app.patch('/api/admin/participantes/:id/edit', async (request) => {
        const context = await requireOrganizer(request, clients);
        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
        await getOwnedRegistration(clients, context.organizer.id, id);
        const input = z.object({
            participant_name: z.string().trim().min(1), participant_email: z.string().email(), participant_phone: z.string().nullable().optional(),
            participant_document: z.string().nullable().optional(), notes: z.string().nullable().optional(),
        }).parse(request.body);
        const { data, error } = await clients.admin.from('event_registrations').update(input).eq('id', id).select('*').single();
        if (error)
            throw error;
        return { success: true, data };
    });
    app.post('/api/admin/participantes/:id/checkin', async (request) => {
        const context = await requireOrganizer(request, clients);
        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
        await getOwnedRegistration(clients, context.organizer.id, id);
        const { data, error } = await clients.admin.from('event_registrations').update({ status: 'checked_in', check_in_date: new Date().toISOString() }).eq('id', id).select('*').single();
        if (error)
            throw error;
        return { success: true, data };
    });
    app.delete('/api/admin/participantes/:id/checkin', async (request) => {
        const context = await requireOrganizer(request, clients);
        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
        await getOwnedRegistration(clients, context.organizer.id, id);
        const { data, error } = await clients.admin.from('event_registrations').update({ status: 'confirmed', check_in_date: null }).eq('id', id).select('*').single();
        if (error)
            throw error;
        return { success: true, data };
    });
    app.post('/api/admin/participantes/:id/cancel', async (request) => {
        const context = await requireOrganizer(request, clients);
        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
        await getOwnedRegistration(clients, context.organizer.id, id);
        const { reason } = z.object({ reason: z.string().trim().min(3) }).parse(request.body);
        const { data, error } = await clients.admin.from('event_registrations').update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_reason: reason }).eq('id', id).select('*').single();
        if (error)
            throw error;
        return { success: true, data };
    });
    app.get('/api/admin/participantes/export', async (request, reply) => {
        const context = await requireOrganizer(request, clients);
        const eventIds = await organizerEventIds(clients, context.organizer.id);
        const { data, error } = eventIds.length
            ? await clients.admin.from('event_registrations').select(registrationSelect).in('event_id', eventIds).order('date_created', { ascending: false })
            : { data: [], error: null };
        if (error)
            throw error;
        const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
        const csv = ['Nome,Email,Telefone,Evento,Ingresso,Status,Pagamento,Check-in', ...(data ?? []).map((row) => [row.participant_name, row.participant_email, row.participant_phone, row.event_id?.title, row.ticket_type_id?.title, row.status, row.payment_status, row.check_in_date].map(escape).join(','))].join('\n');
        return reply.type('text/csv; charset=utf-8').header('content-disposition', 'attachment; filename="participantes.csv"').send(`\uFEFF${csv}`);
    });
}
//# sourceMappingURL=admin.js.map