import { expect, it } from 'vitest';
import { authRoutes } from '../src/routes/auth.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	sessionCookie,
	TEST_USER_ID,
} from './support/index.js';
const email = 'ana@example.test';
async function setup(currentEmail = '', authenticated = true) {
	const stub = createSupabaseClientsStub({
		user: authenticated ? { id: TEST_USER_ID, email: currentEmail } : null,
		tables: { profiles: { data: { id: TEST_USER_ID, email: currentEmail } } },
	});
	const app = await buildRouteTestApp(authRoutes, {
		env: createTestEnv({ APP_ENV: 'production' }),
		clients: stub.clients,
	});
	return { app, ...stub };
}
it('sends a verification code for a signed-in legacy account without email', async () => {
	const { app, sessionAuth } = await setup();
	const response = await app.inject({
		method: 'POST',
		url: '/api/user/email/request',
		headers: sessionCookie('access-token', 'refresh-token'),
		payload: { email },
	});
	expect(response.statusCode).toBe(200);
	expect(sessionAuth.updateUser).toHaveBeenCalledWith({ email });
	await app.close();
});
it.each(['/api/user/email/request', '/api/user/email/confirm'])(
	'requires authentication and valid input on %s',
	async (url) => {
		const anonymous = await setup('', false);
		expect((await anonymous.app.inject({ method: 'POST', url, payload: { email, token: '123456' } })).statusCode).toBe(
			401,
		);
		await anonymous.app.close();
		const { app } = await setup();
		expect(
			(await app.inject({ method: 'POST', url, headers: sessionCookie(), payload: { email: 'invalid', token: 'bad' } }))
				.statusCode,
		).toBe(422);
		await app.close();
	},
);
it('cannot replace the email already attached to an account from checkout', async () => {
	const { app, sessionAuth } = await setup('existing@example.test');
	const response = await app.inject({
		method: 'POST',
		url: '/api/user/email/request',
		headers: sessionCookie('access-token', 'refresh-token'),
		payload: { email },
	});
	expect(response.statusCode).toBe(403);
	expect(sessionAuth.updateUser).not.toHaveBeenCalled();
	await app.close();
});
it('adds the email only after its code verifies the same authenticated identity', async () => {
	const { app, verifyOtp } = await setup();
	verifyOtp.mockResolvedValue({
		data: { user: { id: TEST_USER_ID, email, email_confirmed_at: '2026-11-19T10:00:00Z' }, session: null },
		error: null,
	});
	const response = await app.inject({
		method: 'POST',
		url: '/api/user/email/confirm',
		headers: sessionCookie(),
		payload: { email, token: '123456' },
	});
	expect(response.statusCode).toBe(200);
	expect(response.json()).toMatchObject({ user: { id: TEST_USER_ID, email } });
	expect(verifyOtp).toHaveBeenCalledWith({ email, token: '123456', type: 'email_change' });
	await app.close();
});
it.each([
	{ id: 'other', email, email_confirmed_at: 'now' },
	{ id: TEST_USER_ID, email: 'other@example.test', email_confirmed_at: 'now' },
	null,
])('rejects a code which does not confirm this account and email: %j', async (verifiedUser) => {
	const { app, verifyOtp } = await setup();
	verifyOtp.mockResolvedValue({ data: { user: verifiedUser, session: null }, error: null });
	const response = await app.inject({
		method: 'POST',
		url: '/api/user/email/confirm',
		headers: sessionCookie(),
		payload: { email, token: '123456' },
	});
	expect(response.statusCode).toBe(400);
	await app.close();
});

it('requires a complete session before requesting an email code', async () => {
	const { app } = await setup();
	const response = await app.inject({
		method: 'POST',
		url: '/api/user/email/request',
		headers: sessionCookie(),
		payload: { email },
	});
	expect(response.statusCode).toBe(401);
	await app.close();
});
it.each([
	{ status: 429, title: 'EMAIL_CODE_RATE_LIMITED', expected: 429 },
	{ status: 500, title: 'EMAIL_CODE_REQUEST_ERROR', expected: 400 },
])('reports an email provider refusal with a readable error: %j', async ({ status, title, expected }) => {
	const { app, sessionAuth } = await setup();
	sessionAuth.updateUser.mockResolvedValue({
		data: { user: null },
		error: { message: 'provider failure', status },
	} as never);
	const response = await app.inject({
		method: 'POST',
		url: '/api/user/email/request',
		headers: sessionCookie('access-token', 'refresh-token'),
		payload: { email },
	});
	expect(response.statusCode).toBe(expected);
	expect(response.json().title).toBe(title);
	await app.close();
});
it('reports an invalid session without issuing an email request', async () => {
	const { app, sessionAuth } = await setup();
	sessionAuth.setSession.mockResolvedValue({
		data: { session: null, user: null },
		error: { message: 'expired', status: 401 },
	} as never);
	const response = await app.inject({
		method: 'POST',
		url: '/api/user/email/request',
		headers: sessionCookie('access-token', 'refresh-token'),
		payload: { email },
	});
	expect(response.statusCode).toBe(400);
	expect(sessionAuth.updateUser).not.toHaveBeenCalled();
	await app.close();
});
it.each([
	{ current: email, code: 200 },
	{ current: 'different@example.test', code: 403 },
])('does not replace a confirmed email when confirmation is retried: %j', async ({ current, code }) => {
	const { app, verifyOtp } = await setup(current);
	const response = await app.inject({
		method: 'POST',
		url: '/api/user/email/confirm',
		headers: sessionCookie(),
		payload: { email, token: '123456' },
	});
	expect(response.statusCode).toBe(code);
	expect(verifyOtp).not.toHaveBeenCalled();
	await app.close();
});
it('reports an expired email code and keeps the profile unchanged', async () => {
	const { app, verifyOtp } = await setup();
	verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'expired', status: 403 } });
	const response = await app.inject({
		method: 'POST',
		url: '/api/user/email/confirm',
		headers: sessionCookie(),
		payload: { email, token: '123456' },
	});
	expect(response.statusCode).toBe(400);
	expect(response.json().title).toBe('INVALID_EMAIL_CODE');
	await app.close();
});
