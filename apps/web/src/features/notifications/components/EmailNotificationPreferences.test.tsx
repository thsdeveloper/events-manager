import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEmailPreferencesSchema, organizationEmailPreferencesSchema } from '@events-manager/contracts';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import { EmailNotificationPreferences } from './EmailNotificationPreferences';
afterEach(() => vi.unstubAllGlobals());
describe('email notification preferences', () => {
	it('loads persisted choices and saves opt-outs to the account', async () => {
		let settings = userEmailPreferencesSchema.parse({ event_reminders: false });
		const network = mockFetch([
			[
				'/api/user/notification-preferences',
				(_input, init) => {
					if (init?.method === 'PUT') settings = userEmailPreferencesSchema.parse(JSON.parse(String(init.body)));

					return jsonResponse({ settings });
				},
			],
		]);
		const { user } = renderWithProviders(<EmailNotificationPreferences scope="user" accountId="buyer" />);
		expect(await screen.findByRole('switch', { name: 'Lembrete do evento' })).not.toBeChecked();
		await user.click(screen.getByRole('switch', { name: 'Atualizações de pagamento' }));
		await user.click(screen.getByRole('button', { name: 'Salvar preferências' }));
		expect(await screen.findByText('Preferências de e-mail salvas.')).toBeInTheDocument();
		expect(settings.payment_updates).toBe(false);
		expect(settings.event_reminders).toBe(false);
		expect(network.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true);
		expect(screen.getByText(/confirmações de compra, ingressos/i)).toBeInTheDocument();
	});
	it('keeps choices available after a save error and allows retry', async () => {
		let fail = true;
		mockFetch([
			[
				'/api/user/notification-preferences',
				(_input, init) =>
					init?.method === 'PUT' && fail
						? problemResponse(500, 'INTERNAL_ERROR')
						: jsonResponse({ settings: userEmailPreferencesSchema.parse({}) }),
			],
		]);
		const { user } = renderWithProviders(<EmailNotificationPreferences scope="user" accountId="buyer" />);
		await user.click(await screen.findByRole('switch', { name: 'Lembrete do evento' }));
		await user.click(screen.getByRole('button', { name: 'Salvar preferências' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar');
		expect(screen.getByRole('switch', { name: 'Lembrete do evento' })).not.toBeChecked();
		fail = false;
		await user.click(screen.getByRole('button', { name: 'Salvar preferências' }));
		expect(await screen.findByText('Preferências de e-mail salvas.')).toBeInTheDocument();
	});
	it('offers a retry instead of assuming defaults when loading fails', async () => {
		let fail = true;
		mockFetch([
			[
				'/api/user/notification-preferences',
				() =>
					fail ? problemResponse(503, 'UNAVAILABLE') : jsonResponse({ settings: userEmailPreferencesSchema.parse({}) }),
			],
		]);
		const { user } = renderWithProviders(<EmailNotificationPreferences scope="user" accountId="buyer" />);
		expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar');
		expect(screen.queryByRole('switch')).not.toBeInTheDocument();
		fail = false;
		await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
		expect(await screen.findByRole('switch', { name: 'Boas-vindas' })).toBeChecked();
	});
	it('limits organization changes to users with update permission', async () => {
		mockFetch([
			[
				'/api/organizer/notification-preferences',
				() => jsonResponse({ settings: organizationEmailPreferencesSchema.parse({ sales: false }) }),
			],
		]);
		renderWithProviders(<EmailNotificationPreferences scope="organization" accountId="org-a" canEdit={false} />);
		expect(await screen.findByRole('switch', { name: 'Novas vendas confirmadas' })).toBeDisabled();
		expect(screen.getByRole('switch', { name: 'Novas vendas confirmadas' })).not.toBeChecked();
		expect(screen.queryByRole('button', { name: 'Salvar preferências' })).not.toBeInTheDocument();
		expect(screen.getByText(/e-mail confirmado do proprietário/i)).toBeInTheDocument();
	});
	it('does not carry unsaved preferences to another organization', async () => {
		mockFetch([
			[
				'/api/organizer/notification-preferences',
				() => jsonResponse({ settings: organizationEmailPreferencesSchema.parse({}) }),
			],
		]);
		const { user, rerender } = renderWithProviders(
			<EmailNotificationPreferences scope="organization" accountId="org-a" />,
		);
		await user.click(await screen.findByRole('switch', { name: 'Novas vendas confirmadas' }));
		expect(screen.getByRole('switch', { name: 'Novas vendas confirmadas' })).not.toBeChecked();
		rerender(<EmailNotificationPreferences scope="organization" accountId="org-b" />);
		await waitFor(() => expect(screen.getByRole('switch', { name: 'Novas vendas confirmadas' })).toBeChecked());
	});
});
