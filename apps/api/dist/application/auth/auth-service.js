import { getProfileChecklist } from '@events-manager/contracts';
import { ApiError } from '../../shared/errors.js';
/** O CPF informado já pertence a outra conta. */
export class DocumentAlreadyInUse extends Error {
}
/** Números brasileiros: DDD + número, guardados só com dígitos; o provedor fala E.164. */
export function toBrazilianE164(phoneDigits) {
    return `+55${phoneDigits}`;
}
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
    avatarStorage;
    notifications;
    constructor(repository, avatarStorage, notifications) {
        this.repository = repository;
        this.avatarStorage = avatarStorage;
        this.notifications = notifications;
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
    /**
     * Trocar ou limpar a foto apaga a anterior do storage: cada avatar é usado
     * só pelo perfil, então mantê-lo seria acumular arquivos órfãos a cada troca.
     * A limpeza acontece depois de o perfil estar salvo e nunca desfaz a troca:
     * uma falha ao apagar deixa um arquivo sobrando, que é preferível a
     * devolver erro para uma foto que já foi atualizada.
     */
    async updateProfile(user, input, context = {}) {
        const { current_password: currentPassword, ...profileInput } = input;
        // Um telefone novo ainda não foi confirmado; só confirmPhoneVerification marca.
        if (profileInput.phone !== undefined)
            profileInput.phone_verified_at = null;
        const documentChange = await this.authorizeDocumentChange(user, profileInput.document, currentPassword);
        const previousAvatar = input.avatar === undefined ? null : await this.repository.findAvatarId(user.id);
        const profile = await this.repository.updateProfile(user, profileInput);
        if (previousAvatar && previousAvatar !== input.avatar) {
            await this.avatarStorage?.removeOwnedFile(previousAvatar, user.id).catch(() => undefined);
        }
        if (documentChange)
            await this.recordDocumentChange(user, documentChange, context);
        return profile;
    }
    /**
     * Vender ingressos exige o cadastro completo: os dados do organizador (nome,
     * CPF, telefone confirmado, contato) são os que aparecem em comprovantes e
     * repasses, e a plataforma precisa saber com quem está lidando antes de
     * liberar a venda. A lista do que falta vem do mesmo contrato que o front usa.
     */
    async requireCompleteProfile(user) {
        const profile = await this.repository.serialize(user);
        const missing = getProfileChecklist(profile)
            .filter((item) => !item.complete)
            .map((item) => item.label);
        if (missing.length > 0) {
            throw new ApiError('Complete seu cadastro antes de se tornar organizador.', 403, 'PROFILE_INCOMPLETE', {
                missing,
            });
        }
    }
    /**
     * Confirmação de telefone pelo provedor (Supabase Auth, fluxo phone_change):
     * o código vai por SMS para o número informado e só o provedor o valida. O
     * intervalo mínimo entre envios é do provedor; aqui ele vira um 429 legível.
     */
    async requestPhoneVerification(user, session, phoneDigits) {
        try {
            await this.repository.requestPhoneChange(session, toBrazilianE164(phoneDigits));
        }
        catch (error) {
            if (error instanceof AuthProviderError && error.status === 429) {
                throw new ApiError('Aguarde um minuto antes de pedir outro código.', 429, 'PHONE_CODE_RATE_LIMITED');
            }
            // Sem provedor de SMS (ambiente local sem [auth.sms.twilio] e número fora
            // de test_otp, ou projeto hospedado sem provedor): é configuração, não um
            // problema com o telefone digitado, e a mensagem precisa dizer isso.
            if (error instanceof AuthProviderError && /sms provider/i.test(error.message)) {
                throw new ApiError('O envio de SMS não está configurado neste ambiente.', 503, 'SMS_PROVIDER_UNAVAILABLE', { reason: error.message }, { exposeDetail: true });
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
    /**
     * Atalho de desenvolvimento: marca o telefone como confirmado sem código.
     * Só a rota decide quando usá-lo (NODE_ENV=development); nunca chega a
     * produção, onde o único caminho é o código do provedor.
     */
    confirmPhoneWithoutCode(user, phoneDigits) {
        return this.repository.markPhoneVerified(user.id, phoneDigits);
    }
    async confirmPhoneVerification(user, phoneDigits, token) {
        try {
            await this.repository.verifyPhoneChange(toBrazilianE164(phoneDigits), token);
        }
        catch {
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
    async authorizeDocumentChange(user, nextDocument, currentPassword) {
        if (nextDocument === undefined)
            return null;
        const previousDocument = await this.repository.findDocument(user.id);
        if (previousDocument === nextDocument)
            return null;
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
    async recordDocumentChange(user, change, context) {
        await this.repository.recordDocumentChange({
            userId: user.id,
            previousDocument: change.previousDocument,
            newDocument: change.newDocument,
            changedBy: 'user',
            ip: context.ip,
            userAgent: context.userAgent,
        });
        if (user.email) {
            const firstName = user.userMetadata?.first_name ?? null;
            await this.notifications
                ?.documentChanged({ email: user.email, name: firstName, changedAt: new Date() })
                .catch(() => undefined);
        }
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