import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { DateInput } from './date-input';

function renderInput(props: Partial<React.ComponentProps<typeof DateInput>> = {}) {
	const onChange = vi.fn();
	const rendered = renderWithProviders(
		<>
			<label htmlFor="birth">Data de nascimento</label>
			<DateInput id="birth" value="" onChange={onChange} {...props} />
		</>,
	);

	return { onChange, ...rendered, field: screen.getByLabelText('Data de nascimento') };
}

describe('DateInput', () => {
	it('shows an ISO value the Brazilian way', () => {
		const { field } = renderInput({ value: '1990-09-26' });

		expect(field).toHaveValue('26/09/1990');
		expect(field).toHaveAttribute('inputmode', 'numeric');
	});

	it('masks the digits while typing and reports the ISO date once it is complete', async () => {
		const { user, field, onChange } = renderInput();

		await user.type(field, '2609');
		expect(field).toHaveValue('26/09');
		expect(onChange).not.toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-/));

		await user.type(field, '1990');

		expect(field).toHaveValue('26/09/1990');
		expect(onChange).toHaveBeenLastCalledWith('1990-09-26');
	});

	it('reports an empty value for an impossible date instead of a made-up one', async () => {
		const { user, field, onChange } = renderInput();

		await user.type(field, '31021990');

		expect(field).toHaveValue('31/02/1990');
		expect(onChange).toHaveBeenLastCalledWith('');
	});

	it('follows an external reset of the value', () => {
		const { field, rerender, onChange } = renderInput({ value: '1990-09-26' });

		rerender(
			<>
				<label htmlFor="birth">Data de nascimento</label>
				<DateInput id="birth" value="" onChange={onChange} />
			</>,
		);

		expect(field).toHaveValue('');
	});

	it('opens a calendar with month and year selectors, starting at the latest allowed year', async () => {
		const { user } = renderInput({ max: '2013-09-04' });

		await user.click(screen.getByRole('button', { name: /abrir calendário/i }));

		const year = await screen.findByRole('combobox', { name: 'Ano' });
		expect(year).toHaveValue('2013');
		expect(screen.getByRole('combobox', { name: 'Mês' })).toBeInTheDocument();
	});

	it('picks a day from the calendar and closes it', async () => {
		const { user, field, onChange } = renderInput({ value: '1990-09-26' });

		await user.click(screen.getByRole('button', { name: /abrir calendário/i }));
		await user.click(await screen.findByRole('button', { name: /, 15 de setembro de 1990/i }));

		expect(onChange).toHaveBeenLastCalledWith('1990-09-15');
		expect(field).toHaveValue('15/09/1990');
		await waitFor(() => expect(screen.queryByRole('combobox', { name: 'Ano' })).not.toBeInTheDocument());
	});

	it('does not allow days after the maximum', async () => {
		const { user } = renderInput({ value: '2013-09-01', max: '2013-09-04' });

		await user.click(screen.getByRole('button', { name: /abrir calendário/i }));

		expect(await screen.findByRole('button', { name: /, 5 de setembro de 2013/i })).toBeDisabled();
		expect(screen.getByRole('button', { name: /, 4 de setembro de 2013/i })).toBeEnabled();
	});
});
