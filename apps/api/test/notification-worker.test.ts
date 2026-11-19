import { afterEach, describe, expect, it, vi } from 'vitest';
import { notificationWorkerRoutes } from '../src/routes/notification-worker.js';
import { buildRouteTestApp } from './support/index.js';
const token = 'test-notifications-worker-secret-123456789';
async function setup(extra: Partial<Parameters<typeof notificationWorkerRoutes>[1]> = {}) {
	const runner = { run: vi.fn().mockResolvedValue({ sent: 2, suppressed: 1, failed: 0 }) };
	const app = await buildRouteTestApp(notificationWorkerRoutes, {
		runner,
		token,
		enabled: true,
		background: false,
		...extra,
	});
	return { app, runner };
}
afterEach(() => vi.useRealTimers());
describe('notification worker', () => {
	it('drains a full batch promptly and returns to the idle polling interval after the queue shrinks', async () => {
		vi.useFakeTimers();
		const runner = {
			run: vi
				.fn()
				.mockResolvedValueOnce({ sent: 10, suppressed: 0, failed: 0 })
				.mockResolvedValue({ sent: 1, suppressed: 0, failed: 0 }),
		};
		const { app } = await setup({ background: true, runner });
		await vi.advanceTimersByTimeAsync(1_000);
		expect(runner.run).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(29_000);
		expect(runner.run).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(1_000);
		expect(runner.run).toHaveBeenCalledTimes(3);
		await app.close();
	});
	it('accepts only the dedicated scheduler credential', async () => {
		const { app, runner } = await setup();
		for (const headers of [{}, { authorization: 'Bearer wrong' }, { cookie: 'access_token=user-session' }]) {
			expect((await app.inject({ method: 'POST', url: '/internal/notifications/process', headers })).statusCode).toBe(
				401,
			);
		}
		expect(runner.run).not.toHaveBeenCalled();
		const res = await app.inject({
			method: 'POST',
			url: '/internal/notifications/process',
			headers: { authorization: `Bearer ${token}` },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({ sent: 2, suppressed: 1, failed: 0 });
		expect(res.headers['cache-control']).toBe('private, no-store');
		await app.close();
	});
	it('requires explicit activation and a configured secret', async () => {
		for (const config of [{ enabled: false }, { token: undefined }]) {
			const { app, runner } = await setup(config);
			expect(
				(
					await app.inject({
						method: 'POST',
						url: '/internal/notifications/process',
						headers: { authorization: `Bearer ${token}` },
					})
				).statusCode,
			).toBe(503);
			expect(runner.run).not.toHaveBeenCalled();
			await app.close();
		}
	});
	it('rejects caller-supplied recipients or notification payloads', async () => {
		const { app, runner } = await setup();
		const response = await app.inject({
			method: 'POST',
			url: '/internal/notifications/process',
			headers: { authorization: `Bearer ${token}` },
			payload: { to: 'victim@example.test' },
		});
		expect(response.statusCode).toBe(422);
		expect(runner.run).not.toHaveBeenCalled();
		await app.close();
	});
	it('starts background batches and stops scheduling when the app closes', async () => {
		vi.useFakeTimers();
		const { app, runner } = await setup({ background: true });
		await vi.advanceTimersByTimeAsync(0);
		expect(runner.run).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(30_000);
		expect(runner.run).toHaveBeenCalledTimes(2);
		await app.close();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(runner.run).toHaveBeenCalledTimes(2);
	});
	it('continues after a failed batch without logging private errors', async () => {
		vi.useFakeTimers();
		const runner = {
			run: vi
				.fn()
				.mockRejectedValueOnce(new Error('private SMTP detail'))
				.mockResolvedValue({ sent: 0, suppressed: 0, failed: 0 }),
		};
		const { app } = await setup({ background: true, runner });
		await vi.advanceTimersByTimeAsync(30_000);
		expect(runner.run).toHaveBeenCalledTimes(2);
		await app.close();
	});
	it('does not run background mail when disabled', async () => {
		vi.useFakeTimers();
		const { app, runner } = await setup({ enabled: false, background: true });
		await vi.advanceTimersByTimeAsync(60_000);
		expect(runner.run).not.toHaveBeenCalled();
		await app.close();
	});
});
