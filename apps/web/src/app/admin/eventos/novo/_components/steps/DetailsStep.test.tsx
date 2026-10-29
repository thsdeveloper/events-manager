/**
 * Etapa "Detalhes" do assistente de evento. A descrição completa é escrita em
 * um editor de texto livre, com negrito, itálico, listas e links, e o que sai
 * dele é o HTML guardado no formulário.
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { renderWithProviders } from '@/test';
import type { EventWizardFormValues } from '../types';
import { DetailsStep } from './DetailsStep';

function Harness({ onValues }: { onValues: (values: EventWizardFormValues) => void }) {
	const form = useForm<EventWizardFormValues>({
		defaultValues: { description: '<p>Programação em breve.</p>', tags: [] } as unknown as EventWizardFormValues,
	});
	form.watch((values) => onValues(values as EventWizardFormValues));

	return (
		<FormProvider {...form}>
			<DetailsStep />
		</FormProvider>
	);
}

describe('DetailsStep', () => {
	it('offers a rich text editor for the full description, with formatting and links but no image library', async () => {
		renderWithProviders(<Harness onValues={() => {}} />);

		const editor = await screen.findByRole('textbox', { name: 'Descrição completa' });
		expect(editor).toHaveTextContent('Programação em breve.');
		const toolbar = screen.getByRole('toolbar', { name: 'Formatação' });
		expect(toolbar).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /negrito/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /itálico/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /inserir link/i })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /inserir imagem/i })).not.toBeInTheDocument();
	});

	it('stores the formatted HTML in the form and counts the visible characters', { timeout: 20_000 }, async () => {
		let latest: EventWizardFormValues | null = null;
		const { user } = renderWithProviders(<Harness onValues={(values) => (latest = values)} />);

		const editor = await screen.findByRole('textbox', { name: 'Descrição completa' });
		expect(screen.getByText(/21 caracteres/)).toBeInTheDocument();

		await user.click(editor);
		await user.keyboard('{Control>}a{/Control}');
		await user.click(screen.getByRole('button', { name: /negrito/i }));

		await waitFor(() => expect(latest?.description).toBe('<p><strong>Programação em breve.</strong></p>'));
		expect(screen.getByText(/21 caracteres/)).toBeInTheDocument();
	});
});
