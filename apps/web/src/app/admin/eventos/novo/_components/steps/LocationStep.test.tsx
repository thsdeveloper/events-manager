import { useForm } from 'react-hook-form';
import { screen, waitFor, within, act } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { Form } from '@/components/ui/form';
import { renderWithProviders, mockFetch, jsonResponse, problemResponse } from '@/test';
import { LocationStep } from './LocationStep';
import type { EventWizardFormValues } from '../types';
function Harness({ initialValues = {} }: { initialValues?: Partial<EventWizardFormValues> }) {
	const form = useForm<EventWizardFormValues>({
		defaultValues: {
			event_type: 'in_person',
			show_map: true,
			location_tbd: false,
			location_name: 'Teatro da Sé',
			location_number: '10',
			location_postal_code: '',
			location_state: '',
			latitude: null,
			longitude: null,
			...initialValues,
		},
	});

	return (
		<Form {...form}>
			<LocationStep />
			<output aria-label="Coordenadas salvas">
				{JSON.stringify([form.watch('latitude'), form.watch('longitude')])}
			</output>
		</Form>
	);
}
afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});
describe('local do evento', () => {
	it('aplica a máscara de CEP e preenche o endereço sem alterar nome e número', async () => {
		mockFetch([
			[
				'/api/places/postal-code/01001000',
				() =>
					jsonResponse({
						street: 'Praça da Sé',
						neighborhood: 'Sé',
						city: 'São Paulo',
						state: 'SP',
						postal_code: '01001000',
					}),
			],
		]);
		const { user } = renderWithProviders(<Harness />);
		await user.type(screen.getByLabelText(/^CEP/), '01001000');
		expect(screen.getByLabelText(/^CEP/)).toHaveValue('01001-000');
		await waitFor(() => expect(screen.getByLabelText('Rua ou avenida')).toHaveValue('Praça da Sé'));
		expect(screen.getByLabelText('Cidade')).toHaveValue('São Paulo');
		expect(screen.getByLabelText(/^Nome do local/)).toHaveValue('Teatro da Sé');
		expect(screen.getByLabelText(/^Número/)).toHaveValue('10');
		expect(screen.getByRole('combobox', { name: /^Estado/ })).toHaveTextContent('São Paulo - SP');
	});
	it('mantém os campos editáveis quando a consulta falha', async () => {
		mockFetch([
			['/api/places/postal-code/', () => problemResponse(503, 'POSTAL_CODE_UNAVAILABLE', 'Preencha manualmente.')],
		]);
		const { user } = renderWithProviders(<Harness />);
		await user.type(screen.getByLabelText(/^CEP/), '01001000');
		expect(await screen.findByText('Preencha manualmente.')).toBeInTheDocument();
		await user.type(screen.getByLabelText('Rua ou avenida'), 'Praça da Sé');
		expect(screen.getByLabelText('Rua ou avenida')).toHaveValue('Praça da Sé');
	});
	it('só grava o ponto selecionado ao confirmar o modal', async () => {
		mockFetch([
			[
				'/api/places/search',
				() =>
					jsonResponse({
						predictions: [
							{
								placeId: '1',
								mainText: 'Teatro da Sé',
								description: 'Praça da Sé, São Paulo',
								latitude: -23.55,
								longitude: -46.63,
							},
						],
					}),
			],
		]);
		const { user } = renderWithProviders(<Harness />);
		await user.click(screen.getByRole('button', { name: 'Definir localização no mapa' }));
		const modal = await screen.findByRole('dialog', { name: 'Definir localização no mapa' });
		await user.type(within(modal).getByRole('textbox', { name: 'Buscar endereço no mapa' }), 'Teatro');
		await user.click(await within(modal).findByRole('button', { name: /Teatro da Sé/ }));
		expect(screen.getByLabelText('Coordenadas salvas')).toHaveTextContent('[null,null]');
		await user.click(within(modal).getByRole('button', { name: 'Salvar localização' }));
		expect(screen.getByLabelText('Coordenadas salvas')).toHaveTextContent('[-23.55,-46.63]');
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});
});

it('preserves an existing customized address when returning to the location step', async () => {
	vi.useFakeTimers();
	const fetch = mockFetch([
		[
			'/api/places/postal-code/',
			() =>
				jsonResponse({
					street: 'Endereço do CEP',
					city: 'São Paulo',
					neighborhood: 'Sé',
					state: 'SP',
					postal_code: '01001000',
				}),
		],
	]);
	renderWithProviders(
		<Harness
			initialValues={{
				location_postal_code: '01001000',
				location_street: 'Entrada lateral do teatro',
				location_city: 'São Paulo',
				location_state: 'SP',
			}}
		/>,
	);
	await act(async () => vi.advanceTimersByTimeAsync(1000));
	expect(screen.getByLabelText('Rua ou avenida')).toHaveValue('Entrada lateral do teatro');
	expect(fetch).not.toHaveBeenCalled();
});
