import { sanitizePostgrestOrTerm } from './search.js';
// Media is expanded so the admin screen can preview it straight from storage;
// next/image cannot optimise an image served through the /api/media redirect.
const siteSettingsColumns = 'id,title,date_updated,' +
    'logo:media_files!site_settings_logo_fkey(id,bucket,path),' +
    'logo_dark_mode:media_files!site_settings_logo_dark_mode_fkey(id,bucket,path)';
export class SupabaseSuperAdminRepository {
    clients;
    constructor(clients) {
        this.clients = clients;
    }
    async getOverviewData() {
        const [organizers, events, registrations, transactions, recentTransactions, payouts] = await Promise.all([
            this.clients.admin.from('organizers').select('id,name,status,date_created'),
            this.clients.admin.from('events').select('id,title,status,organizer_id,start_date,date_created'),
            this.clients.admin
                .from('event_registrations')
                .select('id,event_id,payment_status,total_amount,quantity,date_created'),
            this.clients.admin.from('payment_transactions').select('status,provider_fee,platform_fee,organizer_net'),
            this.clients.admin
                .from('payment_transactions')
                .select('*,registration_id:event_registrations(id,event_id,participant_name,event_id:events(id,title,organizer_id:organizers(id,name)))')
                .order('date_created', { ascending: false })
                .limit(12),
            this.clients.admin.from('organizer_payouts').select('amount,status'),
        ]);
        for (const result of [organizers, events, registrations, transactions, recentTransactions, payouts])
            if (result.error)
                throw result.error;
        return {
            organizers: (organizers.data ?? []),
            events: (events.data ?? []),
            registrations: (registrations.data ?? []),
            transactions: (transactions.data ?? []),
            recentTransactions: (recentTransactions.data ?? []),
            payouts: (payouts.data ?? []),
        };
    }
    async listOrganizerPage(query) {
        let builder = this.clients.admin.from('organizers').select('*', { count: 'exact' });
        if (query.search) {
            const search = sanitizePostgrestOrTerm(query.search);
            if (search)
                builder = builder.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
        }
        if (query.status)
            builder = builder.eq('status', query.status);
        const from = (query.page - 1) * query.limit;
        const { data, count, error } = await builder
            .order('date_created', { ascending: false })
            .range(from, from + query.limit - 1);
        if (error)
            throw error;
        const organizerIds = (data ?? []).map((organizer) => organizer.id);
        const { data: events, error: eventsError } = organizerIds.length
            ? await this.clients.admin.from('events').select('id,organizer_id').in('organizer_id', organizerIds)
            : { data: [], error: null };
        if (eventsError)
            throw eventsError;
        const eventIds = (events ?? []).map((event) => event.id);
        const { data: registrations, error: registrationsError } = eventIds.length
            ? await this.clients.admin
                .from('event_registrations')
                .select('event_id,total_amount,quantity,payment_status')
                .in('event_id', eventIds)
            : { data: [], error: null };
        if (registrationsError)
            throw registrationsError;
        return {
            data: (data ?? []),
            events: (events ?? []),
            registrations: (registrations ?? []),
            total: count ?? 0,
        };
    }
    async updateOrganizer(id, input) {
        const { data: before, error: beforeError } = await this.clients.admin
            .from('organizers')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (beforeError)
            throw beforeError;
        if (!before)
            return null;
        const { data, error } = await this.clients.admin.from('organizers').update(input).eq('id', id).select('*').single();
        if (error)
            throw error;
        if (input.status === 'active' && before.user_id) {
            const { error: roleError } = await this.clients.admin
                .from('profiles')
                .update({ role: 'organizer' })
                .eq('id', before.user_id)
                .neq('role', 'super_admin');
            if (roleError)
                throw roleError;
        }
        return { before: before, data: data };
    }
    async listTransactionPage(query) {
        const { data, error } = await this.clients.admin.rpc('list_super_admin_transactions', {
            target_limit: query.limit,
            target_page: query.page,
            target_search: query.search,
            target_status: query.status ?? null,
        });
        if (error)
            throw error;
        const result = data;
        return { data: result?.data ?? [], total: Number(result?.total ?? 0) };
    }
    async listPayouts() {
        const { data, error } = await this.clients.admin
            .from('organizer_payouts')
            .select('*,organizer_id:organizers(id,name,email,payout_status)')
            .order('requested_at', { ascending: false })
            .limit(100);
        if (error)
            throw error;
        return (data ?? []);
    }
    async getOrganizer(id) {
        const { data, error } = await this.clients.admin.from('organizers').select('*').eq('id', id).maybeSingle();
        if (error)
            throw error;
        return data;
    }
    async getConfiguration() {
        const { data, error } = await this.clients.admin.from('event_configurations').select('*').eq('id', 1).single();
        if (error)
            throw error;
        return data;
    }
    async getAvailableBalance(organizerId) {
        const { data, error } = await this.clients.admin.rpc('get_organizer_available_balance', {
            target_organizer: organizerId,
        });
        if (error)
            throw error;
        return Number(data ?? 0);
    }
    async createPayout(input) {
        const { data, error } = await this.clients.admin.rpc('create_organizer_payout', {
            target_actor: input.actorId,
            target_amount: input.amount,
            target_id: input.id,
            target_organizer: input.organizerId,
            target_provider: input.provider,
            target_provider_fee: input.providerFee,
        });
        if (error)
            throw error;
        return data;
    }
    async finishPayout(id, input) {
        const { data, error } = await this.clients.admin
            .from('organizer_payouts')
            .update(input)
            .eq('id', id)
            .select('*')
            .single();
        if (error)
            throw error;
        return data;
    }
    async failPayout(id, failureReason, processedAt) {
        const { error } = await this.clients.admin
            .from('organizer_payouts')
            .update({ status: 'failed', failure_reason: failureReason.slice(0, 2_000), processed_at: processedAt })
            .eq('id', id);
        if (error)
            throw error;
    }
    async updateConfiguration(input) {
        const before = await this.getConfiguration();
        const { data, error } = await this.clients.admin
            .from('event_configurations')
            .update(input)
            .eq('id', 1)
            .select('*')
            .single();
        if (error)
            throw error;
        return { before, data: data };
    }
    async getSiteSettings() {
        const { data, error } = await this.clients.admin
            .from('site_settings')
            .select(siteSettingsColumns)
            .order('date_created', { ascending: true })
            .limit(1)
            .maybeSingle();
        if (error)
            throw error;
        if (data)
            return data;
        // A fresh install has no row yet; create one so branding is always editable.
        const { data: created, error: createError } = await this.clients.admin
            .from('site_settings')
            .insert({ title: 'Events Manager' })
            .select(siteSettingsColumns)
            .single();
        if (createError)
            throw createError;
        return created;
    }
    async updateSiteSettings(input) {
        const before = await this.getSiteSettings();
        const { data, error } = await this.clients.admin
            .from('site_settings')
            .update({ ...input, date_updated: new Date().toISOString() })
            .eq('id', before.id)
            .select(siteSettingsColumns)
            .single();
        if (error)
            throw error;
        return { before, data: data };
    }
    async isImageMedia(id) {
        const { data, error } = await this.clients.admin.from('media_files').select('type').eq('id', id).maybeSingle();
        if (error)
            throw error;
        return typeof data?.type === 'string' && data.type.startsWith('image/');
    }
    async listCategories() {
        const { data, error } = await this.clients.admin
            .from('event_categories')
            .select('id,name,slug,description,icon,color,sort')
            .order('sort', { ascending: true, nullsFirst: false })
            .order('name');
        if (error)
            throw error;
        return (data ?? []);
    }
    /** Events per category, so the UI can warn before a delete unassigns them. */
    async countEventsByCategory() {
        const { data, error } = await this.clients.admin.from('events').select('category_id');
        if (error)
            throw error;
        const counts = {};
        for (const row of data ?? []) {
            const id = row.category_id;
            if (id)
                counts[id] = (counts[id] ?? 0) + 1;
        }
        return counts;
    }
    async findCategoryBySlug(slug, exceptId) {
        let query = this.clients.admin.from('event_categories').select('id').eq('slug', slug);
        if (exceptId)
            query = query.neq('id', exceptId);
        const { data, error } = await query.maybeSingle();
        if (error)
            throw error;
        return data;
    }
    async createCategory(input) {
        const { data, error } = await this.clients.admin.from('event_categories').insert(input).select('*').single();
        if (error)
            throw error;
        return data;
    }
    async getCategory(id) {
        const { data, error } = await this.clients.admin
            .from('event_categories')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error)
            throw error;
        return (data ?? null);
    }
    async updateCategory(id, input) {
        const before = await this.getCategory(id);
        if (!before)
            return null;
        const { data, error } = await this.clients.admin
            .from('event_categories')
            .update(input)
            .eq('id', id)
            .select('*')
            .single();
        if (error)
            throw error;
        return { before, data: data };
    }
    async deleteCategory(id) {
        const before = await this.getCategory(id);
        if (!before)
            return null;
        const { error } = await this.clients.admin.from('event_categories').delete().eq('id', id);
        if (error)
            throw error;
        return before;
    }
    async recordAudit(input) {
        const { error } = await this.clients.admin.from('audit_logs').insert({
            actor_id: input.actorId,
            action: input.action,
            resource_type: input.resourceType,
            resource_id: input.resourceId == null ? null : String(input.resourceId),
            before_data: (input.before ?? null),
            after_data: (input.after ?? null),
            metadata: { ip: input.context.ip, userAgent: input.context.userAgent },
        });
        if (error)
            throw error;
    }
}
//# sourceMappingURL=super-admin-repository.js.map