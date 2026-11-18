import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { OrganizationSwitcher } from './OrganizationSwitcher';

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
beforeEach(() => vi.clearAllMocks());
const organizations = [
	{ id: 'org-1', name: 'Produtora A', status: 'active' },
	{ id: 'org-2', name: 'Produtora B', status: 'active' },
	{ id: 'org-3', name: 'Produtora C', status: 'pending' },
];

describe('OrganizationSwitcher', () => {
	it('opens additional-account signup from the workspace menu', async () => {
		const { user } = renderWithProviders(<OrganizationSwitcher organizations={organizations} activeId="org-1" />);
		await user.click(screen.getByRole('button', { name: 'Organização: Produtora A' }));
		await user.click(screen.getByRole('menuitem', { name: 'Cadastrar nova conta' }));
		expect(router.push).toHaveBeenCalledWith('/perfil/organizador/novo');
	});
	it('returns to the dashboard after changing organization so old event URLs are not reused', async () => {
		mockFetch([['/api/organizer/organizations/org-2/activate', () => jsonResponse({ success: true })]]);
		const { user } = renderWithProviders(<OrganizationSwitcher organizations={organizations} activeId="org-1" />);
		await user.click(screen.getByRole('button', { name: 'Organização: Produtora A' }));
		await user.click(screen.getByRole('menuitem', { name: 'Produtora B' }));
		await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/dashboard'));
		expect(router.refresh).toHaveBeenCalled();
	});
	it('lists pending accounts without offering to activate them', async () => {
		const fetchMock = mockFetch([]);
		const { user } = renderWithProviders(<OrganizationSwitcher organizations={organizations} activeId="org-1" />);
		await user.click(screen.getByRole('button', { name: 'Organização: Produtora A' }));
		const pending = screen.getByRole('menuitem', { name: /Produtora C.*Em análise/ });
		expect(pending).toHaveAttribute('aria-disabled', 'true');
		await user.click(pending);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
