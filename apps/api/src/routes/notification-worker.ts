import type { FastifyInstance } from 'fastify';
import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { ApiError } from '../shared/errors.js';
import { NOTIFICATION_BATCH_SIZE } from '../application/notifications/notification-processor.js';
export interface NotificationRunner {
	run(): Promise<{ sent: number; suppressed: number; failed: number }>;
}
export async function notificationWorkerRoutes(
	app: FastifyInstance,
	options: { runner: NotificationRunner; token?: string; enabled: boolean; background: boolean },
) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let current: Promise<void> | undefined;
	let closed = false;
	const tick = () => {
		current = (async () => {
			let nextDelay = 30_000;
			try {
				const counts = await options.runner.run();
				if (counts.sent + counts.suppressed + counts.failed >= NOTIFICATION_BATCH_SIZE) nextDelay = 1_000;
				if (counts.sent || counts.suppressed || counts.failed)
					app.log.info({ notifications: counts }, 'Notification batch completed');
			} catch {
				app.log.error('Notification batch failed; the durable queue will retry.');
			} finally {
				if (!closed) {
					timer = setTimeout(tick, nextDelay);
					timer.unref();
				}
			}
		})();
	};
	app.addHook('onReady', async () => {
		if (options.enabled && options.background) {
			timer = setTimeout(tick, 0);
			timer.unref();
		}
	});
	app.addHook('onClose', async () => {
		closed = true;
		clearTimeout(timer);
		await current;
	});
	app.post('/internal/notifications/process', async (request, reply) => {
		reply.header('cache-control', 'private, no-store');
		if (!options.enabled || !options.token)
			throw new ApiError('Processamento de notificações indisponível.', 503, 'NOTIFICATIONS_DISABLED');
		const hash = (value: string) => createHash('sha256').update(value).digest();
		if (!timingSafeEqual(hash(request.headers.authorization ?? ''), hash(`Bearer ${options.token}`)))
			throw new ApiError('Credencial do agendador inválida.', 401, 'UNAUTHORIZED');
		z.object({}).strict().optional().parse(request.body);
		try {
			return await options.runner.run();
		} catch {
			throw new ApiError('Não foi possível processar a fila.', 503, 'NOTIFICATION_WORKER_UNAVAILABLE');
		}
	});
}
