import type { FastifyInstance } from 'fastify';
import { ApiError } from './errors.js';

/** CORS controls reading responses; this check also prevents browser writes. */
export function installHttpSecurity(app: FastifyInstance, webUrl: string) {
	const trustedOrigin = new URL(webUrl).origin;
	app.addHook('onRequest', async (request, reply) => {
		reply.header('x-request-id', request.id);
		reply.header('x-content-type-options', 'nosniff');
		reply.header('cache-control', 'private, no-store');
		if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
		const origin = request.headers.origin;
		// Native clients, SSR and signed webhooks do not send browser headers.
		// A browser-supplied Origin is compared exactly, including scheme and port.
		if (
			(origin !== undefined && origin !== trustedOrigin) ||
			(!origin && ['same-site', 'cross-site'].includes(String(request.headers['sec-fetch-site'])))
		) {
			throw new ApiError('Origem da requisição não autorizada.', 403, 'UNTRUSTED_ORIGIN');
		}
	});
	app.addHook('onSend', async (request, reply) => {
		if (request.headers.authorization || request.headers.cookie || reply.hasHeader('set-cookie')) {
			reply.header('cache-control', 'private, no-store');
		}
	});
}
