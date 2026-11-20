import { ApiClient, type Session, type SessionStorage } from './client';
const session: Session = { accessToken: 'access', refreshToken: 'refresh', expiresIn: 3600 };
const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response;
function setup(value: Session | null = session) {
	let saved = value;
	const storage: SessionStorage = {
		read: async () => saved,
		write: async (v) => {
			saved = v;
		},
	};
	const network = jest.fn();
	return { api: new ApiClient('https://api.test', storage, network), network, storage };
}
describe('native API client', () => {
	it('authenticates only to the configured API and omits browser cookies', async () => {
		const { api, network } = setup();
		network.mockResolvedValue(response({ user: 'Ana' }));
		await api.request('/api/auth/me');
		expect(network.mock.calls[0][0]).toBe('https://api.test/api/auth/me');
		expect(network.mock.calls[0][1]).toMatchObject({
			credentials: 'omit',
			headers: { Authorization: 'Bearer access' },
		});
	});
	it('does not forward credentials to absolute or protocol-relative URLs', async () => {
		const { api, network } = setup();
		await expect(api.request('https://evil.test')).rejects.toThrow();
		await expect(api.request('//evil.test')).rejects.toThrow();
		expect(network).not.toHaveBeenCalled();
	});
	it('refreshes once and retries an expired request with new credentials', async () => {
		const { api, network, storage } = setup();
		network
			.mockResolvedValueOnce(response({}, 401))
			.mockResolvedValueOnce(response({ session: { ...session, accessToken: 'fresh' } }))
			.mockResolvedValueOnce(response({ ok: true }));
		await expect(api.request('/api/user/tickets')).resolves.toEqual({ ok: true });
		expect(network.mock.calls[1][0]).toBe('https://api.test/api/auth/mobile/refresh');
		expect(network.mock.calls[1][1].body).toBe(JSON.stringify({ refresh_token: 'refresh' }));
		expect((await storage.read())?.accessToken).toBe('fresh');
	});
	it('clears only expired credentials when refresh is refused', async () => {
		const { api, network, storage } = setup();
		network.mockResolvedValue(response({ detail: 'Sessão encerrada', title: 'INVALID_SESSION' }, 401));
		await expect(api.request('/api/user/tickets')).rejects.toMatchObject({ status: 401 });
		expect(await storage.read()).toBeNull();
	});
	it('keeps the session on a temporary server outage', async () => {
		const { api, network, storage } = setup();
		network.mockResolvedValue(response({ detail: 'Indisponível' }, 503));
		await expect(api.request('/api/user/tickets')).rejects.toMatchObject({ status: 503 });
		expect(await storage.read()).toEqual(session);
	});
	it('handles public requests and empty success responses', async () => {
		const { api, network } = setup(null);
		network.mockResolvedValue(response(null, 204));
		await expect(api.request('/api/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
	});
	it('tells the customer which registration field needs correction', async () => {
		const { api, network } = setup(null);
		network.mockResolvedValue(
			response(
				{
					detail: 'Os dados enviados são inválidos.',
					context: {
						errors: { fieldErrors: { birth_date: ['É preciso ter pelo menos 13 anos para criar uma conta.'] } },
					},
				},
				422,
			),
		);
		await expect(api.request('/api/auth/mobile/register', { method: 'POST', body: '{}' })).rejects.toThrow(
			'É preciso ter pelo menos 13 anos para criar uma conta.',
		);
	});
	it('notifies subscribers when credentials change and stops after unsubscribing', async () => {
		const { api } = setup();
		const changed = jest.fn();
		const off = api.subscribe(changed);
		await api.setSession(null);
		expect(changed).toHaveBeenCalledWith(null);
		expect(await api.session()).toBeNull();
		off();
		await api.setSession(session);
		expect(changed).toHaveBeenCalledTimes(1);
	});
	it('shares one credential refresh between concurrent authenticated requests', async () => {
		const { api, network } = setup();
		let refreshed = 0;
		network.mockImplementation(async (url: string, options: RequestInit) => {
			if (url.endsWith('/mobile/refresh')) {
				refreshed++;
				return response({ session: { ...session, accessToken: 'fresh' } });
			}
			return (options.headers as Record<string, string>).Authorization === 'Bearer fresh'
				? response({ ok: true })
				: response({}, 401);
		});
		await expect(Promise.all([api.request('/api/user/tickets'), api.request('/api/auth/me')])).resolves.toEqual([
			{ ok: true },
			{ ok: true },
		]);
		expect(refreshed).toBe(1);
	});
	it('does not restore a logged-out session when an earlier refresh completes', async () => {
		const { api, network, storage } = setup();
		let finish!: (value: Response) => void;
		network.mockResolvedValueOnce(response({}, 401)).mockImplementationOnce(
			() =>
				new Promise<Response>((resolve) => {
					finish = resolve;
				}),
		);
		const pending = api.request('/api/user/tickets');
		const outcome = expect(pending).rejects.toMatchObject({ status: 401 });
		while (!finish) await new Promise((resolve) => setTimeout(resolve, 0));
		await api.setSession(null);
		finish(response({ session: { ...session, accessToken: 'stale' } }));
		await outcome;
		expect(await storage.read()).toBeNull();
	});
});
