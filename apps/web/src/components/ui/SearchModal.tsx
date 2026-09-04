'use client';

import { useEffect, useState } from 'react';
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Search } from '@/components/animate-ui/icons/search';
import { Badge } from '@/components/ui/badge';
import { DialogDescription, DialogTitle } from './dialog';
import { useRouter } from 'next/navigation';
import { toSearchResults, type SearchResponse, type SearchResult } from './search-results';

export default function SearchModal() {
	const [open, setOpen] = useState(false);
	const [results, setResults] = useState<SearchResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [searched, setSearched] = useState(false);
	const [query, setQuery] = useState('');
	const [searchError, setSearchError] = useState<string | null>(null);

	const router = useRouter();

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		};
		document.addEventListener('keydown', onKeyDown);

		return () => document.removeEventListener('keydown', onKeyDown);
	}, []);

	useEffect(() => {
		if (!open) {
			setResults([]);
			setSearched(false);
			setLoading(false);
			setQuery('');
			setSearchError(null);
		}
	}, [open]);

	useEffect(() => {
		const search = query.trim();
		if (search.length < 3) {
			setResults([]);
			setSearched(false);
			setSearchError(null);

			return undefined;
		}

		const controller = new AbortController();
		const timer = window.setTimeout(async () => {
			setLoading(true);
			setSearched(true);
			setSearchError(null);

			try {
				const response = await fetch(`/api/search?search=${encodeURIComponent(search)}`, {
					signal: controller.signal,
				});
				if (!response.ok) throw new Error('Não foi possível buscar agora.');
				const data = (await response.json()) as SearchResponse;
				setResults(toSearchResults(data));
			} catch (error) {
				if (controller.signal.aborted) return;
				setResults([]);
				setSearchError(error instanceof Error ? error.message : 'Não foi possível buscar agora.');
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		}, 300);

		return () => {
			window.clearTimeout(timer);
			controller.abort();
		};
	}, [query]);

	return (
		<div className="sm:max-w-[540px] max-w-full">
			<Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Buscar">
				<Search className="size-5" animateOnHover />
			</Button>

			<CommandDialog open={open} onOpenChange={setOpen}>
				<DialogTitle className="p-2 sr-only">Busca global</DialogTitle>
				<DialogDescription className="px-2 sr-only">Busque páginas, artigos e eventos</DialogDescription>

				<CommandInput
					placeholder="Buscar páginas, artigos e eventos"
					onValueChange={setQuery}
					className="m-2 p-4 focus:outline-none text-base leading-normal"
				/>

				<CommandList className="p-2 text-foreground max-h-[500px] overflow-auto">
					{!loading && !searched && (
						<CommandEmpty className="py-2 text-sm text-center">Digite ao menos três caracteres</CommandEmpty>
					)}
					{loading && <CommandEmpty className="py-2 text-sm text-center">Buscando...</CommandEmpty>}
					{!loading && searchError && <CommandEmpty className="py-2 text-sm text-center">{searchError}</CommandEmpty>}
					{!loading && !searchError && searched && results.length === 0 && (
						<CommandEmpty className="py-2 text-sm text-center">Nenhum resultado encontrado</CommandEmpty>
					)}
					{!loading && results.length > 0 && (
						<CommandGroup heading="Resultados" className="pt-2" forceMount>
							{results.map((result) => (
								<CommandItem
									key={result.id}
									className="flex items-start gap-4 px-2 py-3"
									onSelect={() => {
										router.push(result.link);
										setOpen(false);
									}}
								>
									<Badge variant="default">{result.type}</Badge>
									<div className="ml-2 w-full">
										<p className="font-medium text-base">{result.title}</p>
										{result.description && <p className="text-sm mt-1 line-clamp-2">{result.description}</p>}
									</div>
								</CommandItem>
							))}
						</CommandGroup>
					)}
				</CommandList>
			</CommandDialog>
		</div>
	);
}
