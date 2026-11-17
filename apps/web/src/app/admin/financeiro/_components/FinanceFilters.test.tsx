import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import FinanceFilters, { type AppliedFilters } from './FinanceFilters';
const filters: AppliedFilters = {
	range: '30d',
	status: 'all',
	eventId: 'all',
	search: '',
	customFrom: null,
	customTo: null,
};
describe('FinanceFilters', () => {
	it('applies the current search without waiting for a debounce and includes the selected status', async () => {
		const apply = vi.fn();
		const { user } = renderWithProviders(<FinanceFilters events={[]} filters={filters} onApply={apply} />);
		await user.click(screen.getByRole('button', { name: /Filtros/ }));
		await user.type(screen.getByLabelText('Busca'), 'Ana');
		await user.click(screen.getByRole('combobox', { name: 'Status' }));
		await user.click(screen.getByRole('option', { name: 'Pago' }));
		expect(apply).not.toHaveBeenCalled();
		await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
		expect(apply).toHaveBeenCalledExactlyOnceWith({ ...filters, search: 'Ana', status: 'succeeded' });
	});
	it('keeps an inverted custom period open until its dates are corrected', async () => {
		const apply = vi.fn();
		const { user } = renderWithProviders(
			<FinanceFilters
				events={[]}
				filters={{ ...filters, range: 'custom', customFrom: '2026-11-20', customTo: '2026-11-01' }}
				onApply={apply}
			/>,
		);
		await user.click(screen.getByRole('button', { name: /Filtros/ }));
		await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
		expect(screen.getByRole('alert')).toHaveTextContent(/final.*inicial/i);
		expect(apply).not.toHaveBeenCalled();
	});
});
it('uses a calendar for a custom period while keeping ISO dates in the filter contract', async () => {
	const apply = vi.fn();
	const { user } = renderWithProviders(
		<FinanceFilters
			events={[]}
			onApply={apply}
			filters={{ ...filters, range: 'custom', customFrom: '2026-11-17', customTo: '2026-11-20' }}
		/>,
	);
	await user.click(screen.getByRole('button', { name: /Filtros/ }));
	await user.click(screen.getByRole('button', { name: 'Data inicial' }));
	await user.click(screen.getByRole('button', { name: /18 de novembro de 2026/i }));
	await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
	expect(apply).toHaveBeenCalledWith({ ...filters, range: 'custom', customFrom: '2026-11-18', customTo: '2026-11-20' });
});
