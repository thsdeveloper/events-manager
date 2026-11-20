import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';
import { NotificationForm } from './NotificationForm';
const settings = {
	welcome: true,
	payment_updates: true,
	payment_reminders: true,
	event_updates: true,
	event_reminders: true,
	organization_notifications: false,
};
it('saves the selected customer notifications while preserving organization preferences', async () => {
	const save = jest.fn().mockResolvedValue(undefined);
	const user = userEvent.setup();
	await render(<NotificationForm settings={settings} onSave={save} />);
	await fireEvent(screen.getByRole('switch', { name: 'Lembretes de parcelas' }), 'valueChange', false);
	await user.press(screen.getByRole('button', { name: 'Salvar preferências' }));
	expect(save).toHaveBeenCalledWith({ ...settings, payment_reminders: false });
	expect(await screen.findByText('Preferências salvas.')).toBeTruthy();
});
it('keeps the form available when saving fails', async () => {
	const user = userEvent.setup();
	await render(
		<NotificationForm
			settings={settings}
			onSave={async () => {
				throw new Error('Sem conexão. Tente novamente.');
			}}
		/>,
	);
	await user.press(screen.getByRole('button', { name: 'Salvar preferências' }));
	expect(await screen.findByText('Sem conexão. Tente novamente.')).toBeTruthy();
	expect(screen.getByRole('switch', { name: 'Mudanças no evento' })).toBeTruthy();
});
