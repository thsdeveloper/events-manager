import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { AnalyticsFilters } from './AnalyticsFilters';
it('batches the analytics period and event instead of requesting data for every selection', async () => {
	const change = vi.fn();
	const { user } = renderWithProviders(
		<AnalyticsFilters onFilterChange={change} events={[{ id: 'e1', title: 'Congresso' }]} />,
	);
	await user.click(screen.getByRole('button', { name: /Filtros/ }));
	await user.click(screen.getByRole('combobox', { name: 'Período' }));
	await user.click(screen.getByRole('option', { name: 'Últimos 7 dias' }));
	expect(screen.getByRole('combobox', { name: 'Período' })).toHaveTextContent('Últimos 7 dias');
	await user.click(screen.getByRole('combobox', { name: 'Evento' }));
	await user.click(screen.getByRole('option', { name: 'Congresso' }));
	expect(change).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
	expect(change).toHaveBeenCalledExactlyOnceWith(
		expect.objectContaining({ eventId: 'e1', startDate: expect.any(Date), endDate: expect.any(Date) }),
	);
});
it('selects calendar dates inside the sheet and applies inclusive local-day boundaries', async () => {
	const change = vi.fn();
	const { user } = renderWithProviders(
		<AnalyticsFilters
			onFilterChange={change}
			filters={{ startDate: new Date(2026, 10, 17), endDate: new Date(2026, 10, 20) }}
		/>,
	);
	await user.click(screen.getByRole('button', { name: /Filtros/ }));
	await user.click(screen.getByRole('button', { name: 'Data inicial' }));
	await user.click(screen.getByRole('button', { name: /18 de novembro de 2026/i }));
	await user.click(screen.getByRole('button', { name: 'Data final' }));
	await user.click(screen.getByRole('button', { name: /21 de novembro de 2026/i }));
	expect(change).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
	expect(change).toHaveBeenCalledWith({
		startDate: new Date(2026, 10, 18),
		endDate: new Date(2026, 10, 21, 23, 59, 59, 999),
	});
});
