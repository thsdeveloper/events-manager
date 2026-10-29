const couponSelection = 'id,event_id,code,description,discount_type,discount_value,status,starts_at,expires_at,max_uses,uses,date_created,date_updated';
export class SupabaseCouponRepository {
    clients;
    constructor(clients) {
        this.clients = clients;
    }
    /** Só o cupom ativo entra na validação; o inativo se comporta como inexistente. */
    async findActiveByCode(eventId, code) {
        const { data, error } = await this.clients.admin
            .from('event_coupons')
            .select(couponSelection)
            .eq('event_id', eventId)
            .eq('code', code)
            .eq('status', 'active')
            .maybeSingle();
        if (error)
            throw error;
        return (data ?? null);
    }
    async findTicketPrices(eventId, ticketIds) {
        const { data, error } = await this.clients.admin
            .from('event_tickets')
            .select('id,buyer_price,price')
            .eq('event_id', eventId)
            .in('id', ticketIds);
        if (error)
            throw error;
        return (data ?? []);
    }
    async ownsEvent(userId, eventId) {
        const { data, error } = await this.clients.admin
            .from('events')
            .select('id,organizer_id:organizers!inner(user_id)')
            .eq('id', eventId)
            .eq('organizers.user_id', userId)
            .maybeSingle();
        if (error)
            throw error;
        return data !== null;
    }
    async listByEvent(eventId) {
        const { data, error } = await this.clients.admin
            .from('event_coupons')
            .select(couponSelection)
            .eq('event_id', eventId)
            .order('date_created', { ascending: false });
        if (error)
            throw error;
        return (data ?? []);
    }
    async createForEvent(eventId, input) {
        const { data, error } = await this.clients.admin
            .from('event_coupons')
            .insert({ ...input, event_id: eventId })
            .select(couponSelection)
            .single();
        if (error)
            throw error;
        return data;
    }
    async updateForEvent(eventId, couponId, input) {
        const { data, error } = await this.clients.admin
            .from('event_coupons')
            .update({ ...input, date_updated: new Date().toISOString() })
            .eq('id', couponId)
            .eq('event_id', eventId)
            .select(couponSelection)
            .maybeSingle();
        if (error)
            throw error;
        return (data ?? null);
    }
    async deleteForEvent(eventId, couponId) {
        const { data, error } = await this.clients.admin
            .from('event_coupons')
            .delete()
            .eq('id', couponId)
            .eq('event_id', eventId)
            .select('id')
            .maybeSingle();
        if (error)
            throw error;
        return data !== null;
    }
}
//# sourceMappingURL=coupon-repository.js.map