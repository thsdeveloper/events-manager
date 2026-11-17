/**
 * Etapa "Detalhes" do assistente de evento. A descrição completa é escrita em
 * um editor de texto livre, com negrito, itálico, listas e links, e o que sai
 * dele é o HTML guardado no formulário.
 */
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { renderWithProviders, mockFetch, jsonResponse, problemResponse } from '@/test';
import type { EventWizardFormValues } from '../types';
import { DetailsStep } from './DetailsStep';

function Harness({ onValues }: { onValues: (values: EventWizardFormValues) => void }) {
	const form = useForm<EventWizardFormValues>({
		defaultValues: {
			title: 'Encontro de tecnologia',
			category_id: '00000000-0000-4000-8000-000000000050',
			short_description: 'Aprendizado e conexões',
			description: '<p>Programação em breve.</p>',
			tags: [],
		} as unknown as EventWizardFormValues,
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

describe('description assistant', () => {
	it('sends event context and lets the organizer review and edit the suggestion before applying it', async () => {
		const requests = mockFetch([
			[
				'/api/ai/generate-description',
				() => jsonResponse({ description: 'Conheça nossas oficinas e faça novas conexões.' }),
			],
		]);
		const onValues = vi.fn();
		const { user } = renderWithProviders(<Harness onValues={onValues} />);
		await screen.findByRole('textbox', { name: 'Descrição completa' });
		await user.click(screen.getByRole('button', { name: 'Criar descrição com IA' }));
		await user.type(
			await screen.findByRole('textbox', { name: /O que não pode faltar/ }),
			'Oficinas práticas para iniciantes',
		);
		await user.click(screen.getByRole('button', { name: 'Gerar sugestão' }));
		const suggestion = await screen.findByRole('textbox', { name: 'Sugestão de descrição' });
		expect(suggestion).toHaveValue('Conheça nossas oficinas e faça novas conexões.');
		expect(onValues.mock.calls.every(([values]) => values.description === '<p>Programação em breve.</p>')).toBe(true);
		expect(JSON.parse(String(requests.mock.calls[0][1]?.body))).toMatchObject({
			title: 'Encontro de tecnologia',
			brief: 'Oficinas práticas para iniciantes',
		});
		await user.clear(suggestion);
		await user.type(suggestion, 'Texto revisado <script>alert(1)</script>');
		await user.click(screen.getByRole('button', { name: 'Usar esta descrição' }));
		expect(screen.getByRole('textbox', { name: 'Descrição completa' })).toHaveTextContent(
			'Texto revisado <script>alert(1)</script>',
		);
		expect(onValues.mock.calls.at(-1)?.[0].description).toContain('&lt;script&gt;');
	});
	it('keeps the original text after a failed generation and permits retry', async () => {
		let attempts = 0;
		mockFetch([
			[
				'/api/ai/generate-description',
				() =>
					++attempts === 1
						? problemResponse(502, 'Geração indisponível')
						: jsonResponse({ description: 'Uma nova sugestão para o evento.' }),
			],
		]);
		const { user } = renderWithProviders(<Harness onValues={() => {}} />);
		await screen.findByRole('textbox', { name: 'Descrição completa' });
		await user.click(screen.getByRole('button', { name: 'Criar descrição com IA' }));
		await user.click(screen.getByRole('button', { name: 'Gerar sugestão' }));
		expect(await screen.findByRole('alert')).toHaveTextContent('Geração indisponível');
		await user.click(screen.getByRole('button', { name: 'Gerar sugestão' }));
		await screen.findByRole('textbox', { name: 'Sugestão de descrição' });
		await user.click(screen.getByRole('button', { name: 'Descartar sugestão' }));
		expect(screen.getByRole('textbox', { name: 'Descrição completa' })).toHaveTextContent('Programação em breve.');
	});
});
