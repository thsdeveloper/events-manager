import { screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { ConfirmEmailForm } from './ConfirmEmailForm';

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('next/image', () => ({
	default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

afterEach(() => vi.unstubAllGlobals());

describe('ConfirmEmailForm', () => {
	it('locks the e-mail that came from the sign-up so the code is checked against the right account', async () => {
		const { user } = renderWithProviders(<ConfirmEmailForm initialEmail="ana@example.com" />);

		const email = screen.getByLabelText('E-mail do cadastro');
		expect(email).toHaveAttribute('readonly');

		await user.type(email, 'x');

		expect(email).toHaveValue('ana@example.com');
	});

	it('still lets the e-mail be typed when the page was opened without one', async () => {
		const { user } = renderWithProviders(<ConfirmEmailForm initialEmail="" />);

		const email = screen.getByLabelText('E-mail do cadastro');
		expect(email).not.toHaveAttribute('readonly');

		await user.type(email, 'ana@example.com');

		expect(email).toHaveValue('ana@example.com');
	});

	it('sends the locked e-mail together with the code', async () => {
		const fetchMock = mockFetch([
			['/api/auth/register/confirm', () => jsonResponse({ success: true, redirect: '/perfil' })],
		]);
		const { user } = renderWithProviders(<ConfirmEmailForm initialEmail="ana@example.com" />);

		await user.type(screen.getByLabelText('Código de confirmação'), '123456');
		await user.click(screen.getByRole('button', { name: /confirmar e-mail/i }));

		await waitFor(() => expect(fetchMock).toHaveBeenCalled());
		const [, init] = fetchMock.mock.calls[0];
		expect(JSON.parse(String(init?.body))).toEqual({ email: 'ana@example.com', token: '123456' });
	});

	it('stacks the resend question above its button instead of running them on one line', () => {
		renderWithProviders(<ConfirmEmailForm initialEmail="ana@example.com" />);

		const question = screen.getByText('Não recebeu o código?');
		const button = screen.getByRole('button', { name: /reenviar/i });

		expect(question.tagName).toBe('P');
		expect(question.nextElementSibling).toBe(button);
	});

	it('offers a way back to the sign-up for a wrong e-mail', () => {
		renderWithProviders(<ConfirmEmailForm initialEmail="ana@example.com" />);

		expect(screen.getByRole('link', { name: /voltar ao cadastro/i })).toHaveAttribute('href', '/register');
	});
});
