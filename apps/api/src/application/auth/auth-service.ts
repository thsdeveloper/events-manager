import { ApiError } from '../../shared/errors.js';

export interface AuthIdentity {
	email?: string;
	id: string;
	userMetadata?: Record<string, unknown>;
}

export interface AuthSession {
	accessToken: string;
	expiresIn: number;
	refreshToken: string;
}

export interface AuthResult {
	session: AuthSession | null;
	user: AuthIdentity | null;
}

export interface SerializedUser extends Record<string, unknown> {
	email: string | null;
	id: string;
	organizer: (Record<string, unknown> & { status?: string }) | null;
	role: string;
	status: string;
}

export interface OrganizerAuthorization extends Record<string, unknown> {
	id: string;
	status: string;
}

export interface UserProfileInput {
	avatar?: string | null;
	description?: string | null;
	email?: string;
	first_name?: string | null;
	last_name?: string | null;
	location?: string | null;
	title?: string | null;
}

export class AuthProviderError extends Error {
	constructor(
		message: string,
		readonly status?: number,
		readonly code?: string,
	) {
		super(message);
	}
}

export interface AuthRepository {
	assertOrganizerOwnsEvent(organizerId: string, eventId: string): Promise<boolean>;
	confirmEmail(email: string, token: string): Promise<AuthResult>;
	findActiveOrganizer(userId: string): Promise<OrganizerAuthorization | null>;
	findOwnedRegistration(organizerId: string, registrationId: string): Promise<unknown | null>;
	findSuperAdminProfile(userId: string): Promise<Record<string, unknown> | null>;
	getIdentity(accessToken: string): Promise<AuthIdentity | null>;
	login(email: string, password: string): Promise<AuthResult>;
	refresh(refreshToken: string): Promise<AuthResult>;
	register(input: {
		email: string;
		firstName: string;
		lastName: string;
		password: string;
		redirectTo: string;
	}): Promise<AuthResult>;
	requestPasswordReset(email: string, redirectTo: string): Promise<void>;
	resendEmailConfirmation(email: string, redirectTo: string): Promise<void>;
	resetPassword(accessToken: string, password: string): Promise<void>;
	serialize(user: AuthIdentity): Promise<SerializedUser>;
	signOut(accessToken: string): Promise<void>;
	updatePassword(userId: string, password: string): Promise<void>;
	updateProfile(user: AuthIdentity, input: UserProfileInput): Promise<unknown>;
}

export class AuthService {
	constructor(private readonly repository: AuthRepository) {}

	async authenticate(accessToken: string | null) {
		if (!accessToken) throw new ApiError('Você precisa estar autenticado.', 401, 'UNAUTHORIZED');
		const user = await this.repository.getIdentity(accessToken);
		if (!user) throw new ApiError('Sua sessão expirou. Entre novamente.', 401, 'INVALID_SESSION');
		return { accessToken, user };
	}

	async register(input: { email: string; firstName: string; lastName: string; password: string; redirectTo: string }) {
		try {
			const result = await this.repository.register(input);
			if (!result.user) throw new ApiError('Não foi possível criar o usuário.', 500, 'REGISTRATION_ERROR');
			return result as AuthResult & { user: AuthIdentity };
		} catch (error) {
			if (error instanceof ApiError) throw error;
			if (error instanceof AuthProviderError) {
				throw new ApiError(error.message, error.status ?? 400, 'REGISTRATION_ERROR');
			}
			throw error;
		}
	}

	async confirmEmail(email: string, token: string) {
		try {
			const result = await this.repository.confirmEmail(email, token);
			if (!result.session || !result.user) throw new Error('invalid confirmation');
			return result as { session: AuthSession; user: AuthIdentity };
		} catch {
			throw new ApiError('Código inválido ou expirado.', 400, 'INVALID_EMAIL_CONFIRMATION_CODE');
		}
	}

	async resendEmailConfirmation(email: string, redirectTo: string) {
		try {
			await this.repository.resendEmailConfirmation(email, redirectTo);
		} catch (error) {
			const rateLimited =
				error instanceof AuthProviderError && (error.status === 429 || error.code === 'over_email_send_rate_limit');
			throw new ApiError(
				rateLimited
					? 'Aguarde um minuto antes de solicitar outro código.'
					: 'Não foi possível reenviar o código de confirmação.',
				rateLimited ? 429 : 400,
				rateLimited ? 'EMAIL_CONFIRMATION_RATE_LIMIT' : 'EMAIL_CONFIRMATION_RESEND_ERROR',
			);
		}
	}

	async login(email: string, password: string) {
		try {
			const result = await this.repository.login(email, password);
			if (!result.session || !result.user) throw new Error('invalid credentials');
			return result as { session: AuthSession; user: AuthIdentity };
		} catch (error) {
			if (error instanceof AuthProviderError && error.code === 'email_not_confirmed') {
				throw new ApiError('Confirme seu e-mail antes de entrar.', 403, 'EMAIL_NOT_CONFIRMED');
			}
			throw new ApiError('E-mail ou senha inválidos.', 401, 'INVALID_CREDENTIALS');
		}
	}

	async refresh(refreshToken: string) {
		try {
			const result = await this.repository.refresh(refreshToken);
			if (!result.session || !result.user) throw new Error('invalid refresh token');
			return result as { session: AuthSession; user: AuthIdentity };
		} catch {
			throw new ApiError('Não foi possível renovar a sessão.', 401, 'INVALID_REFRESH_TOKEN');
		}
	}

	serialize(user: AuthIdentity) {
		return this.repository.serialize(user);
	}

	signOut(accessToken: string) {
		return this.repository.signOut(accessToken);
	}

	requestPasswordReset(email: string, redirectTo: string) {
		return this.repository.requestPasswordReset(email, redirectTo).catch(() => undefined);
	}

	async resetPassword(accessToken: string, password: string) {
		try {
			await this.repository.resetPassword(accessToken, password);
		} catch {
			throw new ApiError('O link de recuperação é inválido ou expirou.', 400, 'PASSWORD_RESET_ERROR');
		}
	}

	updateProfile(user: AuthIdentity, input: UserProfileInput) {
		return this.repository.updateProfile(user, input);
	}

	updatePassword(userId: string, password: string) {
		return this.repository.updatePassword(userId, password);
	}

	async requireOrganizer(userId: string) {
		const organizer = await this.repository.findActiveOrganizer(userId);
		if (!organizer) {
			throw new ApiError('É necessário possuir um perfil de organizador ativo.', 403, 'ORGANIZER_REQUIRED');
		}
		return organizer;
	}

	async requireSuperAdmin(userId: string) {
		const profile = await this.repository.findSuperAdminProfile(userId);
		if (!profile || profile.role !== 'super_admin' || profile.status !== 'active') {
			throw new ApiError('Acesso exclusivo para super administradores.', 403, 'SUPER_ADMIN_REQUIRED');
		}
		return profile;
	}

	async assertOrganizerOwnsEvent(organizerId: string, eventId: string) {
		if (!(await this.repository.assertOrganizerOwnsEvent(organizerId, eventId))) {
			throw new ApiError('Evento não encontrado ou sem permissão.', 404, 'EVENT_NOT_FOUND');
		}
	}

	async getOwnedRegistration(organizerId: string, registrationId: string) {
		const registration = await this.repository.findOwnedRegistration(organizerId, registrationId);
		if (!registration) {
			throw new ApiError('Inscrição não encontrada ou sem permissão.', 404, 'REGISTRATION_NOT_FOUND');
		}
		return registration;
	}
}
