import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { DateTimePicker } from './date-time-picker';

describe('DateTimePicker', () => {
	it('keeps its accessible field name and updates the time when a preset changes the date', async () => {
		const setDate = vi.fn();
		const { user, rerender } = renderWithProviders(
			<DateTimePicker aria-label="Término do evento" date={new Date(2026, 10, 17, 9)} setDate={setDate} />,
		);
		await user.click(screen.getByRole('button', { name: 'Término do evento' }));
		expect(screen.getByLabelText('Horário')).toHaveValue('09:00');
		rerender(<DateTimePicker aria-label="Término do evento" date={new Date(2026, 10, 17, 18, 30)} setDate={setDate} />);
		expect(screen.getByLabelText('Horário')).toHaveValue('18:30');
	});
	it('allows choosing the same calendar day as the minimum without allowing earlier days', async () => {
		const { user } = renderWithProviders(
			<DateTimePicker
				aria-label="Fim"
				date={new Date(2026, 10, 17, 18)}
				minDate={new Date(2026, 10, 17, 9)}
				setDate={vi.fn()}
			/>,
		);
		await user.click(screen.getByRole('button', { name: 'Fim' }));
		expect(screen.getByRole('button', { name: /17 de novembro de 2026/i })).toBeEnabled();
		expect(screen.getByRole('button', { name: /16 de novembro de 2026/i })).toBeDisabled();
	});
});
