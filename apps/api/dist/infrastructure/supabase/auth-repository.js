import { AuthProviderError, AuthService } from '../../application/auth/auth-service.js';
function toIdentity(user) {
    return { id: user.id, email: user.email, userMetadata: user.user_metadata };
}
function toSession(session) {
    return session
        ? { accessToken: session.access_token, expiresIn: session.expires_in, refreshToken: session.refresh_token }
        : null;
}
function providerError(error) {
    return new AuthProviderError(error.message, error.status, error.code);
}
export class SupabaseAuthRepository {
    clients;
    constructor(clients) {
        this.clients = clients;
    }
    async register(input) {
        const { data, error } = await this.clients.public.auth.signUp({
            email: input.email,
            password: input.password,
            options: {
                data: { first_name: input.firstName, last_name: input.lastName },
                emailRedirectTo: input.redirectTo,
            },
        });
        if (error)
            throw providerError(error);
        return { user: data.user ? toIdentity(data.user) : null, session: toSession(data.session) };
    }
    async confirmEmail(email, token) {
        const { data, error } = await this.clients.public.auth.verifyOtp({ email, token, type: 'email' });
        if (error)
            throw providerError(error);
        return { user: data.user ? toIdentity(data.user) : null, session: toSession(data.session) };
    }
    async resendEmailConfirmation(email, redirectTo) {
        const { error } = await this.clients.public.auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo: redirectTo },
        });
        if (error)
            throw providerError(error);
    }
    async login(email, password) {
        const { data, error } = await this.clients.public.auth.signInWithPassword({ email, password });
        if (error)
            throw providerError(error);
        return { user: data.user ? toIdentity(data.user) : null, session: toSession(data.session) };
    }
    async refresh(refreshToken) {
        const { data, error } = await this.clients.public.auth.refreshSession({ refresh_token: refreshToken });
        if (error)
            throw providerError(error);
        return { user: data.user ? toIdentity(data.user) : null, session: toSession(data.session) };
    }
    async getIdentity(accessToken) {
        const { data, error } = await this.clients.admin.auth.getUser(accessToken);
        return error || !data.user ? null : toIdentity(data.user);
    }
    async serialize(user) {
        const [{ data: profile, error: profileError }, { data: organizer, error: organizerError }] = await Promise.all([
            this.clients.admin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
            this.clients.admin.from('organizers').select('*').eq('user_id', user.id).maybeSingle(),
        ]);
        if (profileError)
            throw profileError;
        if (organizerError)
            throw organizerError;
        return {
            id: user.id,
            email: user.email ?? profile?.email ?? null,
            first_name: profile?.first_name ?? user.userMetadata?.first_name ?? null,
            last_name: profile?.last_name ?? user.userMetadata?.last_name ?? null,
            avatar: profile?.avatar ?? null,
            role: profile?.role ?? 'attendee',
            status: profile?.status ?? 'active',
            organizer: organizer ?? null,
        };
    }
    async signOut(accessToken) {
        const { error } = await this.clients.admin.auth.admin.signOut(accessToken);
        if (error)
            throw providerError(error);
    }
    async requestPasswordReset(email, redirectTo) {
        const { error } = await this.clients.public.auth.resetPasswordForEmail(email, { redirectTo });
        if (error)
            throw providerError(error);
    }
    /**
     * `auth.updateUser()` lê a sessão interna do cliente, que no servidor está sempre
     * vazia (persistSession: false) — o header Authorization global não a alimenta e a
     * chamada falha com AuthSessionMissingError. O token de recuperação é validado
     * explicitamente e a troca é aplicada pelo cliente admin, como em updateProfile.
     */
    async resetPassword(accessToken, password) {
        const { data, error } = await this.clients.admin.auth.getUser(accessToken);
        if (error)
            throw providerError(error);
        if (!data.user)
            throw providerError({ message: 'Token de recuperação inválido.', status: 401 });
        const { error: updateError } = await this.clients.admin.auth.admin.updateUserById(data.user.id, { password });
        if (updateError)
            throw providerError(updateError);
    }
    async updateProfile(user, input) {
        const metadata = {};
        if (input.first_name)
            metadata.first_name = input.first_name;
        if (input.last_name)
            metadata.last_name = input.last_name;
        if (input.email || Object.keys(metadata).length) {
            const { error } = await this.clients.admin.auth.admin.updateUserById(user.id, {
                ...(input.email ? { email: input.email } : {}),
                user_metadata: metadata,
            });
            if (error)
                throw providerError(error);
        }
        const { data, error } = await this.clients.admin
            .from('profiles')
            .update({ ...input, email: input.email ?? user.email })
            .eq('id', user.id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async updatePassword(userId, password) {
        const { error } = await this.clients.admin.auth.admin.updateUserById(userId, { password });
        if (error)
            throw providerError(error);
    }
    /**
     * `signInWithPassword` is the only way to check a password against Supabase,
     * and it mints a real session as a side effect. That session is revoked right
     * away so a reauthentication never leaves an extra refresh token behind.
     *
     * The revocation goes through the admin client with the probe's own token and
     * the `local` scope: `clients.public` is a single shared instance, so signing
     * out through it would act on whatever session it happens to hold, and the
     * default `global` scope would log the user out of every device — the opposite
     * of what checking a password should do.
     */
    async verifyPassword(email, password) {
        const { data, error } = await this.clients.public.auth.signInWithPassword({ email, password });
        if (error)
            return false;
        if (data.session?.access_token) {
            // A leftover probe session is not worth failing an otherwise valid
            // reauthentication, so the cleanup result is intentionally ignored.
            await this.clients.admin.auth.admin.signOut(data.session.access_token, 'local');
        }
        return true;
    }
    /**
     * `others` keeps the caller's own session alive and drops every other device.
     * `updateUserById` does not touch sessions, so without this a password changed
     * after a suspected compromise would leave the intruder logged in.
     */
    async revokeOtherSessions(accessToken) {
        const { error } = await this.clients.admin.auth.admin.signOut(accessToken, 'others');
        if (error)
            throw providerError(error);
    }
    async listOrganizers(userId) {
        const { data, error } = await this.clients.admin
            .from('organizers')
            .select('*,logo:media_files(*)')
            .eq('user_id', userId)
            .order('date_created', { ascending: true });
        if (error)
            throw error;
        return (data ?? []);
    }
    /**
     * Resolves which organization the request is acting on. A user may own
     * several, so the preferred id is honoured only after confirming ownership —
     * otherwise the cookie would be a way to read someone else's workspace.
     */
    async findActiveOrganizer(userId, preferredId) {
        const organizers = (await this.listOrganizers(userId)).filter((organizer) => organizer.status === 'active');
        if (organizers.length === 0)
            return null;
        if (preferredId) {
            const preferred = organizers.find((organizer) => organizer.id === preferredId);
            if (preferred)
                return preferred;
        }
        const { data } = await this.clients.admin
            .from('profiles')
            .select('active_organizer_id')
            .eq('id', userId)
            .maybeSingle();
        const remembered = organizers.find((organizer) => organizer.id === data?.active_organizer_id);
        return remembered ?? organizers[0];
    }
    async rememberActiveOrganizer(userId, organizerId) {
        const { error } = await this.clients.admin
            .from('profiles')
            .update({ active_organizer_id: organizerId })
            .eq('id', userId);
        if (error)
            throw error;
    }
    async createOrganizer(userId, input) {
        const { data, error } = await this.clients.admin
            .from('organizers')
            .insert({ ...input, user_id: userId, status: 'pending' })
            .select('*')
            .single();
        if (error)
            throw error;
        return data;
    }
    async findSuperAdminProfile(userId) {
        const { data, error } = await this.clients.admin.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (error)
            throw error;
        return data;
    }
    async assertOrganizerOwnsEvent(organizerId, eventId) {
        const { data, error } = await this.clients.admin
            .from('events')
            .select('id')
            .eq('id', eventId)
            .eq('organizer_id', organizerId)
            .maybeSingle();
        if (error)
            throw error;
        return Boolean(data);
    }
    async findOwnedRegistration(organizerId, registrationId) {
        const { data, error } = await this.clients.admin
            .from('event_registrations')
            .select('*,event_id:events!inner(*),ticket_type_id:event_tickets(*),user_id:profiles(*)')
            .eq('id', registrationId)
            .eq('event_id.organizer_id', organizerId)
            .maybeSingle();
        if (error)
            throw error;
        return data;
    }
}
export function createSupabaseAuthService(clients) {
    return new AuthService(new SupabaseAuthRepository(clients));
}
//# sourceMappingURL=auth-repository.js.map