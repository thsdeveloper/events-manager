import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import type { AppUser } from '@events-manager/contracts';
import { renderWithProviders, mockFetch, jsonResponse, problemResponse } from '@/test';
import { CheckoutBuyerProfile } from './CheckoutBuyerProfile';
const complete: AppUser = {
	id: 'buyer',
	first_name: 'Ana',
	last_name: 'Silva',
	email: 'ana@example.test',
	birth_date: '1990-05-20',
	document: '52998224725',
	phone: '11999990000',
	phone_verified_at: '2026-11-19T10:00:00Z',
};
function setup(initial: AppUser, auto = false) {
	const saved = vi.fn();
	const editing = vi.fn();
	function Harness() {
		const [profile, setProfile] = useState(initial);

		return (
			<CheckoutBuyerProfile
				profile={profile}
				canAutoConfirmPhone={auto}
				onSaved={(value) => {
					saved(value);
					setProfile(value);
				}}
				onEditingChange={editing}
			/>
		);
	}

	return { ...renderWithProviders(<Harness />), saved, editing };
}
it('completes the buyer account inline and preserves typed fields through automatic development phone confirmation', async () => {
	const incomplete = { id: 'buyer', email: complete.email };
	const fetcher = mockFetch([
		[
			'/api/user/phone/request',
			() =>
				jsonResponse({
					verified: true,
					user: { ...incomplete, phone: complete.phone, phone_verified_at: complete.phone_verified_at },
				}),
		],
		['/api/user/profile', () => jsonResponse({ user: complete })],
	]);
	const { user, saved } = setup(incomplete, true);
	await user.type(screen.getByLabelText('Nome *'), 'Ana');
	await user.type(screen.getByLabelText('Sobrenome *'), 'Silva');
	await user.type(screen.getByLabelText('Data de nascimento *'), '20051990');
	await user.type(screen.getByLabelText('CPF *'), '52998224725');
	await user.type(screen.getByLabelText('Telefone *'), '11999990000');
	expect(screen.getByRole('button', { name: 'Salvar dados' })).toBeDisabled();
	await user.click(screen.getByRole('button', { name: 'Confirmar telefone (desenvolvimento)' }));
	expect(await screen.findByText('Telefone confirmado')).toBeInTheDocument();
	expect(screen.getByLabelText('Nome *')).toHaveValue('Ana');
	await user.click(screen.getByRole('button', { name: 'Salvar dados' }));
	const dialog = await screen.findByRole('dialog', { name: 'Confirme sua senha' });
	expect(fetcher.mock.calls.some(([url]) => url === '/api/user/profile')).toBe(false);
	await user.type(within(dialog).getByLabelText('Senha atual'), 'senha-de-teste');
	await user.click(within(dialog).getByRole('button', { name: 'Confirmar e salvar' }));
	await waitFor(() => expect(saved).toHaveBeenLastCalledWith(expect.objectContaining(complete)));
	const call = fetcher.mock.calls.find(([url]) => String(url) === '/api/user/profile');
	expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
		first_name: 'Ana',
		last_name: 'Silva',
		birth_date: '1990-05-20',
		document: '52998224725',
		current_password: 'senha-de-teste',
	});
	expect(JSON.parse(String(call?.[1]?.body))).not.toHaveProperty('phone');
	expect(screen.queryByRole('button', { name: 'Salvar dados' })).not.toBeInTheDocument();
});

async function editDocument(user: ReturnType<typeof setup>['user']) {
	await user.click(screen.getByRole('button', { name: 'Editar dados' }));
	await user.clear(screen.getByLabelText('CPF *'));
	await user.type(screen.getByLabelText('CPF *'), '11144477735');
	await user.click(screen.getByRole('button', { name: 'Salvar dados' }));

	return screen.findByRole('dialog', { name: 'Confirme sua senha' });
}

it('asks for the password before changing the CPF and saves once when confirmed with Enter', async () => {
	let respond!: (response: Response) => void;
	const fetcher = mockFetch([
		[
			'/api/user/profile',
			() =>
				new Promise<Response>((resolve) => {
					respond = resolve;
				}),
		],
	]);
	const { user, saved } = setup(complete);
	const dialog = await editDocument(user);
	expect(fetcher).not.toHaveBeenCalled();
	const password = within(dialog).getByLabelText('Senha atual');
	expect(password).toHaveFocus();
	await user.click(within(dialog).getByRole('button', { name: 'Confirmar e salvar' }));
	expect(within(dialog).getByText('Confirme sua senha atual para alterar o CPF.')).toBeInTheDocument();
	expect(fetcher).not.toHaveBeenCalled();
	await user.type(password, 'senha-de-teste{Enter}');
	await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
	expect(within(dialog).getByRole('button', { name: 'Confirmar e salvar' })).toBeDisabled();
	await user.keyboard('{Escape}{Enter}');
	expect(screen.getByRole('dialog')).toBeInTheDocument();
	expect(fetcher).toHaveBeenCalledTimes(1);
	expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({
		document: '11144477735',
		current_password: 'senha-de-teste',
	});
	await act(async () => {
		respond(jsonResponse({ user: { ...complete, document: '11144477735' } }));
	});
	expect(saved).toHaveBeenCalledOnce();
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	expect(screen.getByText('Cadastro pronto para comprar')).toBeInTheDocument();
});

it('keeps the password dialog open after a rejected password and lets the buyer correct it', async () => {
	const fetcher = mockFetch([
		[
			'/api/user/profile',
			(_url, init) =>
				JSON.parse(String(init?.body)).current_password === 'correta'
					? jsonResponse({ user: { ...complete, document: '11144477735' } })
					: problemResponse(400, 'INVALID_CURRENT_PASSWORD', 'A senha atual está incorreta.', {
							field: 'current_password',
						}),
		],
	]);
	const { user, saved } = setup(complete);
	const dialog = await editDocument(user);
	const password = within(dialog).getByLabelText('Senha atual');
	await user.type(password, 'errada{Enter}');
	expect(await within(dialog).findByText('A senha atual está incorreta.')).toBeInTheDocument();
	expect(saved).not.toHaveBeenCalled();
	await user.clear(password);
	await user.type(password, 'correta{Enter}');
	await waitFor(() => expect(saved).toHaveBeenCalledOnce());
	expect(fetcher).toHaveBeenCalledTimes(2);
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('keeps edited fields when cancelling the password dialog and forgets the entered password', async () => {
	const fetcher = mockFetch([]);
	const { user } = setup(complete);
	const dialog = await editDocument(user);
	await user.type(within(dialog).getByLabelText('Senha atual'), 'senha-de-teste');
	await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	expect(screen.getByLabelText('CPF *')).toHaveValue('111.444.777-35');
	expect(screen.getByLabelText('Nome *')).toHaveValue('Ana');
	expect(fetcher).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: 'Salvar dados' }));
	expect(within(await screen.findByRole('dialog')).getByLabelText('Senha atual')).toHaveValue('');
});

it('closes the password dialog to let the buyer fix a CPF rejected by the API', async () => {
	mockFetch([
		[
			'/api/user/profile',
			() =>
				problemResponse(409, 'DOCUMENT_ALREADY_IN_USE', 'Este CPF já está cadastrado em outra conta.', {
					field: 'document',
				}),
		],
	]);
	const { user, saved } = setup(complete);
	const dialog = await editDocument(user);
	await user.type(within(dialog).getByLabelText('Senha atual'), 'senha-de-teste{Enter}');
	await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	expect(screen.getAllByText('Este CPF já está cadastrado em outra conta.').length).toBeGreaterThan(0);
	expect(screen.getByLabelText('CPF *')).toHaveValue('111.444.777-35');
	expect(saved).not.toHaveBeenCalled();
});

it('shows connection failures in the password dialog and allows retrying the same change', async () => {
	let offline = true;
	mockFetch([
		[
			'/api/user/profile',
			() =>
				offline
					? Promise.reject(new TypeError('offline'))
					: jsonResponse({ user: { ...complete, document: '11144477735' } }),
		],
	]);
	const { user, saved } = setup(complete);
	const dialog = await editDocument(user);
	await user.type(within(dialog).getByLabelText('Senha atual'), 'senha-de-teste{Enter}');
	expect(await within(dialog).findByText(/Verifique sua conexão/)).toBeInTheDocument();
	offline = false;
	await user.click(within(dialog).getByRole('button', { name: 'Confirmar e salvar' }));
	await waitFor(() => expect(saved).toHaveBeenCalledOnce());
});

it('saves other details without asking for a password when the CPF is unchanged or locked', async () => {
	const fetcher = mockFetch([
		[
			'/api/user/profile',
			() => jsonResponse({ user: { ...complete, document_locked: true, first_name: 'Ana Maria' } }),
		],
	]);
	const { user, saved } = setup({ ...complete, document_locked: true });
	await user.click(screen.getByRole('button', { name: 'Editar dados' }));
	expect(screen.getByLabelText('CPF *')).toHaveAttribute('readonly');
	await user.type(screen.getByLabelText('Nome *'), ' Maria');
	await user.click(screen.getByRole('button', { name: 'Salvar dados' }));
	await waitFor(() => expect(saved).toHaveBeenCalledOnce());
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).not.toHaveProperty('current_password');
});
it('requires the SMS code outside development and explains a rejected code without losing the form', async () => {
	let valid = false;
	mockFetch([
		['/api/user/phone/request', () => jsonResponse({ success: true })],
		[
			'/api/user/phone/confirm',
			() =>
				valid
					? jsonResponse({ user: complete })
					: problemResponse(400, 'INVALID_PHONE_CODE', 'Código inválido ou expirado.'),
		],
	]);
	const { user, saved } = setup({ ...complete, phone_verified_at: null });
	expect(screen.queryByRole('button', { name: 'Confirmar telefone (desenvolvimento)' })).not.toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: 'Confirmar por SMS' }));
	await user.type(await screen.findByLabelText('Código recebido por SMS'), '123456');
	await user.click(screen.getByRole('button', { name: 'Confirmar código' }));
	expect(await screen.findByRole('alert')).toHaveTextContent('Código inválido ou expirado.');
	expect(saved).not.toHaveBeenCalled();
	valid = true;
	await user.click(screen.getByRole('button', { name: 'Confirmar código' }));
	expect(await screen.findByText('Telefone confirmado')).toBeInTheDocument();
});
it('requires a new confirmation when the buyer edits a previously verified phone', async () => {
	const { user } = setup(complete);
	await user.click(screen.getByRole('button', { name: 'Editar dados' }));
	await user.clear(screen.getByLabelText('Telefone *'));
	await user.type(screen.getByLabelText('Telefone *'), '21988887777');
	expect(screen.queryByText('Telefone confirmado')).not.toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'Salvar dados' })).toBeDisabled();
});
it('keeps the entered values and permits retry after a failed profile save', async () => {
	mockFetch([['/api/user/profile', () => Promise.reject(new TypeError('offline'))]]);
	const { user } = setup(complete);
	await user.click(screen.getByRole('button', { name: 'Editar dados' }));
	await user.type(screen.getByLabelText('Nome *'), ' Maria');
	await user.click(screen.getByRole('button', { name: 'Salvar dados' }));
	expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar');
	expect(screen.getByLabelText('Nome *')).toHaveValue('Ana Maria');
	expect(screen.getByRole('button', { name: 'Salvar dados' })).toBeEnabled();
});

it('lets a legacy buyer add a missing email without leaving checkout, after verifying its code', async () => {
	mockFetch([
		['/api/user/email/request', () => jsonResponse({ success: true })],
		['/api/user/email/confirm', () => jsonResponse({ user: complete })],
		['/api/user/profile', () => jsonResponse({ user: complete })],
	]);
	const { user, saved } = setup({ ...complete, email: null });
	await user.type(screen.getByLabelText('E-mail *'), 'ana@example.test');
	await user.click(screen.getByRole('button', { name: 'Confirmar e-mail' }));
	await user.type(await screen.findByLabelText('Código recebido por e-mail'), '123456');
	await user.click(screen.getByRole('button', { name: 'Validar e-mail' }));
	await waitFor(() => expect(saved).toHaveBeenLastCalledWith(expect.objectContaining({ email: complete.email })));
	expect(screen.getByLabelText('E-mail *')).toHaveValue(complete.email);
	await user.click(screen.getByRole('button', { name: 'Salvar dados' }));
	expect(await screen.findByText('Cadastro pronto para comprar')).toBeInTheDocument();
});

it('does not accept an old phone confirmation response after the number is edited', async () => {
	let respond!: (response: Response) => void;
	mockFetch([
		[
			'/api/user/phone/request',
			() =>
				new Promise<Response>((resolve) => {
					respond = resolve;
				}),
		],
	]);
	const { user, saved } = setup({ ...complete, phone_verified_at: null }, true);
	await user.click(screen.getByRole('button', { name: 'Confirmar telefone (desenvolvimento)' }));
	await user.clear(screen.getByLabelText('Telefone *'));
	await user.type(screen.getByLabelText('Telefone *'), '21988887777');
	await act(async () => {
		respond(jsonResponse({ verified: true, user: complete }));
	});
	expect(saved).not.toHaveBeenCalled();
	expect(screen.queryByText('Telefone confirmado')).not.toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'Salvar dados' })).toBeDisabled();
});
