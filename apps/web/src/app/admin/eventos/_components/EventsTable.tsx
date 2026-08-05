'use client';

import * as React from 'react';
import { Table } from '@tanstack/react-table';
import { Filter, X } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EventWithStats, getEventsColumns } from './EventsColumns';

interface EventsTableProps {
	data: EventWithStats[];
	onEventDeleted?: () => void;
}

export function EventsTable({ data, onEventDeleted }: EventsTableProps) {
	const toolbar = (table: Table<EventWithStats>) => {
		const isFiltered = table.getState().columnFilters.length > 0;
		const statusFilter = table.getColumn('status');
		const typeFilter = table.getColumn('event_type');
		const freeFilter = table.getColumn('is_free');
		const featuredFilter = table.getColumn('featured');

		return (
			<div className="flex flex-1 flex-wrap items-center gap-2">
				<input
					placeholder="Buscar eventos..."
					value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
					onChange={(event) => table.getColumn('title')?.setFilterValue(event.target.value)}
					className="h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
				/>

				{/* Status Filter */}
				{statusFilter && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="h-10 border-dashed">
								<Filter className="mr-2 size-4" />
								Status
								{(statusFilter.getFilterValue() as string[])?.length > 0 && (
									<div className="ml-2 flex items-center gap-1">
										<div className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
											{(statusFilter.getFilterValue() as string[]).length}
										</div>
									</div>
								)}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-[200px]">
							<DropdownMenuLabel>Filtrar por status</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{['published', 'draft', 'cancelled', 'archived'].map((status) => {
								const isSelected = (statusFilter.getFilterValue() as string[])?.includes(status);
								const statusLabels: Record<string, string> = {
									published: 'Publicado',
									draft: 'Rascunho',
									cancelled: 'Cancelado',
									archived: 'Arquivado',
								};

								return (
									<DropdownMenuCheckboxItem
										key={status}
										checked={isSelected}
										onCheckedChange={(checked) => {
											const current = (statusFilter.getFilterValue() as string[]) || [];
											if (checked) {
												statusFilter.setFilterValue([...current, status]);
											} else {
												statusFilter.setFilterValue(current.filter((s) => s !== status));
											}
										}}
									>
										{statusLabels[status]}
									</DropdownMenuCheckboxItem>
								);
							})}
						</DropdownMenuContent>
					</DropdownMenu>
				)}

				{/* Event Type Filter */}
				{typeFilter && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="h-10 border-dashed">
								<Filter className="mr-2 size-4" />
								Tipo
								{(typeFilter.getFilterValue() as string[])?.length > 0 && (
									<div className="ml-2 flex items-center gap-1">
										<div className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
											{(typeFilter.getFilterValue() as string[]).length}
										</div>
									</div>
								)}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-[200px]">
							<DropdownMenuLabel>Filtrar por tipo</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{['online', 'hybrid', 'in_person'].map((type) => {
								const isSelected = (typeFilter.getFilterValue() as string[])?.includes(type);
								const typeLabels: Record<string, string> = {
									online: 'Online',
									hybrid: 'Híbrido',
									in_person: 'Presencial',
								};

								return (
									<DropdownMenuCheckboxItem
										key={type}
										checked={isSelected}
										onCheckedChange={(checked) => {
											const current = (typeFilter.getFilterValue() as string[]) || [];
											if (checked) {
												typeFilter.setFilterValue([...current, type]);
											} else {
												typeFilter.setFilterValue(current.filter((t) => t !== type));
											}
										}}
									>
										{typeLabels[type]}
									</DropdownMenuCheckboxItem>
								);
							})}
						</DropdownMenuContent>
					</DropdownMenu>
				)}

				{/* Free Filter */}
				{freeFilter && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="h-10 border-dashed">
								<Filter className="mr-2 size-4" />
								Gratuito
								{freeFilter.getFilterValue() !== undefined && (
									<div className="ml-2 flex items-center gap-1">
										<div className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
											1
										</div>
									</div>
								)}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-[200px]">
							<DropdownMenuLabel>Filtrar por gratuidade</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuCheckboxItem
								checked={freeFilter.getFilterValue() === true}
								onCheckedChange={(checked) => {
									freeFilter.setFilterValue(checked ? true : undefined);
								}}
							>
								Apenas gratuitos
							</DropdownMenuCheckboxItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}

				{/* Featured Filter */}
				{featuredFilter && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm" className="h-10 border-dashed">
								<Filter className="mr-2 size-4" />
								Destaque
								{featuredFilter.getFilterValue() !== undefined && (
									<div className="ml-2 flex items-center gap-1">
										<div className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
											1
										</div>
									</div>
								)}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-[200px]">
							<DropdownMenuLabel>Filtrar por destaque</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuCheckboxItem
								checked={featuredFilter.getFilterValue() === true}
								onCheckedChange={(checked) => {
									featuredFilter.setFilterValue(checked ? true : undefined);
								}}
							>
								Apenas em destaque
							</DropdownMenuCheckboxItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}

				{isFiltered && (
					<Button
						variant="ghost"
						onClick={() => table.resetColumnFilters()}
						className="h-10 px-2 text-muted-foreground lg:px-3"
					>
						Limpar filtros
						<X className="ml-2 size-4" />
					</Button>
				)}
			</div>
		);
	};

	const columns = React.useMemo(() => getEventsColumns(onEventDeleted), [onEventDeleted]);

	return <DataTable columns={columns} data={data} toolbar={toolbar} />;
}
