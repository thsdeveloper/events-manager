import type {
	AuthIdentity,
	AuthRepository,
	AuthResult,
	AuthSession,
	OrganizerAuthorization,
	SerializedUser,
	UserProfileInput,
} from '../../application/auth/auth-service.js';
import { AuthProviderError, AuthService } from '../../application/auth/auth-service.js';
import type { SupabaseClients } from './clients.js';

function toIdentity(user: { email?: string; id: string; user_metadata?: Record<string, unknown> }): AuthIdentity {
	return { id: user.id, email: user.email, userMetadata: user.user_metadata };
}

function toSession(
	session: { access_token: string; expires_in: number; refresh_token: string } | null,
): AuthSession | null {
	return session
		? { accessToken: session.access_token, expiresIn: session.expires_in, refreshToken: session.refresh_token }
		: null;
}

function providerError(error: { code?: string; message: string; status?: number }) {
	return new AuthProviderError(error.message, error.status, error.code);
}

export class SupabaseAuthRepository implements AuthRepository {
	constructor(private readonly clients: SupabaseClients) {}

	async register(input: {
		email: string;
		firstName: string;
		lastName: string;
		password: string;
		redirectTo: string;
	}): Promise<AuthResult> {
		const { data, error } = await this.clients.public.auth.signUp({
			email: input.email,
			password: input.password,
			options: {
				data: { first_name: input.firstName, last_name: input.lastName },
				emailRedirectTo: input.redirectTo,
			},
		});
		if (error) throw providerError(error);
		return { user: data.user ? toIdentity(data.user) : null, session: toSession(data.session) };
	}

	async confirmEmail(email: string, token: string): Promise<AuthResult> {
		const { data, error } = await this.clients.public.auth.verifyOtp({ email, token, type: 'email' });
		if (error) throw providerError(error);
		return { user: data.user ? toIdentity(data.user) : null, session: toSession(data.session) };
	}

	async resendEmailConfirmation(email: string, redirectTo: string) {
		const { error } = await this.clients.public.auth.resend({
			type: 'signup',
			email,
			options: { emailRedirectTo: redirectTo },
		});
		if (error) throw providerError(error);
	}

	async login(email: string, password: string): Promise<AuthResult> {
		const { data, error } = await this.clients.public.auth.signInWithPassword({ email, password });
		if (error) throw providerError(error);
		return { user: data.user ? toIdentity(data.user) : null, session: toSession(data.session) };
	}

	async refresh(refreshToken: string): Promise<AuthResult> {
		const { data, error } = await this.clients.public.auth.refreshSession({ refresh_token: refreshToken });
		if (error) throw providerError(error);
		return { user: data.user ? toIdentity(data.user) : null, session: toSession(data.session) };
	}

	async getIdentity(accessToken: string) {
		const { data, error } = await this.clients.admin.auth.getUser(accessToken);
		return error || !data.user ? null : toIdentity(data.user);
	}

	async serialize(user: AuthIdentity): Promise<SerializedUser> {
		const [{ data: profile, error: profileError }, { data: organizer, error: organizerError }] = await Promise.all([
			this.clients.admin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
			this.clients.admin.from('organizers').select('*').eq('user_id', user.id).maybeSingle(),
		]);
		if (profileError) throw profileError;
		if (organizerError) throw organizerError;
		return {
			id: user.id,
			email: user.email ?? profile?.email ?? null,
			first_name: profile?.first_name ?? user.userMetadata?.first_name ?? null,
			last_name: profile?.last_name ?? user.userMetadata?.last_name ?? null,
			avatar: profile?.avatar ?? null,
			role: profile?.role ?? 'attendee',
			status: profile?.status ?? 'active',
			organizer: (organizer as SerializedUser['organizer']) ?? null,
		};
	}

	async signOut(accessToken: string) {
		const { error } = await this.clients.admin.auth.admin.signOut(accessToken);
		if (error) throw providerError(error);
	}

	async requestPasswordReset(email: string, redirectTo: string) {
		const { error } = await this.clients.public.auth.resetPasswordForEmail(email, { redirectTo });
		if (error) throw providerError(error);
	}

	async resetPassword(accessToken: string, password: string) {
		const { error } = await this.clients.forAccessToken(accessToken).auth.updateUser({ password });
		if (error) throw providerError(error);
	}

	async updateProfile(
		user: AuthIdentity,
		input: UserProfileInput,
	) {
		const metadata: Record<string, string> = {};
		if (input.first_name) metadata.first_name = input.first_name;
		if (input.last_name) metadata.last_name = input.last_name;
		if (input.email || Object.keys(metadata).length) {
			const { error } = await this.clients.admin.auth.admin.updateUserById(user.id, {
				...(input.email ? { email: input.email } : {}),
				user_metadata: metadata,
			});
			if (error) throw providerError(error);
		}
		const { data, error } = await this.clients.admin
			.from('profiles')
			.update({ ...input, email: input.email ?? user.email })
			.eq('id', user.id)
			.select()
			.single();
		if (error) throw error;
		return data;
	}

	async updatePassword(userId: string, password: string) {
		const { error } = await this.clients.admin.auth.admin.updateUserById(userId, { password });
		if (error) throw providerError(error);
	}

	async findActiveOrganizer(userId: string): Promise<OrganizerAuthorization | null> {
		const { data, error } = await this.clients.admin
			.from('organizers')
			.select('*,logo:media_files(*)')
			.eq('user_id', userId)
			.eq('status', 'active')
			.maybeSingle();
		if (error) throw error;
		return data as OrganizerAuthorization | null;
	}

	async findSuperAdminProfile(userId: string) {
		const { data, error } = await this.clients.admin.from('profiles').select('*').eq('id', userId).maybeSingle();
		if (error) throw error;
		return data;
	}

	async assertOrganizerOwnsEvent(organizerId: string, eventId: string) {
		const { data, error } = await this.clients.admin
			.from('events')
			.select('id')
			.eq('id', eventId)
			.eq('organizer_id', organizerId)
			.maybeSingle();
		if (error) throw error;
		return Boolean(data);
	}

	async findOwnedRegistration(organizerId: string, registrationId: string) {
		const { data, error } = await this.clients.admin
			.from('event_registrations')
			.select('*,event_id:events!inner(*),ticket_type_id:event_tickets(*),user_id:profiles(*)')
			.eq('id', registrationId)
			.eq('event_id.organizer_id', organizerId)
			.maybeSingle();
		if (error) throw error;
		return data;
	}
}

export function createSupabaseAuthService(clients: SupabaseClients) {
	return new AuthService(new SupabaseAuthRepository(clients));
}
