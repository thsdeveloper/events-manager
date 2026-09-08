import { screen, waitFor, within } from '@testing-library/react';
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

type Person = ReturnType<typeof renderWithProviders>['user'];

/** Preenche a senha no modal aberto por "Salvar alterações" e confirma. */
async function confirmPassword(person: Person, password: string) {
	const dialog = await screen.findByRole('dialog', { name: /confirme sua senha/i });
	await person.type(within(dialog).getByLabelText(/senha atual/i), password);
	await person.click(within(dialog).getByRole('button', { name: /confirmar e salvar/i }));
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

		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));
		await confirmPassword(person, 'Qsesbs2006#@!');

		await waitFor(() => expect(profileCall(fetchMock)).not.toBeNull());
		expect(profileCall(fetchMock)).toMatchObject({ document: '52998224725' });
		expect(profileCall(fetchMock)).not.toHaveProperty('title');
	});

	it('refuses to save an invalid CPF', async () => {
		const { user: person, fetchMock } = setup();

		await person.type(screen.getByLabelText(/cpf/i), '52998224726');
		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));

		expect(await screen.findByText('Informe um CPF válido.')).toBeInTheDocument();
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));
		await confirmPassword(person, 'Qsesbs2006#@!');

		await waitFor(() => expect(profileCall(fetchMock)).not.toBeNull());
		const message = await screen.findByText('Este CPF já está cadastrado em outra conta.');
		expect(message).toBeInTheDocument();
		// Shown next to the field, not only as a toast that disappears; the modal
		// is closed so the person can fix the CPF.
		expect(message.closest('div')).toContainElement(screen.getByLabelText(/cpf/i));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
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

	it('only asks for the current password, in a modal, when the person saves a CPF change', async () => {
		const { user: person, fetchMock } = setup({ document: '52998224725' });

		await person.type(screen.getByLabelText(/cpf/i), '52998224725');
		expect(screen.queryByLabelText(/senha atual/i)).not.toBeInTheDocument();
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));

		const dialog = await screen.findByRole('dialog', { name: /confirme sua senha/i });
		const password = within(dialog).getByLabelText(/senha atual/i);
		expect(password).toHaveAttribute('type', 'password');
		expect(profileCall(fetchMock)).toBeNull();

		await person.type(password, 'Qsesbs2006#@!');
		await person.click(within(dialog).getByRole('button', { name: /confirmar e salvar/i }));

		await waitFor(() => expect(profileCall(fetchMock)).not.toBeNull());
		expect(profileCall(fetchMock)).toMatchObject({ document: '52998224725', current_password: 'Qsesbs2006#@!' });
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	it('saves other changes without asking for the password', async () => {
		const { user: person, fetchMock } = setup();

		await person.type(screen.getByLabelText(/sobre você/i), 'Gosto de festivais.');
		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));

		await waitFor(() => expect(profileCall(fetchMock)).not.toBeNull());
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(profileCall(fetchMock)).not.toHaveProperty('current_password');
	});

	it('does not submit a CPF change without the current password', async () => {
		const { user: person, fetchMock } = setup();

		await person.type(screen.getByLabelText(/cpf/i), '52998224725');
		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));
		const dialog = await screen.findByRole('dialog', { name: /confirme sua senha/i });
		await person.click(within(dialog).getByRole('button', { name: /confirmar e salvar/i }));

		expect(await within(dialog).findByText('Confirme sua senha atual para alterar o CPF.')).toBeInTheDocument();
		expect(profileCall(fetchMock)).toBeNull();
	});

	it('keeps the CPF change pending when the password modal is cancelled', async () => {
		const { user: person, fetchMock } = setup();

		await person.type(screen.getByLabelText(/cpf/i), '52998224725');
		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));
		const dialog = await screen.findByRole('dialog', { name: /confirme sua senha/i });
		await person.click(within(dialog).getByRole('button', { name: /cancelar/i }));

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		expect(profileCall(fetchMock)).toBeNull();
		expect(screen.getByLabelText(/cpf/i)).toHaveValue('529.982.247-25');
	});

	it('shows a wrong current password inside the modal', async () => {
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
		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));
		await confirmPassword(person, 'errada');

		await waitFor(() => expect(profileCall(fetchMock)).not.toBeNull());
		const dialog = screen.getByRole('dialog', { name: /confirme sua senha/i });
		const message = await within(dialog).findByText('A senha atual está incorreta.');
		expect(message.closest('div')).toContainElement(within(dialog).getByLabelText(/senha atual/i));
	});

	it('masks the phone while typing and saves only its digits', async () => {
		const { user: person, fetchMock } = setup({ phone: '11912345678' });

		const phone = screen.getByLabelText(/telefone/i);
		await person.type(phone, '11912345678');
		expect(phone).toHaveValue('(11) 91234-5678');

		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));

		await waitFor(() => expect(profileCall(fetchMock)).not.toBeNull());
		expect(profileCall(fetchMock)).toMatchObject({ phone: '11912345678' });
	});

	it('shows the saved phone and refuses an invalid one', async () => {
		mockFetch([['/api/locations/states', () => jsonResponse([])]]);
		const { user: person } = renderWithProviders(
			<ProfileDetailsForm user={{ ...user, phone: '11912345678' }} onSaved={vi.fn()} />,
		);
		const phone = screen.getByLabelText(/telefone/i);
		expect(phone).toHaveValue('(11) 91234-5678');

		await person.clear(phone);
		await person.type(phone, '0012345678');
		await person.click(screen.getByRole('button', { name: /salvar alterações/i }));

		expect(await screen.findByText('Informe um telefone válido com DDD.')).toBeInTheDocument();
	});

	it('marks a confirmed phone and drops the mark as soon as the number is edited', async () => {
		mockFetch([['/api/locations/states', () => jsonResponse([])]]);
		const { user: person } = renderWithProviders(
			<ProfileDetailsForm
				user={{ ...user, phone: '11912345678', phone_verified_at: '2026-09-04T19:00:00.000Z' }}
				onSaved={vi.fn()}
			/>,
		);

		expect(screen.getByText(/telefone confirmado/i)).toBeInTheDocument();

		const phone = screen.getByLabelText(/telefone/i);
		await person.clear(phone);
		await person.type(phone, '11988887777');

		expect(screen.queryByText(/telefone confirmado/i)).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /confirmar por sms/i })).toBeInTheDocument();
	});

	it('keeps the SMS confirmation control on the same row as the phone field', async () => {
		mockFetch([['/api/locations/states', () => jsonResponse([])]]);
		renderWithProviders(<ProfileDetailsForm user={{ ...user, phone: '11999990000' }} onSaved={vi.fn()} />);

		const phone = screen.getByLabelText(/telefone/i);
		const button = screen.getByRole('button', { name: /confirmar por sms/i });
		const row = button.parentElement;

		expect(row).toContainElement(phone);
		expect(row?.className).toMatch(/\bflex\b/);
		// Field first, control right after it.
		expect(phone.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('hands the verified user back to the page after the code is confirmed', async () => {
		const verifiedUser = { ...user, phone: '11999990000', phone_verified_at: '2026-09-04T19:00:00.000Z' };
		mockFetch([
			['/api/locations/states', () => jsonResponse([])],
			['/api/user/phone/request', () => jsonResponse({ success: true })],
			['/api/user/phone/confirm', () => jsonResponse({ success: true, user: verifiedUser })],
		]);
		const onSaved = vi.fn();
		const { user: person } = renderWithProviders(<ProfileDetailsForm user={user} onSaved={onSaved} />);

		await person.type(screen.getByLabelText(/telefone/i), '11999990000');
		await person.click(screen.getByRole('button', { name: /confirmar por sms/i }));
		await person.type(await screen.findByLabelText(/código recebido por sms/i), '123456');
		await person.click(screen.getByRole('button', { name: /confirmar código/i }));

		await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ phone: '11999990000' })));
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
