import { useQuery } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { AdminEventScope, useAdminEventScope } from './AdminEventScope';

function Page() {
	const [search, setSearch] = useState('');
	const { selectedEventId } = useAdminEventScope();
	const query = useQuery({
		queryKey: ['scope-test'],
		queryFn: async () => (await fetch('/api/admin/dashboard')).json(),
		staleTime: Infinity,
	});

	return (
		<>
			<label>
				Busca
				<input value={search} onChange={(event) => setSearch(event.target.value)} />
			</label>
			<p>{selectedEventId ?? 'Todos'}</p>
			<p>{query.data?.title}</p>
		</>
	);
}

describe('contexto global do admin', () => {
	it('descarta cache e filtros locais quando o evento ou a organização muda', async () => {
		let title = 'Dados do Congresso';
		mockFetch([['/api/admin/dashboard', () => jsonResponse({ title })]]);
		const view = (scopeKey: string, selectedEventId: string | null) => (
			<AdminEventScope scopeKey={scopeKey} selection={{ events: [], selectedEventId }}>
				<Page />
			</AdminEventScope>
		);
		const { user, rerender } = renderWithProviders(view('user:org', 'a'));
		await screen.findByText('Dados do Congresso');
		await user.type(screen.getByRole('textbox', { name: 'Busca' }), 'Ingresso antigo');
		title = 'Dados da Oficina';
		rerender(view('user:org', 'b'));
		await screen.findByText('Dados da Oficina');
		expect(screen.queryByText('Dados do Congresso')).not.toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: 'Busca' })).toHaveValue('');
		title = 'Dados de outra organização';
		rerender(view('user:org-2', null));
		await screen.findByText('Dados de outra organização');
		expect(screen.getByText('Todos')).toBeInTheDocument();
	});
});
