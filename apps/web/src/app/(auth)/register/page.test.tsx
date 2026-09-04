import { screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import RegisterPage from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }) }));
vi.mock('next/link', () => ({
	default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('next/image', () => ({
	default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

afterEach(() => vi.unstubAllGlobals());

function yearsAgo(years: number, offsetDays = 0) {
	const date = new Date();
	date.setUTCFullYear(date.getUTCFullYear() - years);
	date.setUTCDate(date.getUTCDate() + offsetDays);

	return date.toISOString().slice(0, 10);
}

async function fillForm(user: ReturnType<typeof renderWithProviders>['user'], birthDate: string) {
	await user.type(screen.getByLabelText('Nome'), 'Ana');
	await user.type(screen.getByLabelText('Sobrenome'), 'Silva');
	await user.type(screen.getByLabelText('E-mail'), 'ana@example.com');
	await user.type(screen.getByLabelText('Data de nascimento'), birthDate.split('-').reverse().join(''));
	await user.type(screen.getByLabelText('Senha'), 'Qsesbs2006#@!');
	await user.type(screen.getByLabelText('Confirmar senha'), 'Qsesbs2006#@!');
	await user.click(screen.getByRole('button', { name: /criar conta/i }));
}

describe('RegisterPage', () => {
	it('asks for the birth date and explains the minimum age', () => {
		renderWithProviders(<RegisterPage />);

		expect(screen.getByLabelText('Data de nascimento')).toHaveAttribute('placeholder', 'dd/mm/aaaa');
		expect(screen.getByRole('button', { name: /abrir calendário/i })).toBeInTheDocument();
		expect(screen.getByText(/pelo menos 13 anos/i)).toBeInTheDocument();
	});

	it('blocks the sign-up of someone under 13 before calling the API', async () => {
		const fetchMock = mockFetch([]);
		const { user } = renderWithProviders(<RegisterPage />);

		await fillForm(user, yearsAgo(13, 1));

		expect(await screen.findByText('É preciso ter pelo menos 13 anos para criar uma conta.')).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('sends the birth date with the new account', async () => {
		const fetchMock = mockFetch([
			['/api/auth/register', () => jsonResponse({ confirmationRequired: true }, { status: 201 })],
		]);
		const { user } = renderWithProviders(<RegisterPage />);

		await fillForm(user, yearsAgo(13));

		await waitFor(() => expect(fetchMock).toHaveBeenCalled());
		const [, init] = fetchMock.mock.calls[0];
		expect(JSON.parse(String(init?.body))).toMatchObject({
			firstName: 'Ana',
			lastName: 'Silva',
			email: 'ana@example.com',
			birth_date: yearsAgo(13),
		});
	});
});
