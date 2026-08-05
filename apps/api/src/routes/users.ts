import type { FastifyInstance } from 'fastify';
import { requireUser } from '../application/auth/session.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';

export async function userRoutes(app: FastifyInstance, options: { clients: SupabaseClients }) {
  const { clients } = options;

  app.get('/api/user/tickets', async (request) => {
    const auth = await requireUser(request, clients);
    const { data, error } = await clients.admin
      .from('event_registrations')
      .select(`*,event_id:events(*,cover_image:media_files(*),category_id:event_categories(*)),ticket_type_id:event_tickets(*)`)
      .eq('user_id', auth.user.id)
      .in('payment_status', ['paid', 'free'])
      .order('date_created', { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

  app.get('/api/user/transactions', async (request) => {
    const auth = await requireUser(request, clients);
    const { data: registrations, error: registrationsError } = await clients.admin
      .from('event_registrations')
      .select('id')
      .eq('user_id', auth.user.id);
    if (registrationsError) throw registrationsError;
    const ids = (registrations ?? []).map((registration) => registration.id);
    if (!ids.length) return [];
    const { data, error } = await clients.admin
      .from('payment_transactions')
      .select('*,registration_id:event_registrations(*,event_id:events(*,cover_image:media_files(*)))')
      .in('registration_id', ids)
      .order('date_created', { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

  app.get('/api/my-registrations/pending-payments', async (request) => {
    const auth = await requireUser(request, clients);
    const { data, error } = await clients.admin
      .from('event_registrations')
      .select('*,event_id:events(*),ticket_type_id:event_tickets(*),installments:payment_installments(*)')
      .eq('user_id', auth.user.id)
      .eq('is_installment_payment', true)
      .in('installment_plan_status', ['active', 'defaulted'])
      .order('date_created', { ascending: false });
    if (error) throw error;
    const now = Date.now();
    const rows = (data ?? []).map((registration: any) => {
      const installments = [...(registration.installments ?? [])]
        .map((item: any) => item.status === 'pending' && new Date(item.due_date).getTime() < now ? { ...item, status: 'overdue' } : item)
        .sort((a: any, b: any) => a.installment_number - b.installment_number);
      const stats = {
        total: installments.length,
        paid: installments.filter((item: any) => item.status === 'paid').length,
        pending: installments.filter((item: any) => item.status === 'pending').length,
        overdue: installments.filter((item: any) => item.status === 'overdue').length,
      };
      return { ...registration, installments, installment_stats: stats, next_installment: installments.find((item: any) => ['pending', 'overdue'].includes(item.status)) ?? null };
    });
    return { success: true, data: rows, total: rows.length };
  });
}
