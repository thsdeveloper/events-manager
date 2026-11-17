import { expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, mockFetch, jsonResponse } from '@/test';
import Page from './page';
const backend = vi.hoisted(() => vi.fn());
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
it('resumes a private incomplete snapshot through the owned endpoint', async () => {
	const id = '00000000-0000-4000-8000-000000000090';
	mockFetch([
		['/api/event-categories', () => jsonResponse({ data: [] })],
		['/api/auth/me', () => jsonResponse({ user: { id: 'u1' } })],
		['/api/organizer/profile', () => jsonResponse({ organizer: { id: 'org1', status: 'active' } })],
	]);
	backend.mockResolvedValue({ id, values: { title: 'Rascunho da conta' }, current_step: 0 });
	renderWithProviders(await Page({ searchParams: Promise.resolve({ rascunho: id }) }));
	expect(backend).toHaveBeenCalledWith('/api/event-drafts/' + id);
	expect(await screen.findByDisplayValue('Rascunho da conta')).toBeInTheDocument();
	expect(screen.getByRole('heading', { name: 'Novo evento', level: 1 })).toBeInTheDocument();
	expect(screen.queryByRole('link', { name: 'Voltar para eventos' })).not.toBeInTheDocument();
});
it('returns to the converted event rather than creating it again', async () => {
	const id = '00000000-0000-4000-8000-000000000090';
	backend.mockResolvedValue({ id, values: {}, current_step: 6, event_id: 'event-created' });
	await expect(Page({ searchParams: Promise.resolve({ rascunho: id }) })).rejects.toThrow(
		'redirect:/admin/eventos/event-created',
	);
});
