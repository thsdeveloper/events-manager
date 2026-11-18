import { useState } from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test';
import { CurrencyInput } from './currency-input';
function Example({ initial = 344 }: { initial?: number }) {
	const [value, setValue] = useState(initial);

	return (
		<>
			<CurrencyInput aria-label="Valor" value={value} onValueChange={setValue} />
			<output aria-label="Valor numérico">{value}</output>
		</>
	);
}
describe('valores em reais', () => {
	it('exibe reais e centavos e mantém o valor numérico para envio', async () => {
		const { user } = renderWithProviders(<Example />);
		const input = screen.getByRole('textbox', { name: 'Valor' });
		expect(input).toHaveValue('R$ 344,00');
		await user.clear(input);
		await user.type(input, '123456');
		expect(input).toHaveValue('R$ 1.234,56');
		expect(screen.getByLabelText('Valor numérico')).toHaveTextContent('1234.56');
	});
	it('aceita colar um valor brasileiro já formatado', async () => {
		const { user } = renderWithProviders(<Example initial={0} />);
		await user.click(screen.getByRole('textbox', { name: 'Valor' }));
		await user.keyboard('{Control>}a{/Control}');
		await user.paste('R$ 9.876,54');
		expect(screen.getByRole('textbox', { name: 'Valor' })).toHaveValue('R$ 9.876,54');
		expect(screen.getByLabelText('Valor numérico')).toHaveTextContent('9876.54');
	});
});
