import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { WizardProgressBar } from './WizardProgressBar';
import { Tabs } from '@/components/ui/base-tabs';
const steps = [
	{ id: 'basic' as const, title: 'Básico', description: 'Informações', estimatedMinutes: 1 },
	{ id: 'location' as const, title: 'Local', description: 'Endereço', estimatedMinutes: 1 },
	{ id: 'review' as const, title: 'Revisão', description: 'Conferência', estimatedMinutes: 1 },
];
describe('abas do cadastro', () => {
	it('identifica a etapa selecionada e permite voltar às etapas visitadas', async () => {
		const select = vi.fn();
		const { user } = renderWithProviders(
			<Tabs value={1}>
				<WizardProgressBar steps={steps} currentStep={1} visitedSteps={new Set([0, 1])} onStepSelect={select} />
			</Tabs>,
		);
		expect(screen.getByRole('tab', { name: /Local/ })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('tab', { name: /Revisão/ })).toHaveAttribute('aria-disabled', 'true');
		await user.click(screen.getByRole('tab', { name: /Básico/ }));
		expect(select).toHaveBeenCalledWith(0);
	});
});
