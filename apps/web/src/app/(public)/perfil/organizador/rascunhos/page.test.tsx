import { beforeEach, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { mockFetch, jsonResponse, renderWithProviders } from '@/test';
import { resetServerAuthStore } from '@/hooks/useServerAuth';
import Page from './page';
const auth = vi.hoisted(() => vi.fn());
const backend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/server-auth', () => ({ requireAuth: auth }));
vi.mock('@/lib/backend-auth', () => ({
	authenticatedBackendFetch: backend,
	BackendRequestError: class extends Error {
		status = 404;
	},
}));
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
	redirect: (url: string) => {
		throw new Error('redirect:' + url);
	},
	notFound: () => {
		throw new Error('not-found');
	},
}));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('next/link', () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
beforeEach(() => {
	resetServerAuthStore();
	window.localStorage.clear();
	auth.mockResolvedValue({ user: { id: 'u-1' }, organizerStatus: 'pending' });
	mockFetch([
		['/api/event-drafts', () => jsonResponse({ data: [] })],
		['/api/auth/me', () => jsonResponse({ user: { id: 'u-1', email: 'ana@example.com' } })],
		['/api/event-categories', () => jsonResponse({ data: [] })],
		['/api/organizer/profile', () => jsonResponse({ organizer: { id: 'org-1', status: 'pending' } })],
	]);
});
it('requires authentication and resumes only the owned snapshot for pending review', async () => {
	const id = '00000000-0000-4000-8000-000000000099';
	backend.mockResolvedValue({ id, values: { title: 'Minha preparação' }, current_step: 0 });
	renderWithProviders(await Page({ searchParams: Promise.resolve({ rascunho: id }) }));
	expect(auth).toHaveBeenCalledWith('/perfil/organizador/rascunhos');
	expect(backend).toHaveBeenCalledWith('/api/event-drafts/' + id);
	expect(await screen.findByDisplayValue('Minha preparação')).toBeInTheDocument();
	expect(screen.getByText(/A publicação fica disponível após a aprovação/)).toBeInTheDocument();
});
it('sends approved organizers back to the event creation area', async () => {
	auth.mockResolvedValue({ user: { id: 'u-1' }, isOrganizer: true, organizerStatus: 'active' });
	await expect(Page({})).rejects.toThrow('redirect:/admin/eventos/novo');
});
it('does not grant the draft area without an organizer review in progress', async () => {
	auth.mockResolvedValue({ user: { id: 'u-1' }, organizerStatus: 'rejected' });
	await expect(Page({})).rejects.toThrow('redirect:/perfil/organizador');
});
it('rejects invalid snapshot identifiers before fetching them', async () => {
	await expect(Page({ searchParams: Promise.resolve({ rascunho: 'invalid' }) })).rejects.toThrow('not-found');
	expect(backend).not.toHaveBeenCalled();
});
