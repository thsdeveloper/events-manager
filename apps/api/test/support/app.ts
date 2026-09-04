import cookie from '@fastify/cookie';
import Fastify, { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import { installErrorHandler } from '../../src/shared/errors.js';
import { TEST_ENV } from './env.js';

/**
 * Monta uma instância Fastify enxuta para testar um plugin de rotas isolado.
 * Inclui apenas o que toda rota depende: cookies assinados e o handler de
 * erros RFC 7807. Use `app.inject` para exercitar a rota sem abrir porta.
 *
 * @example
 * const app = await buildRouteTestApp(eventRoutes, { clients });
 * const response = await app.inject({ method: 'GET', url: '/api/events/public' });
 */
export async function buildRouteTestApp<Options extends object>(
	plugin: FastifyPluginAsync<Options> | ((app: FastifyInstance, options: Options) => Promise<void>),
	options: Options,
): Promise<FastifyInstance> {
	const app = Fastify();
	await app.register(cookie, { secret: TEST_ENV.COOKIE_SECRET });
	installErrorHandler(app);
	await app.register(plugin as FastifyPluginAsync<Options>, options);
	await app.ready();
	return app;
}

/**
 * Serializa um cookie de sessão para simular um usuário autenticado nas rotas.
 */
export function sessionCookie(accessToken = 'access-token'): Record<string, string> {
	return { cookie: `access_token=${accessToken}` };
}
