'use client';

import { useEffect, useState } from 'react';
import { CalendarRange, Filter, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';

export type RangeOption = '30d' | '90d' | 'year' | 'custom';
export type StatusOption = 'all' | 'succeeded' | 'pending' | 'failed' | 'refunded';

export type AppliedFilters = {
	range: RangeOption;
	status: StatusOption;
	eventId: string | 'all';
	search: string;
	customFrom: string | null;
	customTo: string | null;
};

export type FiltersDraft = AppliedFilters;

interface FinanceFiltersProps {
	events: Array<{ id: string; title: string }>;
	filters: AppliedFilters;
	onApply: (draft: FiltersDraft) => void;
}

const defaultDraft: FiltersDraft = {
	range: '30d',
	status: 'all',
	eventId: 'all',
	search: '',
	customFrom: null,
	customTo: null,
};

export default function FinanceFilters({ events, filters, onApply }: FinanceFiltersProps) {
	const [draft, setDraft] = useState<FiltersDraft>(filters ?? defaultDraft);
	const [searchInput, setSearchInput] = useState(filters?.search ?? '');
	const debouncedSearch = useDebounce(searchInput, 500);

	useEffect(() => {
		setDraft(filters);
		setSearchInput(filters?.search ?? '');
	}, [filters]);

	useEffect(() => {
		setDraft((prev) => ({ ...prev, search: debouncedSearch }));
	}, [debouncedSearch]);

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onApply(draft);
	};

	const handleReset = () => {
		setDraft(defaultDraft);
		setSearchInput('');
		onApply(defaultDraft);
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="grid grid-cols-1 gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-slate-900 md:grid-cols-2 lg:grid-cols-4"
		>
			<div className="flex flex-col gap-2">
				<Label htmlFor="range" className="text-xs font-semibold uppercase text-gray-500">
					Período
				</Label>
				<Select
					value={draft.range}
					onValueChange={(value) =>
						setDraft((prev) => ({
							...prev,
							range: value as RangeOption,
						}))
					}
				>
					<SelectTrigger id="range" className="bg-white dark:bg-slate-900">
						<SelectValue placeholder="Selecione o período" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="30d">Últimos 30 dias</SelectItem>
						<SelectItem value="90d">Últimos 90 dias</SelectItem>
						<SelectItem value="year">Últimos 12 meses</SelectItem>
						<SelectItem value="custom">Personalizado</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="status" className="text-xs font-semibold uppercase text-gray-500">
					Status
				</Label>
				<Select
					value={draft.status}
					onValueChange={(value) =>
						setDraft((prev) => ({
							...prev,
							status: value as StatusOption,
						}))
					}
				>
					<SelectTrigger id="status" className="bg-white dark:bg-slate-900">
						<SelectValue placeholder="Todos os status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos</SelectItem>
						<SelectItem value="succeeded">Pago</SelectItem>
						<SelectItem value="pending">Pendente</SelectItem>
						<SelectItem value="failed">Falhou</SelectItem>
						<SelectItem value="refunded">Reembolsado</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="event" className="text-xs font-semibold uppercase text-gray-500">
					Eventos
				</Label>
				<Select
					value={draft.eventId}
					onValueChange={(value) =>
						setDraft((prev) => ({
							...prev,
							eventId: value,
						}))
					}
				>
					<SelectTrigger id="event" className="bg-white dark:bg-slate-900">
						<SelectValue placeholder="Todos os eventos" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Todos os eventos</SelectItem>
						{events.map((event) => (
							<SelectItem key={event.id} value={event.id}>
								{event.title}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="search" className="text-xs font-semibold uppercase text-gray-500">
					Busca
				</Label>
				<Input
					id="search"
					value={searchInput}
					onChange={(event) => setSearchInput(event.target.value)}
					placeholder="Nome, email ou ID AbacatePay"
					className="bg-white dark:bg-slate-900"
				/>
			</div>

			{draft.range === 'custom' && (
				<>
					<div className="flex flex-col gap-2">
						<Label htmlFor="date-from" className="text-xs font-semibold uppercase text-gray-500">
							Data inicial
						</Label>
						<div className="relative">
							<CalendarRange className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
							<Input
								id="date-from"
								type="date"
								value={draft.customFrom ?? ''}
								onChange={(event) =>
									setDraft((prev) => ({
										...prev,
										customFrom: event.target.value || null,
									}))
								}
								className="pl-9"
							/>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="date-to" className="text-xs font-semibold uppercase text-gray-500">
							Data final
						</Label>
						<div className="relative">
							<CalendarRange className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
							<Input
								id="date-to"
								type="date"
								value={draft.customTo ?? ''}
								onChange={(event) =>
									setDraft((prev) => ({
										...prev,
										customTo: event.target.value || null,
									}))
								}
								className="pl-9"
							/>
						</div>
					</div>
				</>
			)}

			<div className="col-span-1 flex items-end gap-2 md:col-span-2 lg:col-span-4">
				<Button type="submit" className="flex-1">
					<Filter className="mr-2 size-4" />
					Aplicar filtros
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={handleReset}
					className="flex-1 md:flex-none md:px-4"
				>
					<XCircle className="mr-2 size-4" />
					Limpar
				</Button>
			</div>
		</form>
	);
}
