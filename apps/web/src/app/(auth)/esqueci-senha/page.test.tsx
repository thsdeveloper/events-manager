import { screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import ForgotPasswordPage from './page';

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('next/image', () => ({
	default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

afterEach(() => vi.unstubAllGlobals());

async function requestFor(user: ReturnType<typeof renderWithProviders>['user'], email: string) {
	await user.type(screen.getByLabelText('E-mail'), email);
	await user.click(screen.getByRole('button', { name: /enviar instruções/i }));
}

describe('ForgotPasswordPage', () => {
	it('asks the API for a recovery e-mail and confirms without revealing whether the account exists', async () => {
		const fetchMock = mockFetch([['/api/auth/forgot-password', () => jsonResponse({ success: true })]]);
		const { user } = renderWithProviders(<ForgotPasswordPage />);

		await requestFor(user, 'ana@example.com');

		expect(await screen.findByRole('heading', { name: 'Confira seu e-mail' })).toBeInTheDocument();
		expect(screen.getByText(/se houver uma conta para/i)).toHaveTextContent('ana@example.com');
		const [url, init] = fetchMock.mock.calls[0];
		expect(String(url)).toContain('/api/auth/forgot-password');
		expect(JSON.parse(String(init?.body))).toEqual({ email: 'ana@example.com' });
	});

	it('lets the user try another address after a request', async () => {
		mockFetch([['/api/auth/forgot-password', () => jsonResponse({ success: true })]]);
		const { user } = renderWithProviders(<ForgotPasswordPage />);
		await requestFor(user, 'ana@example.com');

		await user.click(await screen.findByRole('button', { name: /enviar para outro e-mail/i }));

		expect(await screen.findByLabelText('E-mail')).toHaveValue('');
	});

	it('does not call the API for an invalid e-mail', async () => {
		const fetchMock = mockFetch([]);
		const { user } = renderWithProviders(<ForgotPasswordPage />);

		await requestFor(user, 'nao-e-email');

		expect(await screen.findByText(/digite um e-mail válido/i)).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('stays on the form when the API refuses the request', async () => {
		mockFetch([['/api/auth/forgot-password', () => problemResponse(429, 'RATE_LIMITED', 'Aguarde.')]]);
		const { user } = renderWithProviders(<ForgotPasswordPage />);

		await requestFor(user, 'ana@example.com');

		await waitFor(() => expect(screen.getByRole('button', { name: /enviar instruções/i })).toBeEnabled());
		expect(screen.getByRole('heading', { name: 'Esqueceu sua senha?' })).toBeInTheDocument();
	});
});
