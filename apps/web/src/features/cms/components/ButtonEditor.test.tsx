import { screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { ButtonListEditor, buttonFromRow, buttonToPayload, emptyButton, type ButtonState } from './ButtonEditor';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
	usePathname: () => '/super-admin/conteudo',
}));

function Harness({ initial, onChange }: { initial: ButtonState[]; onChange: (value: ButtonState[]) => void }) {
	const [value, setValue] = useState(initial);

	return (
		<ButtonListEditor
			value={value}
			errors={{ 'buttons.0.url': ['Informe o endereço do botão.'] }}
			onChange={(next) => {
				onChange(next);
				setValue(next);
			}}
		/>
	);
}

describe('ButtonListEditor', () => {
	it('adds buttons up to the limit, edits, reorders and removes them', { timeout: 30_000 }, async () => {
		const onChange = vi.fn<(value: ButtonState[]) => void>();
		const last = () => onChange.mock.calls.at(-1)?.[0] ?? [];
		const { user } = renderWithProviders(<Harness initial={[]} onChange={onChange} />);

		expect(screen.getByText(/nenhum botão/i)).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /adicionar botão/i }));
		await user.click(screen.getByRole('button', { name: /adicionar botão/i }));
		expect(last()).toHaveLength(2);
		expect(screen.getByText('Informe o endereço do botão.')).toBeInTheDocument();

		const first = screen.getByRole('group', { name: 'Botão 1' });
		await user.type(within(first).getByLabelText(/^texto$/i), 'Eventos');
		await user.type(within(first).getByLabelText(/^endereço$/i), '/eventos');
		await user.type(within(screen.getByRole('group', { name: 'Botão 2' })).getByLabelText(/^texto$/i), 'Sobre');
		expect(last().map((button) => button.label)).toEqual(['Eventos', 'Sobre']);

		await user.click(screen.getByRole('button', { name: /mover botão 2 para cima/i }));
		expect(last().map((button) => button.label)).toEqual(['Sobre', 'Eventos']);
		await user.click(screen.getByRole('button', { name: /mover botão 1 para baixo/i }));
		expect(last().map((button) => button.label)).toEqual(['Eventos', 'Sobre']);

		await user.click(screen.getByRole('button', { name: /remover botão 2/i }));
		expect(last()).toEqual([expect.objectContaining({ label: 'Eventos', url: '/eventos' })]);

		for (let index = 0; index < 3; index += 1)
			await user.click(screen.getByRole('button', { name: /adicionar botão/i }));
		expect(screen.getByRole('button', { name: /adicionar botão/i })).toBeDisabled();
	});

	it('converts API rows to editor state and back without losing the target', () => {
		expect(buttonFromRow(null)).toBeNull();
		const fromPage = buttonFromRow({
			id: 'b1',
			label: 'Ir',
			type: 'page',
			url: null,
			page: 'p1',
			post: null,
			variant: 'outline',
		});
		expect(fromPage).toMatchObject({ id: 'b1', type: 'page', page: { id: 'p1' }, post: null, url: '' });
		expect(buttonToPayload(fromPage!)).toEqual({
			id: 'b1',
			label: 'Ir',
			type: 'page',
			url: null,
			page: 'p1',
			post: null,
			variant: 'outline',
		});

		const fromPost = buttonFromRow({
			id: 'b2',
			label: 'Ler',
			type: 'post',
			url: null,
			page: null,
			post: 'x1',
			variant: 'link',
		});
		expect(buttonToPayload(fromPost!)).toMatchObject({ type: 'post', post: 'x1', page: null });

		expect(buttonToPayload({ ...emptyButton(), label: 'Site', url: 'https://ex.com' })).toEqual({
			label: 'Site',
			type: 'url',
			url: 'https://ex.com',
			page: null,
			post: null,
			variant: 'default',
		});
		expect(buttonToPayload(emptyButton())).toMatchObject({ url: null });
	});
});
