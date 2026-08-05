import { credentialsSchema, registerSchema, updateProfileSchema } from '@events-manager/contracts';
import { z } from 'zod';
import { clearSessionCookies, readAccessToken, requireUser, serializeUser, setSessionCookies } from '../application/auth/session.js';
import { ApiError } from '../shared/errors.js';
const compatibleRegisterSchema = registerSchema.partial({ first_name: true, last_name: true }).extend({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
}).superRefine((value, context) => {
    if (!value.first_name && !value.firstName)
        context.addIssue({ code: 'custom', path: ['first_name'], message: 'Nome obrigatório' });
    if (!value.last_name && !value.lastName)
        context.addIssue({ code: 'custom', path: ['last_name'], message: 'Sobrenome obrigatório' });
});
export async function authRoutes(app, options) {
    const { env, clients } = options;
    app.post('/api/auth/register', async (request, reply) => {
        const input = compatibleRegisterSchema.parse(request.body);
        const firstName = input.first_name ?? input.firstName;
        const lastName = input.last_name ?? input.lastName;
        const { data, error } = await clients.public.auth.signUp({
            email: input.email,
            password: input.password,
            options: { data: { first_name: firstName, last_name: lastName } },
        });
        if (error)
            throw new ApiError(error.message, error.status ?? 400, 'REGISTRATION_ERROR');
        if (!data.user)
            throw new ApiError('Não foi possível criar o usuário.', 500, 'REGISTRATION_ERROR');
        if (data.session)
            setSessionCookies(reply, env, data.session);
        return reply.code(201).send({ success: true, user: await serializeUser(clients, data.user) });
    });
    app.post('/api/auth/login', async (request, reply) => {
        const input = credentialsSchema.parse(request.body);
        const { data, error } = await clients.public.auth.signInWithPassword(input);
        if (error || !data.session || !data.user)
            throw new ApiError('E-mail ou senha inválidos.', 401, 'INVALID_CREDENTIALS');
        setSessionCookies(reply, env, data.session);
        const user = await serializeUser(clients, data.user);
        const isSuperAdmin = user.role === 'super_admin';
        const isOrganizer = user.role === 'organizer' || user.role === 'admin' || user.organizer?.status === 'active';
        return {
            success: true,
            user,
            isOrganizer,
            isSuperAdmin,
            redirect: isSuperAdmin ? '/super-admin' : isOrganizer ? '/admin' : '/perfil',
        };
    });
    app.get('/api/auth/me', async (request) => {
        const auth = await requireUser(request, clients);
        const user = await serializeUser(clients, auth.user);
        const organizerStatus = user.organizer?.status ?? null;
        const isOrganizer = user.role === 'admin' || user.role === 'organizer' || organizerStatus === 'active';
        return {
            user,
            isOrganizer,
            isSuperAdmin: user.role === 'super_admin',
            organizerProfile: user.organizer,
            organizerStatus,
            hasPendingOrganizerRequest: organizerStatus === 'pending',
        };
    });
    app.post('/api/auth/refresh', async (request, reply) => {
        const body = z.object({ refresh_token: z.string().optional() }).parse(request.body ?? {});
        const refreshToken = body.refresh_token ?? request.cookies.refresh_token;
        if (!refreshToken)
            throw new ApiError('Token de atualização ausente.', 401, 'MISSING_REFRESH_TOKEN');
        const { data, error } = await clients.public.auth.refreshSession({ refresh_token: refreshToken });
        if (error || !data.session || !data.user)
            throw new ApiError('Não foi possível renovar a sessão.', 401, 'INVALID_REFRESH_TOKEN');
        setSessionCookies(reply, env, data.session);
        return { success: true, user: await serializeUser(clients, data.user) };
    });
    app.post('/api/auth/logout', async (request, reply) => {
        const accessToken = readAccessToken(request);
        if (accessToken)
            await clients.admin.auth.admin.signOut(accessToken).catch(() => undefined);
        clearSessionCookies(reply, env);
        return reply.code(204).send();
    });
    app.post('/api/auth/password/request', async (request) => {
        const { email } = z.object({ email: z.string().email() }).parse(request.body);
        await clients.public.auth.resetPasswordForEmail(email, { redirectTo: `${env.WEB_URL}/redefinir-senha` });
        return { success: true, message: 'Se o e-mail estiver cadastrado, as instruções serão enviadas.' };
    });
    app.post('/api/auth/forgot-password', async (request) => {
        const { email } = z.object({ email: z.string().email() }).parse(request.body);
        await clients.public.auth.resetPasswordForEmail(email, { redirectTo: `${env.WEB_URL}/redefinir-senha` });
        return { success: true, message: 'Se o e-mail estiver cadastrado, as instruções serão enviadas.' };
    });
    app.get('/api/auth/token', async (request) => {
        await requireUser(request, clients);
        return { authenticated: true, access_token: 'cookie-session' };
    });
    app.post('/api/auth/password/reset', async (request) => {
        const input = z.object({ access_token: z.string(), password: z.string().min(8) }).parse(request.body);
        const client = clients.forAccessToken(input.access_token);
        const { error } = await client.auth.updateUser({ password: input.password });
        if (error)
            throw new ApiError(error.message, 400, 'PASSWORD_RESET_ERROR');
        return { success: true };
    });
    app.patch('/api/user/profile', async (request) => {
        const auth = await requireUser(request, clients);
        const input = updateProfileSchema.parse(request.body);
        const metadata = {};
        if (input.first_name)
            metadata.first_name = input.first_name;
        if (input.last_name)
            metadata.last_name = input.last_name;
        if (input.email) {
            const { error } = await clients.admin.auth.admin.updateUserById(auth.user.id, { email: input.email, user_metadata: metadata });
            if (error)
                throw error;
        }
        else if (Object.keys(metadata).length) {
            const { error } = await clients.admin.auth.admin.updateUserById(auth.user.id, { user_metadata: metadata });
            if (error)
                throw error;
        }
        const profileUpdate = { ...input, email: input.email ?? auth.user.email };
        const { data, error } = await clients.admin.from('profiles').update(profileUpdate).eq('id', auth.user.id).select().single();
        if (error)
            throw error;
        return { success: true, user: data };
    });
    app.patch('/api/user/password', async (request) => {
        const auth = await requireUser(request, clients);
        const { password } = z.object({ password: z.string().min(8) }).parse(request.body);
        const { error } = await clients.admin.auth.admin.updateUserById(auth.user.id, { password });
        if (error)
            throw error;
        return { success: true };
    });
}
//# sourceMappingURL=auth.js.map