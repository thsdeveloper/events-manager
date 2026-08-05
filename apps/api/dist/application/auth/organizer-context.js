import { ApiError } from '../../shared/errors.js';
import { requireUser } from './session.js';
export async function requireOrganizer(request, clients) {
    const auth = await requireUser(request, clients);
    const { data: organizer, error } = await clients.admin
        .from('organizers')
        .select('*,logo:media_files(*)')
        .eq('user_id', auth.user.id)
        .maybeSingle();
    if (error)
        throw error;
    if (!organizer || organizer.status !== 'active') {
        throw new ApiError('É necessário possuir um perfil de organizador ativo.', 403, 'ORGANIZER_REQUIRED');
    }
    return { ...auth, organizer };
}
export async function assertOrganizerOwnsEvent(clients, organizerId, eventId) {
    const { data } = await clients.admin
        .from('events')
        .select('id')
        .eq('id', eventId)
        .eq('organizer_id', organizerId)
        .maybeSingle();
    if (!data)
        throw new ApiError('Evento não encontrado ou sem permissão.', 404, 'EVENT_NOT_FOUND');
}
export async function getOwnedRegistration(clients, organizerId, registrationId) {
    const { data, error } = await clients.admin
        .from('event_registrations')
        .select('*,event_id:events!inner(*),ticket_type_id:event_tickets(*),user_id:profiles(*)')
        .eq('id', registrationId)
        .eq('event_id.organizer_id', organizerId)
        .maybeSingle();
    if (error)
        throw error;
    if (!data)
        throw new ApiError('Inscrição não encontrada ou sem permissão.', 404, 'REGISTRATION_NOT_FOUND');
    return data;
}
//# sourceMappingURL=organizer-context.js.map