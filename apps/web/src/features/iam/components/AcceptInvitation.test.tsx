import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders, mockFetch, jsonResponse, problemResponse } from '@/test';
import { AcceptInvitation } from './AcceptInvitation';
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const token = 'a'.repeat(43);
beforeEach(() => {
	sessionStorage.clear();
	history.replaceState(null, '', '/convites/aceitar');
});
describe('accepting team invitation', () => {
	it('requires a valid invitation before offering acceptance', async () => {
		renderWithProviders(<AcceptInvitation email="guest@test.com" />);
		expect(await screen.findByRole('alert')).toHaveTextContent('Abra o link do convite');
		expect(screen.queryByRole('button', { name: 'Aceitar convite' })).not.toBeInTheDocument();
	});
	it('keeps the token out of the URL and directs guests to login', async () => {
		history.replaceState(null, '', `/convites/aceitar#token=${token}`);
		renderWithProviders(<AcceptInvitation />);
		expect(await screen.findByRole('link', { name: 'Entrar para aceitar' })).toHaveAttribute(
			'href',
			'/login?redirect=%2Fconvites%2Faceitar',
		);
		expect(location.hash).toBe('');
		expect(sessionStorage.getItem('flouvi.iam.invitation')).toBe(token);
	});
	it('accepts only on explicit submission and clears the consumed token', async () => {
		sessionStorage.setItem('flouvi.iam.invitation', token);
		const fetchMock = mockFetch([['/api/iam/invitations/accept', () => jsonResponse({ organizationId: 'org' })]]);
		const { user } = renderWithProviders(<AcceptInvitation email="guest@test.com" />);
		expect(fetchMock).not.toHaveBeenCalled();
		await user.click(await screen.findByRole('button', { name: 'Aceitar convite' }));
		await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin'));
		expect(sessionStorage.getItem('flouvi.iam.invitation')).toBeNull();
		expect(fetchMock).toHaveBeenCalledWith(
			'/api/iam/invitations/accept',
			expect.objectContaining({ method: 'POST', body: JSON.stringify({ token }) }),
		);
	});
	it('shows the API explanation when the authenticated email does not match', async () => {
		sessionStorage.setItem('flouvi.iam.invitation', token);
		mockFetch([
			[
				'/api/iam/invitations/accept',
				() => problemResponse(403, 'IAM_INVITATION_IDENTITY', 'Entre com o e-mail que recebeu o convite.'),
			],
		]);
		const { user } = renderWithProviders(<AcceptInvitation email="wrong@test.com" />);
		await user.click(await screen.findByRole('button', { name: 'Aceitar convite' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Entre com o e-mail que recebeu o convite.');
		expect(sessionStorage.getItem('flouvi.iam.invitation')).toBe(token);
	});
});

it('accepts platform invitations without changing the active organization', async () => {
	sessionStorage.setItem('flouvi.platform.invitation', token);
	const fetchMock = mockFetch([['/api/platform-iam/invitations/accept', () => jsonResponse({ memberId: 'member' })]]);
	const { user } = renderWithProviders(<AcceptInvitation email="guest@test.com" scope="platform" />);
	await user.click(await screen.findByRole('button', { name: 'Aceitar convite' }));
	await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/super-admin'));
	expect(fetchMock).toHaveBeenCalledWith(
		'/api/platform-iam/invitations/accept',
		expect.objectContaining({ body: JSON.stringify({ token }) }),
	);
	expect(sessionStorage.getItem('flouvi.platform.invitation')).toBeNull();
});
it('keeps platform and organization invitation links separate through login', async () => {
	history.replaceState(null, '', `/convites/plataforma#token=${token}`);
	renderWithProviders(<AcceptInvitation scope="platform" />);
	expect(await screen.findByRole('link', { name: 'Entrar para aceitar' })).toHaveAttribute(
		'href',
		'/login?redirect=%2Fconvites%2Fplataforma',
	);
	expect(sessionStorage.getItem('flouvi.platform.invitation')).toBe(token);
	expect(sessionStorage.getItem('flouvi.iam.invitation')).toBeNull();
});
