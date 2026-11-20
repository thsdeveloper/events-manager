import { render, screen, userEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text, Button } from 'react-native';
import { AuthProvider, useAuth } from './AuthProvider';
import { api } from '../../shared/api';
jest.mock('expo-secure-store', () => {
	const values = new Map<string, string>();
	return {
		getItemAsync: async (key: string) => values.get(key) ?? null,
		setItemAsync: async (key: string, value: string) => {
			values.set(key, value);
		},
		deleteItemAsync: async (key: string) => {
			values.delete(key);
		},
	};
});
const oldFetch = globalThis.fetch;
const clients: QueryClient[] = [];
const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body }) as Response;
const session = { accessToken: 'stored-access', refreshToken: 'stored-refresh', expiresIn: 3600 };
function Probe() {
	const auth = useAuth();
	return (
		<>
			<Text>{auth.user?.first_name || 'Visitante'}</Text>
			<Text>{auth.ready ? 'Pronto' : 'Restaurando'}</Text>
			<Button title="Sair" onPress={() => void auth.logout().catch(() => {})} />
		</>
	);
}
function fixture() {
	const query = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	clients.push(query);
	query.setQueryData(['tickets', 'old'], ['private']);
	return {
		query,
		element: (
			<QueryClientProvider client={query}>
				<AuthProvider>
					<Probe />
				</AuthProvider>
			</QueryClientProvider>
		),
	};
}
afterEach(async () => {
	for (const client of clients) client.clear();
	clients.length = 0;
	globalThis.fetch = oldFetch;
	await api.setSession(null);
});
it('restores the authenticated customer from secure storage', async () => {
	await api.setSession(session);
	globalThis.fetch = jest.fn().mockResolvedValue(response({ user: { id: 'user', first_name: 'Ana' } }));
	await render(fixture().element);
	expect(await screen.findByText('Ana')).toBeTruthy();
	expect(await screen.findByText('Pronto')).toBeTruthy();
});
it('clears the private wallet and local identity even when remote logout is unavailable', async () => {
	await api.setSession(session);
	globalThis.fetch = jest
		.fn()
		.mockImplementation((url: string) =>
			url.endsWith('/logout')
				? Promise.reject(new Error('Offline'))
				: Promise.resolve(response({ user: { id: 'user', first_name: 'Ana' } })),
		);
	const { element, query } = fixture();
	await render(element);
	await screen.findByText('Ana');
	await userEvent.setup().press(screen.getByRole('button', { name: 'Sair' }));
	expect(await screen.findByText('Visitante')).toBeTruthy();
	expect(await api.session()).toBeNull();
	expect(query.getQueryData(['tickets', 'old'])).toBeUndefined();
});
it('ignores a late profile restoration after the customer has signed out', async () => {
	await api.setSession(session);
	let finish!: (value: Response) => void;
	globalThis.fetch = jest.fn().mockImplementation((url: string) =>
		url.endsWith('/logout')
			? Promise.resolve(response(null, 204))
			: new Promise<Response>((resolve) => {
					finish = resolve;
				}),
	);
	await render(fixture().element);
	await waitFor(() => expect(finish).toBeDefined());
	await userEvent.setup().press(screen.getByRole('button', { name: 'Sair' }));
	await act(async () => {
		finish(response({ user: { id: 'old', first_name: 'Antiga' } }));
	});
	expect(screen.queryByText('Antiga')).toBeNull();
	expect(screen.getByText('Visitante')).toBeTruthy();
});
