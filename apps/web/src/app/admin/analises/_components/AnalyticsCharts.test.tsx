import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { SalesChart } from './SalesChart';
import { PaymentMethodsChart } from './PaymentMethodsChart';
import { PaymentStatusDonut } from './PaymentStatusDonut';
import { CheckinHeatmap } from './CheckinHeatmap';
import { InstallmentAnalysis } from './InstallmentAnalysis';

describe('analytics charts', () => {
	it.each([
		[90, 'Excelente'],
		[60, 'Moderado'],
		[20, 'Crítico'],
	] as const)('announces %s percent received with the corresponding financial status', (received, status) => {
		renderWithProviders(
			<InstallmentAnalysis
				alerts={[]}
				summary={[
					{ status: 'active', count: 1, totalAmount: 100, receivedAmount: received, pendingAmount: 100 - received },
				]}
			/>,
		);
		expect(screen.getByRole('progressbar', { name: 'Valor recebido dos parcelamentos' })).toHaveAttribute(
			'aria-valuenow',
			String(received),
		);
		expect(screen.getByText(status)).toBeInTheDocument();
	});
	beforeEach(() => {
		// jsdom does not perform layout; TanStack Charts measures the chart at the browser boundary.
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
			width: 640,
			height: 350,
			x: 0,
			y: 0,
			top: 0,
			left: 0,
			right: 640,
			bottom: 350,
			toJSON: () => ({}),
		});
	});
	it('identifies sales and ticket series in an accessible chart', async () => {
		renderWithProviders(<SalesChart data={[{ date: '17/11', revenue: 500, tickets: 5 }]} />);
		expect(await screen.findByRole('region', { name: 'Vendas ao longo do tempo' })).toBeInTheDocument();
		expect(screen.getByText('Receita (R$)')).toBeInTheDocument();
		expect(screen.getByText('Ingressos')).toBeInTheDocument();
	});
	it('keeps the payment method totals and their chart', () => {
		renderWithProviders(<PaymentMethodsChart data={[{ method: 'pix', count: 5, revenue: 500 }]} />);
		expect(screen.getByRole('region', { name: 'Métodos de pagamento' })).toBeInTheDocument();
		expect(screen.getByText('5')).toBeInTheDocument();
		expect(screen.getByText('Receita Total').parentElement).toHaveTextContent(/R\$\s?500/);
		expect(screen.getByText('100.0% da receita')).toBeInTheDocument();
	});
	it('keeps status names and ticket counts in the legend', () => {
		renderWithProviders(<PaymentStatusDonut data={[{ status: 'paid', count: 5, value: 500, percentage: 100 }]} />);
		expect(screen.getByRole('region', { name: 'Status dos pagamentos' })).toBeInTheDocument();
		expect(screen.getByText('Pago (5)')).toBeInTheDocument();
	});
	it('shows the check-in peak and an identifiable distribution chart', () => {
		renderWithProviders(<CheckinHeatmap data={[{ hour: '10h', count: 5, percentage: 100 }]} />);
		expect(screen.getByRole('region', { name: 'Check-ins por horário' })).toBeInTheDocument();
		expect(screen.getByText('5 check-ins (100.0%)')).toBeInTheDocument();
	});
	it('explains when no check-ins are available', () => {
		renderWithProviders(<CheckinHeatmap data={[]} />);
		expect(screen.getByText('Nenhum check-in registrado ainda')).toBeInTheDocument();
	});
});
