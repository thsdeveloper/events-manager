import { screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import ResetPasswordPage from './page';

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('next/image', () => ({
	default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

const RECOVERY_HASH = '#token_hash=recovery-proof&type=recovery';

function openLink(hash: string) {
	window.history.replaceState({}, '', `/redefinir-senha${hash}`);
}

// Strict Mode (efeitos duplicados, como no Next em desenvolvimento) vem do
// setup global dos testes `dom`; a página precisa aceitar o link nessa condição.
function renderPage() {
	return renderWithProviders(<ResetPasswordPage />);
}

async function fillAndSubmit(user: ReturnType<typeof renderPage>['user'], password = 'Qsesbs2006#@!') {
	await user.type(await screen.findByLabelText('Nova senha'), password);
	await user.type(screen.getByLabelText('Confirme a nova senha'), password);
	await user.click(screen.getByRole('button', { name: /atualizar senha/i }));
}

describe('ResetPasswordPage', () => {
	beforeEach(() => {
		mockFetch([]);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		window.history.replaceState({}, '', '/redefinir-senha');
	});

	it('accepts the recovery link even when React runs the effect twice', async () => {
		openLink(RECOVERY_HASH);

		renderPage();

		expect(await screen.findByRole('heading', { name: 'Crie uma nova senha' })).toBeInTheDocument();
		expect(screen.queryByText(/link inválido/i)).not.toBeInTheDocument();
	});

	it('removes the token from the address bar once it has been read', async () => {
		openLink(RECOVERY_HASH);

		renderPage();
		await screen.findByRole('heading', { name: 'Crie uma nova senha' });

		expect(window.location.hash).toBe('');
	});

	it('explains that a link may be expired or used without claiming it was consumed', async () => {
		openLink('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid');

		renderPage();

		expect(await screen.findByRole('heading', { name: 'Link expirado' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /solicitar novo link/i })).toHaveAttribute('href', '/esqueci-senha');
		expect(screen.queryByText('Esta recuperação já foi utilizada')).not.toBeInTheDocument();
	});

	it('does not consume the recovery proof when the page is merely opened', async () => {
		openLink(RECOVERY_HASH);
		const fetchMock = mockFetch([]);
		renderPage();
		await screen.findByLabelText('Nova senha');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('asks for a new link when an old implicit session link is opened', async () => {
		openLink('#access_token=legacy-session&type=recovery');
		renderPage();
		expect(await screen.findByRole('heading', { name: 'Link inválido' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /solicitar novo link/i })).toBeInTheDocument();
	});

	it('offers a new recovery without calling an outage an expired link', async () => {
		openLink(RECOVERY_HASH);
		mockFetch([['/api/auth/password/reset', () => problemResponse(503, 'PASSWORD_RESET_UNAVAILABLE')]]);
		const { user } = renderPage();
		await fillAndSubmit(user);
		expect(await screen.findByRole('heading', { name: 'Não foi possível atualizar a senha' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /solicitar novo link/i })).toBeInTheDocument();
	});

	it('rejects a page opened without a recovery token', async () => {
		openLink('');

		renderPage();

		expect(await screen.findByRole('heading', { name: 'Link inválido' })).toBeInTheDocument();
	});

	it('sends the new password together with the recovery token and confirms the change', async () => {
		openLink(RECOVERY_HASH);
		const fetchMock = mockFetch([['/api/auth/password/reset', () => jsonResponse({ success: true })]]);
		const { user } = renderPage();

		await fillAndSubmit(user);

		await waitFor(() => expect(screen.getByRole('heading', { name: 'Senha atualizada' })).toBeInTheDocument());
		const [url, init] = fetchMock.mock.calls[0];
		expect(String(url)).toContain('/api/auth/password/reset');
		expect(init?.method).toBe('POST');
		expect(JSON.parse(String(init?.body))).toEqual({ token_hash: 'recovery-proof', password: 'Qsesbs2006#@!' });
		expect(screen.getByRole('link', { name: /entrar com a nova senha/i })).toHaveAttribute('href', '/login');
	});

	it('moves to the expired screen when the API no longer accepts the token', async () => {
		openLink(RECOVERY_HASH);
		mockFetch([
			[
				'/api/auth/password/reset',
				() => problemResponse(400, 'PASSWORD_RESET_ERROR', 'O link de recuperação é inválido ou expirou.'),
			],
		]);
		const { user } = renderPage();

		await fillAndSubmit(user);

		expect(await screen.findByRole('heading', { name: 'Link expirado' })).toBeInTheDocument();
	});

	it('keeps the form and the token when the failure is not about the link', async () => {
		openLink(RECOVERY_HASH);
		mockFetch([['/api/auth/password/reset', () => problemResponse(500, 'INTERNAL_ERROR')]]);
		const { user } = renderPage();

		await fillAndSubmit(user);

		expect(await screen.findByRole('heading', { name: 'Crie uma nova senha' })).toBeInTheDocument();
	});

	it('does not submit passwords that fail the shared policy', async () => {
		openLink(RECOVERY_HASH);
		const fetchMock = mockFetch([]);
		const { user } = renderPage();

		await fillAndSubmit(user, 'senhafraca');

		expect(await screen.findByText(/pelo menos um número/i)).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
