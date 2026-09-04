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
	/** AAAA-MM-DD, já validada pelo contrato (idade mínima). */
	birth_date?: string;
	/** Código IBGE do município. O rótulo em `location` é derivado dele. */
	city_id?: number | null;
	description?: string | null;
	/** CPF só com dígitos, já validado pelo contrato. */
	document?: string | null;
	/** Reautenticação exigida para trocar o CPF; nunca chega ao repositório. */
	current_password?: string;
	email?: string;
	first_name?: string | null;
	last_name?: string | null;
	/** Escrito só pelo repositório, a partir de `city_id`. */
	location?: string | null;
	/** Telefone com DDD, só dígitos, já validado pelo contrato. */
	phone?: string | null;
	/** Escrito só pelo caso de uso: trocar o telefone zera a confirmação. */
	phone_verified_at?: string | null;
}

/** O CPF informado já pertence a outra conta. */
export class DocumentAlreadyInUse extends Error {}

export interface DocumentChange {
	userId: string;
	previousDocument: string | null;
	newDocument: string | null;
	changedBy: 'user' | 'support';
	ip?: string;
	userAgent?: string;
}

/** Avisos fora de banda sobre dados sensíveis do perfil. */
export interface ProfileNotifications {
	documentChanged(notice: { email: string; name?: string | null; changedAt: Date }): Promise<unknown>;
}

export interface ProfileUpdateContext {
	ip?: string;
	userAgent?: string;
}

/** Tokens da sessão da pessoa; o provedor exige a sessão para trocar o telefone. */
export interface SessionTokens {
	accessToken: string;
	refreshToken: string;
}

/** Números brasileiros: DDD + número, guardados só com dígitos; o provedor fala E.164. */
export function toBrazilianE164(phoneDigits: string) {
	return `+55${phoneDigits}`;
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

/**
 * Remove um arquivo que o próprio usuário enviou. Devolve `false` sem tocar em
 * nada quando o arquivo não existe ou pertence a outra pessoa.
 */
export interface AvatarStorage {
	removeOwnedFile(fileId: string, ownerId: string): Promise<boolean>;
}

export interface AuthRepository {
	assertOrganizerOwnsEvent(organizerId: string, eventId: string): Promise<boolean>;
	findAvatarId(userId: string): Promise<string | null>;
	findDocument(userId: string): Promise<string | null>;
	/** Há ingresso pago ou movimentação financeira ligada à conta. */
	hasBillingActivity(userId: string): Promise<boolean>;
	recordDocumentChange(change: DocumentChange): Promise<void>;
	/** Pede ao provedor o código de confirmação para o novo telefone (fluxo phone_change). */
	requestPhoneChange(session: SessionTokens, phoneE164: string): Promise<void>;
	/** Confirma o código junto ao provedor; lança AuthProviderError se inválido ou expirado. */
	verifyPhoneChange(phoneE164: string, token: string): Promise<void>;
	/** Grava o telefone confirmado no perfil, com a data da confirmação. */
	markPhoneVerified(userId: string, phoneDigits: string): Promise<unknown>;
	confirmEmail(email: string, token: string): Promise<AuthResult>;
	createOrganizer(userId: string, input: { email: string; name: string }): Promise<OrganizerAuthorization>;
	findActiveOrganizer(userId: string, preferredId?: string): Promise<OrganizerAuthorization | null>;
	listOrganizers(userId: string): Promise<OrganizerAuthorization[]>;
	rememberActiveOrganizer(userId: string, organizerId: string): Promise<void>;
	findOwnedRegistration(organizerId: string, registrationId: string): Promise<unknown | null>;
	findSuperAdminProfile(userId: string): Promise<Record<string, unknown> | null>;
	getIdentity(accessToken: string): Promise<AuthIdentity | null>;
	login(email: string, password: string): Promise<AuthResult>;
	refresh(refreshToken: string): Promise<AuthResult>;
	register(input: {
		birthDate: string;
		email: string;
		firstName: string;
		lastName: string;
		password: string;
		redirectTo: string;
	}): Promise<AuthResult>;
	requestPasswordReset(email: string, redirectTo: string): Promise<void>;
	resendEmailConfirmation(email: string, redirectTo: string): Promise<void>;
	resetPassword(accessToken: string, password: string): Promise<void>;
	revokeOtherSessions(accessToken: string): Promise<void>;
	serialize(user: AuthIdentity): Promise<SerializedUser>;
	signOut(accessToken: string): Promise<void>;
	updatePassword(userId: string, password: string): Promise<void>;
	updateProfile(user: AuthIdentity, input: UserProfileInput): Promise<unknown>;
	verifyPassword(email: string, password: string): Promise<boolean>;
}

export class AuthService {
	constructor(
		private readonly repository: AuthRepository,
		private readonly avatarStorage?: AvatarStorage,
		private readonly notifications?: ProfileNotifications,
	) {}

	async authenticate(accessToken: string | null) {
		if (!accessToken) throw new ApiError('Você precisa estar autenticado.', 401, 'UNAUTHORIZED');
		const user = await this.repository.getIdentity(accessToken);
		if (!user) throw new ApiError('Sua sessão expirou. Entre novamente.', 401, 'INVALID_SESSION');
		return { accessToken, user };
	}

	async register(input: {
		birthDate: string;
		email: string;
		firstName: string;
		lastName: string;
		password: string;
		redirectTo: string;
	}) {
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

	/**
	 * Propaga a falha em vez de engoli-la. A resposta ao cliente continua genérica
	 * (quem chama trata o erro sem vazar se o e-mail existe), mas SMTP fora do ar
	 * ou rate limit do provedor precisam ser distinguíveis de um envio real.
	 */
	requestPasswordReset(email: string, redirectTo: string) {
		return this.repository.requestPasswordReset(email, redirectTo);
	}

	async resetPassword(accessToken: string, password: string) {
		try {
			await this.repository.resetPassword(accessToken, password);
		} catch {
			throw new ApiError('O link de recuperação é inválido ou expirou.', 400, 'PASSWORD_RESET_ERROR');
		}
	}

	/**
	 * Trocar ou limpar a foto apaga a anterior do storage: cada avatar é usado
	 * só pelo perfil, então mantê-lo seria acumular arquivos órfãos a cada troca.
	 * A limpeza acontece depois de o perfil estar salvo e nunca desfaz a troca:
	 * uma falha ao apagar deixa um arquivo sobrando, que é preferível a
	 * devolver erro para uma foto que já foi atualizada.
	 */
	async updateProfile(user: AuthIdentity, input: UserProfileInput, context: ProfileUpdateContext = {}) {
		const { current_password: currentPassword, ...profileInput } = input;
		// Um telefone novo ainda não foi confirmado; só confirmPhoneVerification marca.
		if (profileInput.phone !== undefined) profileInput.phone_verified_at = null;
		const documentChange = await this.authorizeDocumentChange(user, profileInput.document, currentPassword);
		const previousAvatar = input.avatar === undefined ? null : await this.repository.findAvatarId(user.id);
		const profile = await this.repository.updateProfile(user, profileInput);

		if (previousAvatar && previousAvatar !== input.avatar) {
			await this.avatarStorage?.removeOwnedFile(previousAvatar, user.id).catch(() => undefined);
		}
		if (documentChange) await this.recordDocumentChange(user, documentChange, context);

		return profile;
	}

	/**
	 * Confirmação de telefone pelo provedor (Supabase Auth, fluxo phone_change):
	 * o código vai por SMS para o número informado e só o provedor o valida. O
	 * intervalo mínimo entre envios é do provedor; aqui ele vira um 429 legível.
	 */
	async requestPhoneVerification(user: AuthIdentity, session: SessionTokens, phoneDigits: string) {
		try {
			await this.repository.requestPhoneChange(session, toBrazilianE164(phoneDigits));
		} catch (error) {
			if (error instanceof AuthProviderError && error.status === 429) {
				throw new ApiError('Aguarde um minuto antes de pedir outro código.', 429, 'PHONE_CODE_RATE_LIMITED');
			}
			// Sem provedor de SMS (ambiente local sem [auth.sms.twilio] e número fora
			// de test_otp, ou projeto hospedado sem provedor): é configuração, não um
			// problema com o telefone digitado, e a mensagem precisa dizer isso.
			if (error instanceof AuthProviderError && /sms provider/i.test(error.message)) {
				throw new ApiError(
					'O envio de SMS não está configurado neste ambiente.',
					503,
					'SMS_PROVIDER_UNAVAILABLE',
					{ reason: error.message },
					{ exposeDetail: true },
				);
			}
			// O provedor mantém um telefone por conta; a pessoa precisa saber qual campo.
			if (error instanceof AuthProviderError && (error.code === 'phone_exists' || error.status === 422)) {
				throw new ApiError('Este telefone já está confirmado em outra conta.', 409, 'PHONE_ALREADY_IN_USE', {
					field: 'phone',
				});
			}
			throw new ApiError('Não foi possível enviar o código para este telefone.', 400, 'PHONE_CODE_REQUEST_ERROR', {
				field: 'phone',
			});
		}
	}

	async confirmPhoneVerification(user: AuthIdentity, phoneDigits: string, token: string) {
		try {
			await this.repository.verifyPhoneChange(toBrazilianE164(phoneDigits), token);
		} catch {
			throw new ApiError('Código inválido ou expirado.', 400, 'INVALID_PHONE_CODE', { field: 'token' });
		}

		return this.repository.markPhoneVerified(user.id, phoneDigits);
	}

	/**
	 * Política do CPF: ele identifica a pessoa em ingressos nominais e comprovantes,
	 * então trocá-lo é raro e sensível. A troca exige a senha atual (uma sessão
	 * roubada não basta) e é recusada depois que houver atividade paga ligada à
	 * conta; nesse ponto só o suporte altera. Informar o primeiro CPF continua
	 * livre, mesmo depois de compras feitas sem ele.
	 */
	private async authorizeDocumentChange(
		user: AuthIdentity,
		nextDocument: string | null | undefined,
		currentPassword: string | undefined,
	): Promise<{ previousDocument: string | null; newDocument: string | null } | null> {
		if (nextDocument === undefined) return null;
		const previousDocument = await this.repository.findDocument(user.id);
		if (previousDocument === nextDocument) return null;

		if (previousDocument && (await this.repository.hasBillingActivity(user.id))) {
			throw new ApiError('Para alterar o CPF, fale com o suporte.', 409, 'DOCUMENT_LOCKED', { field: 'document' });
		}
		if (!currentPassword) {
			throw new ApiError('Confirme sua senha atual para alterar o CPF.', 403, 'REAUTHENTICATION_REQUIRED', {
				field: 'current_password',
			});
		}
		if (!user.email || !(await this.repository.verifyPassword(user.email, currentPassword))) {
			throw new ApiError('A senha atual está incorreta.', 400, 'INVALID_CURRENT_PASSWORD', {
				field: 'current_password',
			});
		}

		return { previousDocument, newDocument: nextDocument };
	}

	/**
	 * Registro e aviso acontecem depois de o perfil estar salvo. O registro é
	 * obrigatório: sem ele o suporte não investiga uma disputa. Só o e-mail é
	 * tolerante a falha, porque depende de um serviço externo e a troca já
	 * aconteceu; devolver erro aqui só confundiria a pessoa.
	 */
	private async recordDocumentChange(
		user: AuthIdentity,
		change: { previousDocument: string | null; newDocument: string | null },
		context: ProfileUpdateContext,
	) {
		await this.repository.recordDocumentChange({
			userId: user.id,
			previousDocument: change.previousDocument,
			newDocument: change.newDocument,
			changedBy: 'user',
			ip: context.ip,
			userAgent: context.userAgent,
		});
		if (user.email) {
			const firstName = (user.userMetadata?.first_name as string | undefined) ?? null;
			await this.notifications
				?.documentChanged({ email: user.email, name: firstName, changedAt: new Date() })
				.catch(() => undefined);
		}
	}

	updatePassword(userId: string, password: string) {
		return this.repository.updatePassword(userId, password);
	}

	/**
	 * Reauthenticates before changing the password, so a session cookie alone is
	 * never enough to take over an account: whoever steals a session can otherwise
	 * set a new password and lock the real owner out permanently. The current
	 * password is exactly what a session thief does not have.
	 *
	 * Only the verification and the change happen here. Revoking the other
	 * sessions and warning the account owner run afterwards and must not be able
	 * to report a change that already succeeded as a failure, so they are the
	 * caller's responsibility.
	 */
	async changePassword(user: AuthIdentity, currentPassword: string, newPassword: string) {
		if (!user.email) {
			throw new ApiError('Sua conta não possui um e-mail de acesso.', 400, 'PASSWORD_CHANGE_ERROR');
		}
		if (currentPassword === newPassword) {
			throw new ApiError('A nova senha precisa ser diferente da atual.', 400, 'PASSWORD_UNCHANGED');
		}

		const valid = await this.repository.verifyPassword(user.email, currentPassword);
		// Deliberately the same message and status for a wrong password as for an
		// unusable one: the response must not become an account-state oracle.
		if (!valid) throw new ApiError('A senha atual está incorreta.', 400, 'INVALID_CURRENT_PASSWORD');

		await this.repository.updatePassword(user.id, newPassword);
	}

	revokeOtherSessions(accessToken: string) {
		return this.repository.revokeOtherSessions(accessToken);
	}

	async requireOrganizer(userId: string, preferredId?: string) {
		const organizer = await this.repository.findActiveOrganizer(userId, preferredId);
		if (!organizer) {
			throw new ApiError('É necessário possuir um perfil de organizador ativo.', 403, 'ORGANIZER_REQUIRED');
		}
		return organizer;
	}

	listOrganizers(userId: string) {
		return this.repository.listOrganizers(userId);
	}

	async createOrganizer(userId: string, input: { email: string; name: string }) {
		const organizer = await this.repository.createOrganizer(userId, input);
		await this.repository.rememberActiveOrganizer(userId, organizer.id);
		return organizer;
	}

	/** Rejects ids the user does not own, so the switcher cannot be forged. */
	async activateOrganizer(userId: string, organizerId: string) {
		const owned = (await this.repository.listOrganizers(userId)).find((item) => item.id === organizerId);
		if (!owned) throw new ApiError('Organização não encontrada.', 404, 'ORGANIZER_NOT_FOUND');
		await this.repository.rememberActiveOrganizer(userId, organizerId);
		return owned;
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
