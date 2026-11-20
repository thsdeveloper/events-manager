import { render, screen, userEvent } from '@testing-library/react-native';
import { RegistrationForm } from './RegistrationForm';
describe('customer registration', () => {
	it('collects the required identity and converts the birth date before submitting', async () => {
		const submit = jest.fn().mockResolvedValue(undefined);
		const user = userEvent.setup();
		await render(<RegistrationForm onSubmit={submit} />);
		await user.type(screen.getByLabelText('Nome'), 'Ana');
		await user.type(screen.getByLabelText('Sobrenome'), 'Silva');
		await user.type(screen.getByLabelText('Data de nascimento'), '10/05/1990');
		await user.type(screen.getByLabelText('E-mail'), 'ana@example.test');
		await user.type(screen.getByLabelText('Crie uma senha'), 'Password7!');
		await user.type(screen.getByLabelText('Confirme a senha'), 'Password7!');
		await user.press(screen.getByRole('button', { name: 'Criar minha conta' }));
		expect(submit).toHaveBeenCalledWith({
			first_name: 'Ana',
			last_name: 'Silva',
			birth_date: '1990-05-10',
			email: 'ana@example.test',
			password: 'Password7!',
		});
	});
	it('explains invalid dates without sending a registration request', async () => {
		const submit = jest.fn();
		const user = userEvent.setup();
		await render(<RegistrationForm onSubmit={submit} />);
		await user.type(screen.getByLabelText('Data de nascimento'), '31/02/1990');
		await user.press(screen.getByRole('button', { name: 'Criar minha conta' }));
		expect(await screen.findByText('Informe uma data de nascimento válida.')).toBeTruthy();
		expect(submit).not.toHaveBeenCalled();
	});
});
