import { screen, within } from '@testing-library/react';
import { useState } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test';
import {
	FormFieldsBuilder,
	type FormFieldState,
	emptyFormField,
	formFieldFromRow,
	formFieldsToPayload,
	parseChoices,
} from './FormFieldsBuilder';
import { cmsFormFieldInputSchema } from '@events-manager/contracts';

// O Radix Select abre no pointerdown e consulta APIs de captura que o jsdom não tem.
beforeAll(() => {
	Element.prototype.hasPointerCapture ??= () => false;
	Element.prototype.setPointerCapture ??= () => {};
	Element.prototype.releasePointerCapture ??= () => {};
});

function Harness({ initial = [] }: { initial?: FormFieldState[] }) {
	const [fields, setFields] = useState<FormFieldState[]>(initial);

	return (
		<div>
			<FormFieldsBuilder value={fields} onChange={setFields} errors={null} />
			<output data-testid="payload">{JSON.stringify(formFieldsToPayload(fields))}</output>
		</div>
	);
}

describe('FormFieldsBuilder', () => {
	it('derives the machine name from the label until it is edited by hand', { timeout: 20_000 }, async () => {
		const { user } = renderWithProviders(<Harness />);

		await user.click(screen.getByRole('button', { name: /adicionar campo/i }));
		const field = screen.getByRole('group', { name: /campo 1/i });
		await user.type(within(field).getByLabelText(/rótulo/i), 'Nome Completo');

		expect(within(field).getByLabelText(/nome máquina/i)).toHaveValue('nome-completo');
		expect(JSON.parse(screen.getByTestId('payload').textContent ?? '[]')[0]).toMatchObject({
			name: 'nome-completo',
			label: 'Nome Completo',
			type: 'text',
			width: '100',
			required: false,
		});
	});

	it('keeps the id of existing fields so their submissions survive a save', () => {
		const existing: FormFieldState = {
			...emptyFormField(),
			id: 'f-1',
			name: 'email',
			label: 'E-mail',
			nameTouched: true,
		};
		renderWithProviders(<Harness initial={[existing]} />);

		expect(JSON.parse(screen.getByTestId('payload').textContent ?? '[]')[0]).toMatchObject({
			id: 'f-1',
			name: 'email',
		});
	});

	it('requires options for choice fields and turns option lines into choices', { timeout: 20_000 }, async () => {
		const { user } = renderWithProviders(<Harness />);

		await user.click(screen.getByRole('button', { name: /adicionar campo/i }));
		const field = screen.getByRole('group', { name: /campo 1/i });
		await user.type(within(field).getByLabelText(/rótulo/i), 'Área');
		await user.click(within(field).getByRole('combobox', { name: /tipo/i }));
		await user.click(await screen.findByRole('option', { name: /lista suspensa/i }));

		const withoutChoices = JSON.parse(screen.getByTestId('payload').textContent ?? '[]')[0];
		expect(cmsFormFieldInputSchema.safeParse(withoutChoices).success).toBe(false);

		await user.type(within(field).getByLabelText(/opções/i), 'Marketing{enter}Vendas | vendas');
		const withChoices = JSON.parse(screen.getByTestId('payload').textContent ?? '[]')[0];
		expect(withChoices.choices).toEqual([
			{ text: 'Marketing', value: 'marketing' },
			{ text: 'Vendas', value: 'vendas' },
		]);
		expect(cmsFormFieldInputSchema.safeParse(withChoices).success).toBe(true);
	});

	it('edits the secondary attributes, reorders and removes fields', { timeout: 20_000 }, async () => {
		const first: FormFieldState = { ...emptyFormField(), id: 'a', name: 'nome', label: 'Nome', nameTouched: true };
		const second: FormFieldState = { ...emptyFormField(), id: 'b', name: 'email', label: 'E-mail', nameTouched: true };
		const { user } = renderWithProviders(<Harness initial={[first, second]} />);
		const payload = () => JSON.parse(screen.getByTestId('payload').textContent ?? '[]');

		const field = screen.getByRole('group', { name: /campo 1/i });
		await user.type(within(field).getByLabelText(/placeholder/i), 'Seu nome');
		await user.type(within(field).getByLabelText(/texto de ajuda/i), 'Como no documento');
		await user.type(within(field).getByLabelText(/validação/i), 'min:2');
		await user.click(within(field).getByRole('checkbox'));
		expect(payload()[0]).toMatchObject({
			placeholder: 'Seu nome',
			help: 'Como no documento',
			validation: 'min:2',
			required: true,
		});

		await user.click(screen.getByRole('button', { name: /mover campo 2 para cima/i }));
		expect(payload().map((entry: { name: string }) => entry.name)).toEqual(['email', 'nome']);
		await user.click(screen.getByRole('button', { name: /mover campo 1 para baixo/i }));
		expect(payload().map((entry: { name: string }) => entry.name)).toEqual(['nome', 'email']);
		await user.click(screen.getByRole('button', { name: /remover campo 2/i }));
		expect(payload()).toHaveLength(1);
	});

	it('restores a saved field, including choices with custom values', () => {
		const state = formFieldFromRow({
			id: 'f1',
			form: 'x',
			name: 'assunto',
			type: 'select',
			label: 'Assunto',
			placeholder: null,
			help: null,
			validation: null,
			width: '50',
			choices: [
				{ text: 'Dúvida', value: 'duvida' },
				{ text: 'Outro', value: 'x' },
			],
			required: true,
			sort: 1,
		} as never);

		expect(state).toMatchObject({
			id: 'f1',
			nameTouched: true,
			choices: 'Dúvida\nOutro | x',
			width: '50',
			required: true,
		});
		expect(parseChoices('A\n\nB | b-valor')).toEqual([
			{ text: 'A', value: 'a' },
			{ text: 'B', value: 'b-valor' },
		]);
		expect(formFieldsToPayload([state])[0]).toMatchObject({
			id: 'f1',
			choices: [
				{ text: 'Dúvida', value: 'duvida' },
				{ text: 'Outro', value: 'x' },
			],
		});
	});
});
