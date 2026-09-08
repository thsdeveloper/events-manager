'use client';

import type { CmsContentStatus } from '@events-manager/contracts';
import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';
import { STATUS_OPTIONS } from '../lib/status';

const ALL = '__all__';

/**
 * Busca + filtro de status que escrevem na URL: a listagem é renderizada no
 * servidor, então a query string é a fonte da verdade.
 */
export function ListToolbar({
	withStatus = true,
	placeholder = 'Buscar pelo título',
}: {
	withStatus?: boolean;
	placeholder?: string;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();
	const id = useId();
	const [search, setSearch] = useState(params.get('search') ?? '');
	const debounced = useDebounce(search, 300);
	const status = params.get('status') ?? ALL;

	function navigate(next: Record<string, string | null>) {
		const query = new URLSearchParams(params.toString());
		for (const [key, value] of Object.entries(next)) {
			if (value && value !== ALL) query.set(key, value);
			else query.delete(key);
		}
		query.delete('page');
		const suffix = query.toString();
		router.push(suffix ? `${pathname}?${suffix}` : pathname);
	}

	useEffect(() => {
		if ((params.get('search') ?? '') !== debounced) navigate({ search: debounced || null });
	}, [debounced]);

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
			<div className="relative flex-1">
				<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
				<label htmlFor={`${id}-search`} className="sr-only">
					Buscar
				</label>
				<Input
					id={`${id}-search`}
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder={placeholder}
					className="bg-white pl-9"
				/>
			</div>
			{withStatus && (
				<div className="w-full sm:w-48">
					<label htmlFor={`${id}-status`} className="sr-only">
						Filtrar por status
					</label>
					<Select
						value={status}
						onValueChange={(value) => navigate({ status: value as CmsContentStatus | typeof ALL })}
					>
						<SelectTrigger id={`${id}-status`} className="bg-white">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ALL}>Todos os status</SelectItem>
							{STATUS_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}
		</div>
	);
}
