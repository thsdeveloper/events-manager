import crypto from 'node:crypto';
import { z } from 'zod';
import { requireSuperAdmin } from '../application/auth/session.js';
import { ApiError } from '../shared/errors.js';
const paymentSettingsSchema = z.object({
    platform_fee_percentage: z.coerce.number().min(0).max(100),
    pix_fee_fixed: z.coerce.number().min(0),
    card_fee_percentage: z.coerce.number().min(0).max(100),
    card_fee_fixed: z.coerce.number().min(0),
    card_installment_2_6_percentage: z.coerce.number().min(0).max(100),
    card_installment_7_12_percentage: z.coerce.number().min(0).max(100),
    boleto_fee_fixed: z.coerce.number().min(0),
    payout_fee_fixed: z.coerce.number().min(0),
    minimum_payout: z.coerce.number().min(1),
    payouts_enabled: z.boolean(),
    convenience_fee_calculation_method: z.enum(['buyer_pays', 'organizer_absorbs']),
});
async function recordAudit(clients, actorId, action, resourceType, resourceId, beforeData, afterData, request) {
    const { error } = await clients.admin.from('audit_logs').insert({
        actor_id: actorId,
        action,
        resource_type: resourceType,
        resource_id: resourceId == null ? null : String(resourceId),
        before_data: beforeData ?? null,
        after_data: afterData ?? null,
        metadata: { ip: request.ip, userAgent: request.headers['user-agent'] ?? null },
    });
    if (error)
        throw error;
}
async function getOrganizerAvailableBalance(clients, organizerId) {
    const { data: events, error: eventsError } = await clients.admin
        .from('events')
        .select('id')
        .eq('organizer_id', organizerId);
    if (eventsError)
        throw eventsError;
    const eventIds = (events ?? []).map((event) => event.id);
    if (!eventIds.length)
        return 0;
    const { data: registrations, error: registrationsError } = await clients.admin
        .from('event_registrations')
        .select('id')
        .in('event_id', eventIds);
    if (registrationsError)
        throw registrationsError;
    const registrationIds = (registrations ?? []).map((registration) => registration.id);
    const [transactions, payouts] = await Promise.all([
        registrationIds.length
            ? clients.admin.from('payment_transactions').select('organizer_net').in('registration_id', registrationIds).eq('status', 'succeeded')
            : Promise.resolve({ data: [], error: null }),
        clients.admin.from('organizer_payouts').select('amount,status').eq('organizer_id', organizerId).in('status', ['pending', 'processing', 'completed']),
    ]);
    if (transactions.error)
        throw transactions.error;
    if (payouts.error)
        throw payouts.error;
    const earned = (transactions.data ?? []).reduce((sum, transaction) => sum + Number(transaction.organizer_net ?? 0), 0);
    const withdrawn = (payouts.data ?? []).reduce((sum, payout) => sum + Number(payout.amount ?? 0), 0);
    return Math.max(0, Math.round((earned - withdrawn) * 100) / 100);
}
export async function superAdminRoutes(app, options) {
    const { clients, payments } = options;
    app.get('/api/super-admin/overview', async (request) => {
        await requireSuperAdmin(request, clients);
        const [organizers, events, registrations, transactions, recentTransactions, payouts] = await Promise.all([
            clients.admin.from('organizers').select('id,name,status,date_created'),
            clients.admin.from('events').select('id,title,status,organizer_id,start_date,date_created'),
            clients.admin.from('event_registrations').select('id,event_id,payment_status,total_amount,quantity,date_created'),
            clients.admin.from('payment_transactions').select('status,provider_fee,platform_fee,organizer_net'),
            clients.admin.from('payment_transactions').select('*,registration_id:event_registrations(id,event_id,participant_name,event_id:events(id,title,organizer_id:organizers(id,name)))').order('date_created', { ascending: false }).limit(12),
            clients.admin.from('organizer_payouts').select('amount,status'),
        ]);
        for (const result of [organizers, events, registrations, transactions, recentTransactions, payouts]) {
            if (result.error)
                throw result.error;
        }
        const succeeded = (transactions.data ?? []).filter((transaction) => transaction.status === 'succeeded');
        const allPaid = (registrations.data ?? []).filter((registration) => registration.payment_status === 'paid');
        const grossRevenue = allPaid.reduce((sum, registration) => sum + Number(registration.total_amount ?? 0), 0);
        const providerFees = succeeded.reduce((sum, transaction) => sum + Number(transaction.provider_fee ?? 0), 0);
        const platformRevenue = succeeded.reduce((sum, transaction) => sum + Number(transaction.platform_fee ?? 0), 0);
        const organizerPayable = succeeded.reduce((sum, transaction) => sum + Number(transaction.organizer_net ?? 0), 0);
        const paidOut = (payouts.data ?? []).filter((payout) => payout.status === 'completed').reduce((sum, payout) => sum + Number(payout.amount), 0);
        const eventMap = new Map((events.data ?? []).map((event) => [event.id, event]));
        const organizerMap = new Map((organizers.data ?? []).map((organizer) => [organizer.id, organizer]));
        const performance = new Map();
        for (const organizer of organizers.data ?? []) {
            performance.set(organizer.id, { id: organizer.id, name: organizer.name, gross: 0, tickets: 0, events: 0 });
        }
        for (const event of events.data ?? []) {
            const current = performance.get(event.organizer_id);
            if (current)
                current.events += 1;
        }
        for (const registration of allPaid) {
            const event = eventMap.get(registration.event_id);
            const current = event ? performance.get(event.organizer_id) : undefined;
            if (current) {
                current.gross += Number(registration.total_amount ?? 0);
                current.tickets += Number(registration.quantity ?? 0);
            }
        }
        const lastThirtyDays = new Date();
        lastThirtyDays.setDate(lastThirtyDays.getDate() - 29);
        lastThirtyDays.setHours(0, 0, 0, 0);
        const timeline = new Map();
        for (const registration of allPaid) {
            if (new Date(registration.date_created) < lastThirtyDays)
                continue;
            const day = registration.date_created.slice(0, 10);
            const current = timeline.get(day) ?? { gross: 0, tickets: 0 };
            current.gross += Number(registration.total_amount ?? 0);
            current.tickets += Number(registration.quantity ?? 0);
            timeline.set(day, current);
        }
        return {
            metrics: {
                organizers: organizers.data?.length ?? 0,
                activeOrganizers: organizers.data?.filter((organizer) => organizer.status === 'active').length ?? 0,
                events: events.data?.length ?? 0,
                publishedEvents: events.data?.filter((event) => event.status === 'published').length ?? 0,
                ticketsSold: allPaid.reduce((sum, registration) => sum + Number(registration.quantity ?? 0), 0),
                grossRevenue,
                platformRevenue,
                providerFees,
                organizerPayable: Math.max(0, organizerPayable - paidOut),
            },
            timeline: Array.from(timeline, ([date, value]) => ({ date, ...value })).sort((a, b) => a.date.localeCompare(b.date)),
            topOrganizers: Array.from(performance.values()).sort((a, b) => b.gross - a.gross).slice(0, 6),
            recentTransactions: recentTransactions.data ?? [],
            status: {
                organizers: Object.fromEntries(['active', 'pending', 'archived'].map((status) => [status, organizers.data?.filter((item) => item.status === status).length ?? 0])),
                events: Object.fromEntries(['published', 'draft', 'cancelled', 'archived'].map((status) => [status, events.data?.filter((item) => item.status === status).length ?? 0])),
            },
            provider: payments.provider,
            organizers: Array.from(organizerMap.values()).length,
        };
    });
    app.get('/api/super-admin/organizers', async (request) => {
        await requireSuperAdmin(request, clients);
        const query = z.object({
            page: z.coerce.number().int().positive().default(1),
            limit: z.coerce.number().int().min(1).max(100).default(20),
            search: z.string().trim().default(''),
            status: z.enum(['active', 'pending', 'archived']).optional(),
        }).parse(request.query);
        const from = (query.page - 1) * query.limit;
        let builder = clients.admin.from('organizers').select('*', { count: 'exact' });
        if (query.search)
            builder = builder.or(`name.ilike.%${query.search}%,email.ilike.%${query.search}%`);
        if (query.status)
            builder = builder.eq('status', query.status);
        const { data, count, error } = await builder.order('date_created', { ascending: false }).range(from, from + query.limit - 1);
        if (error)
            throw error;
        const organizerIds = (data ?? []).map((organizer) => organizer.id);
        const { data: events, error: eventsError } = organizerIds.length
            ? await clients.admin.from('events').select('id,organizer_id').in('organizer_id', organizerIds)
            : { data: [], error: null };
        if (eventsError)
            throw eventsError;
        const eventIds = (events ?? []).map((event) => event.id);
        const { data: registrations, error: registrationsError } = eventIds.length
            ? await clients.admin.from('event_registrations').select('event_id,total_amount,quantity,payment_status').in('event_id', eventIds)
            : { data: [], error: null };
        if (registrationsError)
            throw registrationsError;
        const eventOwner = new Map((events ?? []).map((event) => [event.id, event.organizer_id]));
        return {
            data: (data ?? []).map((organizer) => {
                const ownedEvents = (events ?? []).filter((event) => event.organizer_id === organizer.id);
                const paid = (registrations ?? []).filter((registration) => eventOwner.get(registration.event_id) === organizer.id && registration.payment_status === 'paid');
                return {
                    ...organizer,
                    metrics: {
                        events: ownedEvents.length,
                        ticketsSold: paid.reduce((sum, registration) => sum + Number(registration.quantity ?? 0), 0),
                        grossRevenue: paid.reduce((sum, registration) => sum + Number(registration.total_amount ?? 0), 0),
                    },
                };
            }),
            pagination: { page: query.page, limit: query.limit, total: count ?? 0, pageCount: Math.ceil((count ?? 0) / query.limit) },
        };
    });
    app.patch('/api/super-admin/organizers/:id/status', async (request) => {
        const admin = await requireSuperAdmin(request, clients);
        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
        const input = z.object({
            status: z.enum(['active', 'pending', 'archived']).optional(),
            payout_status: z.enum(['not_configured', 'pending_review', 'enabled', 'blocked']).optional(),
        }).refine((value) => value.status || value.payout_status, 'Informe um status para atualizar.').parse(request.body);
        const { data: before, error: beforeError } = await clients.admin.from('organizers').select('*').eq('id', id).maybeSingle();
        if (beforeError)
            throw beforeError;
        if (!before)
            throw new ApiError('Organizador não encontrado.', 404, 'ORGANIZER_NOT_FOUND');
        const { data, error } = await clients.admin.from('organizers').update(input).eq('id', id).select('*').single();
        if (error)
            throw error;
        if (input.status === 'active' && before.user_id) {
            await clients.admin.from('profiles').update({ role: 'organizer' }).eq('id', before.user_id).neq('role', 'super_admin');
        }
        await recordAudit(clients, admin.user.id, 'organizer.status_updated', 'organizer', id, before, data, request);
        return { success: true, organizer: data };
    });
    app.get('/api/super-admin/finance/transactions', async (request) => {
        await requireSuperAdmin(request, clients);
        const query = z.object({
            page: z.coerce.number().int().positive().default(1),
            limit: z.coerce.number().int().min(1).max(100).default(25),
            status: z.enum(['succeeded', 'pending', 'failed', 'refunded']).optional(),
            search: z.string().trim().default(''),
        }).parse(request.query);
        const from = (query.page - 1) * query.limit;
        let builder = clients.admin.from('payment_transactions').select('*,registration_id:event_registrations(id,participant_name,participant_email,event_id:events(id,title,organizer_id:organizers(id,name)))', { count: 'exact' });
        if (query.status)
            builder = builder.eq('status', query.status);
        const { data, count, error } = await builder.order('date_created', { ascending: false }).range(from, from + query.limit - 1);
        if (error)
            throw error;
        const normalizedSearch = query.search.toLocaleLowerCase('pt-BR');
        const filtered = normalizedSearch
            ? (data ?? []).filter((transaction) => {
                const registration = transaction.registration_id;
                return [registration?.participant_name, registration?.participant_email, registration?.event_id?.title, registration?.event_id?.organizer_id?.name, transaction.provider_object_id]
                    .some((value) => String(value ?? '').toLocaleLowerCase('pt-BR').includes(normalizedSearch));
            })
            : data ?? [];
        return { data: filtered, pagination: { page: query.page, limit: query.limit, total: count ?? 0, pageCount: Math.ceil((count ?? 0) / query.limit) } };
    });
    app.get('/api/super-admin/finance/payouts', async (request) => {
        await requireSuperAdmin(request, clients);
        const { data, error } = await clients.admin
            .from('organizer_payouts')
            .select('*,organizer_id:organizers(id,name,email,payout_status)')
            .order('requested_at', { ascending: false })
            .limit(100);
        if (error)
            throw error;
        return { data: data ?? [] };
    });
    app.post('/api/super-admin/finance/payouts', async (request, reply) => {
        const admin = await requireSuperAdmin(request, clients);
        const input = z.object({ organizer_id: z.string().uuid(), amount: z.coerce.number().positive() }).parse(request.body);
        const [{ data: organizer, error: organizerError }, { data: configuration, error: configurationError }] = await Promise.all([
            clients.admin.from('organizers').select('*').eq('id', input.organizer_id).maybeSingle(),
            clients.admin.from('event_configurations').select('*').eq('id', 1).single(),
        ]);
        if (organizerError)
            throw organizerError;
        if (configurationError)
            throw configurationError;
        if (!organizer)
            throw new ApiError('Organizador não encontrado.', 404, 'ORGANIZER_NOT_FOUND');
        if (!organizer.payout_pix_key || !organizer.payout_pix_key_type || organizer.payout_status !== 'enabled') {
            throw new ApiError('Os dados PIX do organizador ainda não estão habilitados.', 422, 'PAYOUT_ACCOUNT_DISABLED');
        }
        if (!configuration.payouts_enabled && payments.provider !== 'mock') {
            throw new ApiError('Os repasses reais estão pausados nas configurações da plataforma.', 409, 'PAYOUTS_DISABLED');
        }
        if (input.amount < Number(configuration.minimum_payout)) {
            throw new ApiError(`O repasse mínimo é de R$ ${Number(configuration.minimum_payout).toFixed(2)}.`, 422, 'PAYOUT_BELOW_MINIMUM');
        }
        const available = await getOrganizerAvailableBalance(clients, organizer.id);
        if (input.amount > available)
            throw new ApiError('Saldo disponível insuficiente para este repasse.', 409, 'INSUFFICIENT_BALANCE');
        const payoutId = crypto.randomUUID();
        const providerFee = payments.provider === 'mock' ? 0 : Number(configuration.payout_fee_fixed);
        const { data: payout, error: payoutError } = await clients.admin.from('organizer_payouts').insert({
            id: payoutId,
            organizer_id: organizer.id,
            requested_by: admin.user.id,
            processed_by: admin.user.id,
            amount: input.amount,
            provider_fee: providerFee,
            net_amount: Math.max(0, input.amount - providerFee),
            pix_key: organizer.payout_pix_key,
            pix_key_type: organizer.payout_pix_key_type,
            status: 'processing',
            provider: payments.provider,
        }).select('*').single();
        if (payoutError)
            throw payoutError;
        try {
            const transfer = await payments.sendPix({
                externalId: payout.id,
                amountInCents: Math.round(Number(payout.net_amount) * 100),
                description: `Repasse Events Manager · ${organizer.name}`,
                pixKey: organizer.payout_pix_key,
                pixKeyType: organizer.payout_pix_key_type,
            });
            const completed = transfer.status === 'COMPLETE';
            const { data: updated, error: updateError } = await clients.admin.from('organizer_payouts').update({
                provider_payout_id: transfer.id,
                provider_fee: transfer.providerFeeInCents ? transfer.providerFeeInCents / 100 : providerFee,
                status: completed ? 'completed' : 'processing',
                receipt_url: transfer.receiptUrl,
                processed_at: completed ? new Date().toISOString() : null,
            }).eq('id', payout.id).select('*').single();
            if (updateError)
                throw updateError;
            await recordAudit(clients, admin.user.id, 'payout.created', 'organizer_payout', payout.id, null, updated, request);
            return reply.code(201).send({ success: true, payout: updated });
        }
        catch (error) {
            await clients.admin.from('organizer_payouts').update({
                status: 'failed',
                failure_reason: error instanceof Error ? error.message : 'Falha no provedor de pagamentos.',
                processed_at: new Date().toISOString(),
            }).eq('id', payout.id);
            throw error;
        }
    });
    app.get('/api/super-admin/settings/payments', async (request) => {
        await requireSuperAdmin(request, clients);
        const { data, error } = await clients.admin.from('event_configurations').select('*').eq('id', 1).single();
        if (error)
            throw error;
        return { settings: data, runtimeProvider: payments.provider };
    });
    app.patch('/api/super-admin/settings/payments', async (request) => {
        const admin = await requireSuperAdmin(request, clients);
        const input = paymentSettingsSchema.parse(request.body);
        const { data: before, error: beforeError } = await clients.admin.from('event_configurations').select('*').eq('id', 1).single();
        if (beforeError)
            throw beforeError;
        const { data, error } = await clients.admin.from('event_configurations').update(input).eq('id', 1).select('*').single();
        if (error)
            throw error;
        await recordAudit(clients, admin.user.id, 'payment_settings.updated', 'event_configuration', 1, before, data, request);
        return { success: true, settings: data };
    });
}
//# sourceMappingURL=super-admin.js.map