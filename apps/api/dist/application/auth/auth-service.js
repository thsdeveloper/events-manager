import { ApiError } from '../../shared/errors.js';
export class AuthProviderError extends Error {
    status;
    code;
    constructor(message, status, code) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
export class AuthService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async authenticate(accessToken) {
        if (!accessToken)
            throw new ApiError('Você precisa estar autenticado.', 401, 'UNAUTHORIZED');
        const user = await this.repository.getIdentity(accessToken);
        if (!user)
            throw new ApiError('Sua sessão expirou. Entre novamente.', 401, 'INVALID_SESSION');
        return { accessToken, user };
    }
    async register(input) {
        try {
            const result = await this.repository.register(input);
            if (!result.user)
                throw new ApiError('Não foi possível criar o usuário.', 500, 'REGISTRATION_ERROR');
            return result;
        }
        catch (error) {
            if (error instanceof ApiError)
                throw error;
            if (error instanceof AuthProviderError) {
                throw new ApiError(error.message, error.status ?? 400, 'REGISTRATION_ERROR');
            }
            throw error;
        }
    }
    async confirmEmail(email, token) {
        try {
            const result = await this.repository.confirmEmail(email, token);
            if (!result.session || !result.user)
                throw new Error('invalid confirmation');
            return result;
        }
        catch {
            throw new ApiError('Código inválido ou expirado.', 400, 'INVALID_EMAIL_CONFIRMATION_CODE');
        }
    }
    async resendEmailConfirmation(email, redirectTo) {
        try {
            await this.repository.resendEmailConfirmation(email, redirectTo);
        }
        catch (error) {
            const rateLimited = error instanceof AuthProviderError && (error.status === 429 || error.code === 'over_email_send_rate_limit');
            throw new ApiError(rateLimited
                ? 'Aguarde um minuto antes de solicitar outro código.'
                : 'Não foi possível reenviar o código de confirmação.', rateLimited ? 429 : 400, rateLimited ? 'EMAIL_CONFIRMATION_RATE_LIMIT' : 'EMAIL_CONFIRMATION_RESEND_ERROR');
        }
    }
    async login(email, password) {
        try {
            const result = await this.repository.login(email, password);
            if (!result.session || !result.user)
                throw new Error('invalid credentials');
            return result;
        }
        catch (error) {
            if (error instanceof AuthProviderError && error.code === 'email_not_confirmed') {
                throw new ApiError('Confirme seu e-mail antes de entrar.', 403, 'EMAIL_NOT_CONFIRMED');
            }
            throw new ApiError('E-mail ou senha inválidos.', 401, 'INVALID_CREDENTIALS');
        }
    }
    async refresh(refreshToken) {
        try {
            const result = await this.repository.refresh(refreshToken);
            if (!result.session || !result.user)
                throw new Error('invalid refresh token');
            return result;
        }
        catch {
            throw new ApiError('Não foi possível renovar a sessão.', 401, 'INVALID_REFRESH_TOKEN');
        }
    }
    serialize(user) {
        return this.repository.serialize(user);
    }
    signOut(accessToken) {
        return this.repository.signOut(accessToken);
    }
    /**
     * Propaga a falha em vez de engoli-la. A resposta ao cliente continua genérica
     * (quem chama trata o erro sem vazar se o e-mail existe), mas SMTP fora do ar
     * ou rate limit do provedor precisam ser distinguíveis de um envio real.
     */
    requestPasswordReset(email, redirectTo) {
        return this.repository.requestPasswordReset(email, redirectTo);
    }
    async resetPassword(accessToken, password) {
        try {
            await this.repository.resetPassword(accessToken, password);
        }
        catch {
            throw new ApiError('O link de recuperação é inválido ou expirou.', 400, 'PASSWORD_RESET_ERROR');
        }
    }
    updateProfile(user, input) {
        return this.repository.updateProfile(user, input);
    }
    updatePassword(userId, password) {
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
    async changePassword(user, currentPassword, newPassword) {
        if (!user.email) {
            throw new ApiError('Sua conta não possui um e-mail de acesso.', 400, 'PASSWORD_CHANGE_ERROR');
        }
        if (currentPassword === newPassword) {
            throw new ApiError('A nova senha precisa ser diferente da atual.', 400, 'PASSWORD_UNCHANGED');
        }
        const valid = await this.repository.verifyPassword(user.email, currentPassword);
        // Deliberately the same message and status for a wrong password as for an
        // unusable one: the response must not become an account-state oracle.
        if (!valid)
            throw new ApiError('A senha atual está incorreta.', 400, 'INVALID_CURRENT_PASSWORD');
        await this.repository.updatePassword(user.id, newPassword);
    }
    revokeOtherSessions(accessToken) {
        return this.repository.revokeOtherSessions(accessToken);
    }
    async requireOrganizer(userId, preferredId) {
        const organizer = await this.repository.findActiveOrganizer(userId, preferredId);
        if (!organizer) {
            throw new ApiError('É necessário possuir um perfil de organizador ativo.', 403, 'ORGANIZER_REQUIRED');
        }
        return organizer;
    }
    listOrganizers(userId) {
        return this.repository.listOrganizers(userId);
    }
    async createOrganizer(userId, input) {
        const organizer = await this.repository.createOrganizer(userId, input);
        await this.repository.rememberActiveOrganizer(userId, organizer.id);
        return organizer;
    }
    /** Rejects ids the user does not own, so the switcher cannot be forged. */
    async activateOrganizer(userId, organizerId) {
        const owned = (await this.repository.listOrganizers(userId)).find((item) => item.id === organizerId);
        if (!owned)
            throw new ApiError('Organização não encontrada.', 404, 'ORGANIZER_NOT_FOUND');
        await this.repository.rememberActiveOrganizer(userId, organizerId);
        return owned;
    }
    async requireSuperAdmin(userId) {
        const profile = await this.repository.findSuperAdminProfile(userId);
        if (!profile || profile.role !== 'super_admin' || profile.status !== 'active') {
            throw new ApiError('Acesso exclusivo para super administradores.', 403, 'SUPER_ADMIN_REQUIRED');
        }
        return profile;
    }
    async assertOrganizerOwnsEvent(organizerId, eventId) {
        if (!(await this.repository.assertOrganizerOwnsEvent(organizerId, eventId))) {
            throw new ApiError('Evento não encontrado ou sem permissão.', 404, 'EVENT_NOT_FOUND');
        }
    }
    async getOwnedRegistration(organizerId, registrationId) {
        const registration = await this.repository.findOwnedRegistration(organizerId, registrationId);
        if (!registration) {
            throw new ApiError('Inscrição não encontrada ou sem permissão.', 404, 'REGISTRATION_NOT_FOUND');
        }
        return registration;
    }
}
//# sourceMappingURL=auth-service.js.map