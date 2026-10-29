'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface ItemListEditorProps<Item extends { id: string }> {
	items: Item[];
	onChange: (items: Item[]) => void;
	create: () => Item;
	/** Nome de um item na lista, para os rótulos de acessibilidade. */
	label: (item: Item, index: number) => string;
	addLabel: string;
	max?: number;
	children: (item: Item, update: (patch: Partial<Item>) => void, index: number) => ReactNode;
}

/**
 * Lista de itens de uma seção (programação, palestrantes, perguntas...). Os
 * botões de subir e descer bastam aqui: são listas curtas dentro de um painel
 * lateral, e o arrastar fica para a ordem das seções.
 */
export function ItemListEditor<Item extends { id: string }>({
	items,
	onChange,
	create,
	label,
	addLabel,
	max,
	children,
}: ItemListEditorProps<Item>) {
	const move = (index: number, direction: -1 | 1) => {
		const target = index + direction;
		if (target < 0 || target >= items.length) return;
		const next = [...items];
		[next[index], next[target]] = [next[target], next[index]];
		onChange(next);
	};

	return (
		<div className="space-y-3">
			{items.length === 0 ? (
				<p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
					Nenhum item ainda.
				</p>
			) : (
				<ol className="space-y-3">
					{items.map((item, index) => {
						const name = label(item, index);

						return (
							<li key={item.id} className="rounded-lg border bg-muted/30 p-3">
								<div className="mb-2 flex items-center justify-between gap-2">
									<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										{index + 1}. {name}
									</span>
									<span className="flex items-center gap-1">
										<Button
											type="button"
											size="icon"
											variant="ghost"
											className="size-7"
											disabled={index === 0}
											onClick={() => move(index, -1)}
											aria-label={`Mover ${name} para cima`}
										>
											<ArrowUp className="size-4" />
										</Button>
										<Button
											type="button"
											size="icon"
											variant="ghost"
											className="size-7"
											disabled={index === items.length - 1}
											onClick={() => move(index, 1)}
											aria-label={`Mover ${name} para baixo`}
										>
											<ArrowDown className="size-4" />
										</Button>
										<Button
											type="button"
											size="icon"
											variant="ghost"
											className="size-7 text-destructive hover:text-destructive"
											onClick={() => onChange(items.filter((candidate) => candidate.id !== item.id))}
											aria-label={`Remover ${name}`}
										>
											<Trash2 className="size-4" />
										</Button>
									</span>
								</div>
								<div className="grid gap-3">
									{children(
										item,
										(patch) =>
											onChange(
												items.map((candidate) => (candidate.id === item.id ? { ...candidate, ...patch } : candidate)),
											),
										index,
									)}
								</div>
							</li>
						);
					})}
				</ol>
			)}
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="w-full border-dashed"
				disabled={max !== undefined && items.length >= max}
				onClick={() => onChange([...items, create()])}
			>
				<Plus className="mr-2 size-4" />
				{addLabel}
			</Button>
		</div>
	);
}
