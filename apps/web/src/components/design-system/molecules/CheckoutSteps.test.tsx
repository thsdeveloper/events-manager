/**
 * A trilha de etapas do checkout diz onde a pessoa está e quanto falta. Precisa
 * ser navegável por leitor de tela: uma lista ordenada, com a etapa atual
 * anunciada por `aria-current`.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from '@/test';
import { CheckoutSteps } from './CheckoutSteps';

const steps = [
	{ id: 'tickets', label: 'Ingressos' },
	{ id: 'details', label: 'Seus dados' },
	{ id: 'payment', label: 'Pagamento' },
];

describe('CheckoutSteps', () => {
	it('lists every step in order', () => {
		render(<CheckoutSteps steps={steps} currentStep="tickets" />);

		const items = within(screen.getByRole('list')).getAllByRole('listitem');
		expect(items.map((item) => item.textContent)).toEqual(['1Ingressos', '2Seus dados', '3Pagamento']);
	});

	it('announces which step the buyer is on', () => {
		render(<CheckoutSteps steps={steps} currentStep="details" />);

		expect(screen.getByText('Seus dados').closest('li')).toHaveAttribute('aria-current', 'step');
		expect(screen.getByText('Ingressos').closest('li')).not.toHaveAttribute('aria-current');
	});

	it('marks the steps already finished', () => {
		render(<CheckoutSteps steps={steps} currentStep="payment" />);

		expect(screen.getByLabelText('Ingressos concluído')).toBeInTheDocument();
		expect(screen.getByLabelText('Seus dados concluído')).toBeInTheDocument();
		expect(screen.queryByLabelText('Pagamento concluído')).not.toBeInTheDocument();
	});

	it('names the trail for people using a screen reader', () => {
		render(<CheckoutSteps steps={steps} currentStep="tickets" />);

		expect(screen.getByRole('navigation', { name: 'Etapas da compra' })).toBeInTheDocument();
	});

	it('lets the buyer go back to a finished step, but not skip ahead', async () => {
		const onStepSelect = vi.fn();
		render(<CheckoutSteps steps={steps} currentStep="details" onStepSelect={onStepSelect} />);

		await userEvent.click(screen.getByRole('button', { name: 'Voltar para Ingressos' }));

		expect(onStepSelect).toHaveBeenCalledWith('tickets');
		expect(screen.queryByRole('button', { name: /Pagamento/ })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Seus dados/ })).not.toBeInTheDocument();
	});

	it('keeps finished steps static when nobody listens for a click', () => {
		render(<CheckoutSteps steps={steps} currentStep="payment" />);

		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});
});
