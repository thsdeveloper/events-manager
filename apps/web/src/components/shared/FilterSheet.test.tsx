import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FilterSheet } from './FilterSheet';

function setup(initial = 'Original') {
	const apply = vi.fn();
	function Example() {
		const [values, setValues] = useState({ search: initial });

		return (
			<FilterSheet
				values={values}
				defaultValues={{ search: '' }}
				activeCount={values.search ? 1 : 0}
				title="Filtros de eventos"
				onApply={(next) => {
					apply(next);
					setValues(next);
				}}
				validate={(next) => (next.search === 'inválido' ? 'Revise a busca.' : undefined)}
			>
				{(draft, setDraft) => (
					<>
						<Label htmlFor="filter-search">Busca</Label>
						<Input
							id="filter-search"
							value={draft.search}
							onChange={(event) => setDraft({ search: event.target.value })}
						/>
					</>
				)}
			</FilterSheet>
		);
	}

	return { apply, ...renderWithProviders(<Example />) };
}

describe('FilterSheet', () => {
	it('opens filters on demand and applies all changes once, returning focus to the trigger', async () => {
		const { user, apply } = setup();
		expect(screen.queryByRole('textbox', { name: 'Busca' })).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /Filtros/ }));
		const dialog = screen.getByRole('dialog', { name: 'Filtros de eventos' });
		await user.clear(within(dialog).getByLabelText('Busca'));
		await user.type(within(dialog).getByLabelText('Busca'), 'Conferência');
		expect(apply).not.toHaveBeenCalled();
		await user.click(within(dialog).getByRole('button', { name: 'Aplicar filtros' }));
		expect(apply).toHaveBeenCalledExactlyOnceWith({ search: 'Conferência' });
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Filtros/ })).toHaveFocus();
	});
	it('discards edits on cancel and Escape and restores the latest applied values on reopening', async () => {
		const { user, apply } = setup();
		for (const close of ['cancel', 'escape']) {
			await user.click(screen.getByRole('button', { name: /Filtros/ }));
			expect(screen.getByLabelText('Busca')).toHaveValue('Original');
			await user.type(screen.getByLabelText('Busca'), ' alteração');
			if (close === 'cancel') await user.click(screen.getByRole('button', { name: 'Cancelar' }));
			else await user.keyboard('{Escape}');
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		}
		expect(apply).not.toHaveBeenCalled();
	});
	it('clears only the draft until the organizer explicitly applies it', async () => {
		const { user, apply } = setup();
		await user.click(screen.getByRole('button', { name: /Filtros/ }));
		await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
		expect(screen.getByLabelText('Busca')).toHaveValue('');
		expect(apply).not.toHaveBeenCalled();
		await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
		expect(apply).toHaveBeenCalledExactlyOnceWith({ search: '' });
		expect(screen.getByRole('button', { name: 'Filtros' })).toBeInTheDocument();
	});
	it('keeps invalid filters open and allows correcting and submitting with Enter', async () => {
		const { user, apply } = setup('inválido');
		await user.click(screen.getByRole('button', { name: /Filtros/ }));
		await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
		expect(screen.getByRole('alert')).toHaveTextContent('Revise a busca.');
		expect(apply).not.toHaveBeenCalled();
		await user.clear(screen.getByLabelText('Busca'));
		await user.type(screen.getByLabelText('Busca'), 'Válido{Enter}');
		expect(apply).toHaveBeenCalledExactlyOnceWith({ search: 'Válido' });
	});
});
