import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import { ProfileDetailsForm } from './ProfileDetailsForm';
import type { ProfileUser } from './types';

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

afterEach(() => vi.unstubAllGlobals());

const user: ProfileUser = {
	id: '00000000-0000-4000-8000-000000000001',
	email: 'ana@example.com',
	first_name: 'Ana',
	last_name: 'Silva',
	birth_date: '1990-05-20',
	document: null,
	description: null,
	city_id: null,
	location: null,
};

function setup(profileResponse: Record<string, unknown> = {}) {
	const fetchMock = mockFetch([
		['/api/locations/states', () => jsonResponse([])],
		['/api/user/profile', () => jsonResponse({ success: true, user: { ...user, ...profileResponse } })],
	]);
	const rendered = renderWithProviders(<ProfileDetailsForm user={user} onSaved={vi.fn()} />);

	return { fetchMock, ...rendered };
}

function profileCall(fetchMock: ReturnType<typeof mockFetch>) {
	const call = fetchMock.mock.calls.find(([input]) => String(input).includes('/api/user/profile'));

	return call ? JSON.parse(String(call[1]?.body)) : null;
}

describe('ProfileDetailsForm', () => {
	it('no longer asks how the person presents themselves', () => {
		setup();

		expect(screen.queryByLabelText(/como você se apresenta/i)).not.toBeInTheDocument();
	});

	it('lets the birth date given at sign-up be corrected', async () => {
		const { user: person, fetchMock } = setup({ birth_date: '1991-06-15' });
		const birthDate = screen.getByLabelText(/data de nascimento/i);
		expect(birthDate).toHaveValue('20/05/1990');

		await person.clear(birthDate);
		await person.type(birthDate, '15061991');
		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));

		await waitFor(() => expect(profileCall(fetchMock)).not.toBeNull());
		expect(profileCall(fetchMock)).toMatchObject({ birth_date: '1991-06-15' });
	});

	it('refuses a birth date under the minimum age', async () => {
		const { user: person, fetchMock } = setup();
		const birthDate = screen.getByLabelText(/data de nascimento/i);
		const tooYoung = new Date();
		tooYoung.setUTCFullYear(tooYoung.getUTCFullYear() - 13);
		tooYoung.setUTCDate(tooYoung.getUTCDate() + 1);

		await person.clear(birthDate);
		await person.type(birthDate, tooYoung.toISOString().slice(0, 10).split('-').reverse().join(''));
		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));

		expect(await screen.findByText('É preciso ter pelo menos 13 anos para criar uma conta.')).toBeInTheDocument();
		expect(profileCall(fetchMock)).toBeNull();
	});

	it('masks the CPF while typing and saves only its digits', async () => {
		const { user: person, fetchMock } = setup({ document: '52998224725' });

		const cpf = screen.getByLabelText(/cpf/i);
		await person.type(cpf, '52998224725');
		expect(cpf).toHaveValue('529.982.247-25');
		await person.type(await screen.findByLabelText(/senha atual/i), 'Qsesbs2006#@!');

		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));

		await waitFor(() => expect(profileCall(fetchMock)).not.toBeNull());
		expect(profileCall(fetchMock)).toMatchObject({ document: '52998224725' });
		expect(profileCall(fetchMock)).not.toHaveProperty('title');
	});

	it('refuses to save an invalid CPF', async () => {
		const { user: person, fetchMock } = setup();

		await person.type(screen.getByLabelText(/cpf/i), '52998224726');
		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));

		expect(await screen.findByText('Informe um CPF válido.')).toBeInTheDocument();
		expect(profileCall(fetchMock)).toBeNull();
	});

	it('tells the person when the CPF already belongs to another account', async () => {
		const fetchMock = mockFetch([
			['/api/locations/states', () => jsonResponse([])],
			[
				'/api/user/profile',
				() =>
					problemResponse(409, 'DOCUMENT_ALREADY_IN_USE', 'Este CPF já está cadastrado em outra conta.', {
						field: 'document',
					}),
			],
		]);
		const { user: person } = renderWithProviders(<ProfileDetailsForm user={user} onSaved={vi.fn()} />);

		await person.type(screen.getByLabelText(/cpf/i), '52998224725');
		await person.type(await screen.findByLabelText(/senha atual/i), 'Qsesbs2006#@!');
		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));

		await waitFor(() => expect(profileCall(fetchMock)).not.toBeNull());
		const message = await screen.findByText('Este CPF já está cadastrado em outra conta.');
		expect(message).toBeInTheDocument();
		// Shown next to the field, not only as a toast that disappears.
		expect(message.closest('div')).toContainElement(screen.getByLabelText(/cpf/i));
	});

	it('locks the CPF once it is tied to paid activity and says how to change it', () => {
		mockFetch([['/api/locations/states', () => jsonResponse([])]]);
		renderWithProviders(
			<ProfileDetailsForm user={{ ...user, document: '52998224725', document_locked: true }} onSaved={vi.fn()} />,
		);

		expect(screen.getByLabelText(/cpf/i)).toBeDisabled();
		expect(screen.getByText(/para alterar o cpf, fale com o suporte/i)).toBeInTheDocument();
		expect(screen.queryByLabelText(/senha atual/i)).not.toBeInTheDocument();
	});

	it('asks for the current password when the CPF changes and sends it along', async () => {
		const { user: person, fetchMock } = setup({ document: '52998224725' });
		expect(screen.queryByLabelText(/senha atual/i)).not.toBeInTheDocument();

		await person.type(screen.getByLabelText(/cpf/i), '52998224725');
		const password = await screen.findByLabelText(/senha atual/i);
		expect(password).toHaveAttribute('type', 'password');
		await person.type(password, 'Qsesbs2006#@!');
		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));

		await waitFor(() => expect(profileCall(fetchMock)).not.toBeNull());
		expect(profileCall(fetchMock)).toMatchObject({ document: '52998224725', current_password: 'Qsesbs2006#@!' });
	});

	it('does not submit a CPF change without the current password', async () => {
		const { user: person, fetchMock } = setup();

		await person.type(screen.getByLabelText(/cpf/i), '52998224725');
		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));

		expect(await screen.findByText('Confirme sua senha atual para alterar o CPF.')).toBeInTheDocument();
		expect(profileCall(fetchMock)).toBeNull();
	});

	it('shows a wrong current password on its own field', async () => {
		const fetchMock = mockFetch([
			['/api/locations/states', () => jsonResponse([])],
			[
				'/api/user/profile',
				() =>
					problemResponse(400, 'INVALID_CURRENT_PASSWORD', 'A senha atual está incorreta.', {
						field: 'current_password',
					}),
			],
		]);
		const { user: person } = renderWithProviders(<ProfileDetailsForm user={user} onSaved={vi.fn()} />);

		await person.type(screen.getByLabelText(/cpf/i), '52998224725');
		await person.type(await screen.findByLabelText(/senha atual/i), 'errada');
		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));

		await waitFor(() => expect(profileCall(fetchMock)).not.toBeNull());
		const message = await screen.findByText('A senha atual está incorreta.');
		expect(message.closest('div')).toContainElement(screen.getByLabelText(/senha atual/i));
	});

	it('clears the CPF when the field is emptied', async () => {
		const { user: person, fetchMock } = setup();
		const cpf = screen.getByLabelText(/cpf/i);

		await person.type(cpf, '52998224725');
		await person.clear(cpf);
		await person.type(screen.getByLabelText(/sobre você/i), 'Gosto de festivais.');
		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));

		await waitFor(() => expect(profileCall(fetchMock)).not.toBeNull());
		expect(profileCall(fetchMock)).toMatchObject({ document: null });
	});
});
