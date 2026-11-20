import { render, screen, userEvent } from '@testing-library/react-native';
import { CredentialsForm } from './CredentialsForm';
describe('native login form', () => {
	it('submits the entered credentials and hides the password by default', async () => {
		const submit = jest.fn().mockResolvedValue(undefined);
		const user = userEvent.setup();
		await render(<CredentialsForm onSubmit={submit} />);
		await user.type(screen.getByLabelText('E-mail'), 'ana@example.test');
		await user.type(screen.getByLabelText('Senha'), 'Password7!');
		expect(screen.getByLabelText('Senha').props.secureTextEntry).toBe(true);
		await user.press(screen.getByRole('button', { name: 'Entrar' }));
		expect(submit).toHaveBeenCalledWith('ana@example.test', 'Password7!');
	});
	it('displays an actionable server error without losing the entered email', async () => {
		const user = userEvent.setup();
		await render(
			<CredentialsForm
				onSubmit={async () => {
					throw new Error('E-mail ou senha inválidos.');
				}}
			/>,
		);
		await user.type(screen.getByLabelText('E-mail'), 'ana@example.test');
		await user.type(screen.getByLabelText('Senha'), 'Wrong7!');
		await user.press(screen.getByRole('button', { name: 'Entrar' }));
		expect(await screen.findByText('E-mail ou senha inválidos.')).toBeTruthy();
		expect(screen.getByLabelText('E-mail').props.value).toBe('ana@example.test');
	});
});
