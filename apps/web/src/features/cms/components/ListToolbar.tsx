'use client';
import { QueryFilterSheet, type QueryFilterField } from '@/components/shared/QueryFilterSheet';
import { STATUS_OPTIONS } from '../lib/status';

export function ListToolbar({
	withStatus = true,
	placeholder = 'Buscar pelo título',
}: {
	withStatus?: boolean;
	placeholder?: string;
}) {
	const fields: QueryFilterField[] = [{ name: 'search', label: 'Buscar', type: 'search', placeholder }];
	if (withStatus)
		fields.push({
			name: 'status',
			label: 'Filtrar por status',
			type: 'select',
			options: [{ value: '', label: 'Todos os status' }, ...STATUS_OPTIONS],
		});

	return <QueryFilterSheet title="Filtros de conteúdo" fields={fields} />;
}
