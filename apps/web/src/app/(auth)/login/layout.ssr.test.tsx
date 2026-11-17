import { describe, expect, it, vi } from 'vitest';
import LoginLayout from './layout';
const auth = vi.hoisted(() => ({ cookie: true }));
vi.mock('next/headers', () => ({
	cookies: async () => ({ has: () => auth.cookie, toString: () => (auth.cookie ? 'access_token=test' : '') }),
}));
vi.mock('next/navigation', () => ({
	redirect: (url: string) => {
		throw new Error('REDIRECT:' + url);
	},
}));
describe('login session guard', () => {
	it.each(['attendee', 'organizer', 'super_admin'])(
		'redirects an authenticated %s to the profile overview',
		async (role) => {
			auth.cookie = true;
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => new Response(JSON.stringify({ user: { id: 'user', role } }), { status: 200 })),
			);
			await expect(LoginLayout({ children: 'Login' })).rejects.toThrow('REDIRECT:/perfil?section=overview');
		},
	);
	it('allows anonymous visitors and invalid sessions to log in', async () => {
		auth.cookie = false;
		expect(await LoginLayout({ children: 'Login' })).toBe('Login');
		auth.cookie = true;
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(null, { status: 401 })),
		);
		expect(await LoginLayout({ children: 'Login' })).toBe('Login');
	});
});
