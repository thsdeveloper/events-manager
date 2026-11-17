import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { DatePicker } from './date-picker';
describe('DatePicker', () => {
	it('opens at the selected month, keeps the field label, and closes after picking a day', async () => {
		const onSelect = vi.fn();
		const { user } = renderWithProviders(
			<>
				<label htmlFor="start">Data inicial</label>
				<DatePicker id="start" date={new Date(2030, 10, 17)} onSelect={onSelect} />
			</>,
		);
		await user.click(screen.getByRole('button', { name: 'Data inicial' }));
		await user.click(screen.getByRole('button', { name: /18 de novembro de 2030/i }));
		expect(onSelect).toHaveBeenCalledExactlyOnceWith(new Date(2030, 10, 18));
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});
	it('treats minimum and maximum as inclusive calendar days and allows clearing an optional date', async () => {
		const onSelect = vi.fn();
		const { user } = renderWithProviders(
			<DatePicker
				date={new Date(2026, 10, 17)}
				minDate={new Date(2026, 10, 17, 18)}
				maxDate={new Date(2026, 10, 20)}
				onSelect={onSelect}
			/>,
		);
		await user.click(screen.getByRole('button'));
		expect(screen.getByRole('button', { name: /17 de novembro de 2026/i })).toBeEnabled();
		expect(screen.getByRole('button', { name: /16 de novembro de 2026/i })).toBeDisabled();
		expect(screen.getByRole('button', { name: /20 de novembro de 2026/i })).toBeEnabled();
		expect(screen.getByRole('button', { name: /21 de novembro de 2026/i })).toBeDisabled();
		await user.click(screen.getByRole('button', { name: 'Limpar data' }));
		expect(onSelect).toHaveBeenCalledWith(undefined);
	});
});
