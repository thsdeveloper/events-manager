import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import rawBody from 'fastify-raw-body';
import { CheckHealth } from './application/health/check-health.js';
import { createSupabaseClients } from './infrastructure/supabase/clients.js';
import { SupabaseHealthRepository } from './infrastructure/supabase/health-repository.js';
import { createPaymentGateway } from './infrastructure/payments/create-payment-gateway.js';
import { authRoutes } from './routes/auth.js';
import { cmsRoutes } from './routes/cms.js';
import { contentRoutes } from './routes/content.js';
import { eventRoutes } from './routes/events.js';
import { adminRoutes } from './routes/admin.js';
import { emailRoutes } from './routes/email.js';
import { externalRoutes } from './routes/external.js';
import { financeRoutes } from './routes/finance.js';
import { locationRoutes } from './routes/locations.js';
import { organizerRoutes } from './routes/organizers.js';
import { paymentRoutes } from './routes/payments.js';
import { superAdminRoutes } from './routes/super-admin.js';
import { uploadRoutes } from './routes/uploads.js';
import { userRoutes } from './routes/users.js';
import { installErrorHandler } from './shared/errors.js';
export async function buildApp(env) {
    const app = Fastify({
        logger: env.NODE_ENV !== 'test',
        trustProxy: env.TRUST_PROXY_HOPS || false,
    });
    const clients = createSupabaseClients(env);
    const payments = createPaymentGateway(env);
    const checkHealth = new CheckHealth(new SupabaseHealthRepository(clients));
    await app.register(cors, { origin: env.WEB_URL, credentials: true });
    await app.register(cookie, { secret: env.COOKIE_SECRET });
    await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024, files: 1 } });
    await app.register(rawBody, { global: false, field: 'rawBody', encoding: false, runFirst: true });
    installErrorHandler(app);
    app.addHook('onRequest', async (request, reply) => {
        reply.header('x-request-id', request.id);
        reply.header('x-content-type-options', 'nosniff');
    });
    app.get('/health', () => checkHealth.execute());
    await app.register(authRoutes, { env, clients });
    await app.register(contentRoutes, { env, clients });
    await app.register(eventRoutes, { clients });
    await app.register(organizerRoutes, { env, clients });
    await app.register(adminRoutes, { clients });
    await app.register(userRoutes, { clients });
    await app.register(locationRoutes, { clients });
    await app.register(financeRoutes, { env, clients, payments });
    await app.register(paymentRoutes, { env, clients, payments });
    await app.register(superAdminRoutes, { clients, payments });
    await app.register(cmsRoutes, { clients, env });
    await app.register(uploadRoutes, { clients });
    await app.register(emailRoutes, { env, clients });
    await app.register(externalRoutes, { env, clients });
    return app;
}
//# sourceMappingURL=app.js.map