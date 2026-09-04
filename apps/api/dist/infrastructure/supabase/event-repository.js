export const publicEventSelection = `
  id,status,sort,date_created,date_updated,title,slug,description,short_description,event_type,start_date,end_date,
  location_name,location_address,latitude,longitude,max_attendees,registration_start,registration_end,is_free,tags,featured,
  cover_image:media_files(id,bucket,path,filename,title,type,filesize,width,height,description,metadata,date_created),
  organizer_id:organizers(id,name,email,phone,description,logo,website),
  category_id:event_categories(id,sort,name,slug,description,icon,color),
  tickets:event_tickets(id,event_id,title,description,status,quantity,quantity_sold,price,service_fee_type,buyer_price,sale_start_date,sale_end_date,min_quantity_per_purchase,max_quantity_per_purchase,visibility,allow_installments,max_installments,min_amount_for_installments,sort,date_created,date_updated)
`;
const publicEventListSelection = `
  id,title,slug,short_description,event_type,start_date,end_date,location_name,is_free,featured,
  cover_image:media_files(id,bucket,path,filename,title,type,filesize,width,height,description,metadata,date_created),
  category_id:event_categories(id,name,slug,color)
`;
const organizerEventSelection = `
  *,cover_image:media_files(*),organizer_id:organizers(id,name,email,phone,description,logo,website),
  category_id:event_categories(*),tickets:event_tickets(*),registrations:event_registrations(id,status,payment_status,quantity)
`;
export class SupabaseEventRepository {
    clients;
    constructor(clients) {
        this.clients = clients;
    }
    async organizerForUser(userId, requireActive = false) {
        let query = this.clients.admin.from('organizers').select('id,status').eq('user_id', userId);
        if (requireActive)
            query = query.eq('status', 'active');
        const { data, error } = await query.maybeSingle();
        if (error)
            throw error;
        return data;
    }
    async findPublicBySlug(slug) {
        const { data, error } = await this.clients.admin
            .from('events')
            .select(publicEventSelection)
            .eq('slug', slug)
            .eq('status', 'published')
            .eq('event_tickets.status', 'active')
            .eq('event_tickets.visibility', 'public')
            .maybeSingle();
        if (error)
            throw error;
        return data;
    }
    async listPublic(query) {
        const from = (query.page - 1) * query.limit;
        let builder = this.clients.admin
            .from('events')
            .select(publicEventListSelection, { count: 'exact' })
            .eq('status', 'published')
            .gte('end_date', new Date().toISOString());
        if (query.search)
            builder = builder.ilike('title', `%${query.search}%`);
        const { data, count, error } = await builder
            .order('start_date', { ascending: true })
            .range(from, from + query.limit - 1);
        if (error)
            throw error;
        return { data: data ?? [], total: count ?? 0 };
    }
    async listForUser(userId) {
        const organizer = await this.organizerForUser(userId);
        if (!organizer)
            return [];
        const { data, error } = await this.clients.admin
            .from('events')
            .select('*,cover_image:media_files(*),category_id:event_categories(*),tickets:event_tickets(*),registrations:event_registrations(id,status,payment_status,quantity)')
            .eq('organizer_id', organizer.id)
            .order('date_created', { ascending: false });
        if (error)
            throw error;
        return (data ?? []);
    }
    async listCategories() {
        const { data, error } = await this.clients.admin
            .from('event_categories')
            .select('id,sort,name,slug,description,icon,color')
            .order('name');
        if (error)
            throw error;
        return data ?? [];
    }
    async createForUser(userId, input) {
        const organizer = await this.organizerForUser(userId, true);
        if (!organizer)
            return 'organizer_required';
        const { data, error } = await this.clients.admin
            .from('events')
            .insert({ ...input, organizer_id: organizer.id, user_created: userId })
            .select('*')
            .single();
        if (error)
            throw error;
        return data;
    }
    async findForUser(userId, id) {
        const organizer = await this.organizerForUser(userId);
        if (!organizer)
            return null;
        const { data, error } = await this.clients.admin
            .from('events')
            .select(organizerEventSelection)
            .eq('id', id)
            .eq('organizer_id', organizer.id)
            .maybeSingle();
        if (error)
            throw error;
        return data;
    }
    async updateForUser(userId, id, input) {
        const organizer = await this.organizerForUser(userId);
        if (!organizer)
            return null;
        const { data, error } = await this.clients.admin
            .from('events')
            .update({ ...input, user_updated: userId })
            .eq('id', id)
            .eq('organizer_id', organizer.id)
            .select('*')
            .maybeSingle();
        if (error)
            throw error;
        return data;
    }
    async deleteForUser(userId, id) {
        const organizer = await this.organizerForUser(userId);
        if (!organizer)
            return false;
        const { error, count } = await this.clients.admin
            .from('events')
            .delete({ count: 'exact' })
            .eq('id', id)
            .eq('organizer_id', organizer.id);
        if (error)
            throw error;
        return Boolean(count);
    }
}
//# sourceMappingURL=event-repository.js.map