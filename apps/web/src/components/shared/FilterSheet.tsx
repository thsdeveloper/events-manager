'use client';

import { useId, useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet';

export interface FilterSheetProps<T> {
	values: T;
	defaultValues: T;
	onApply: (values: T) => void;
	title?: string;
	description?: string;
	activeCount?: number;
	validate?: (values: T) => string | undefined;
	children: (draft: T, setDraft: (values: T) => void) => ReactNode;
}

/** Shared interaction only: the screen owns its fields, defaults and data fetching. */
export function FilterSheet<T>({
	values,
	defaultValues,
	onApply,
	title = 'Filtros',
	description = 'Escolha os critérios e aplique para atualizar os resultados.',
	activeCount = 0,
	validate,
	children,
}: FilterSheetProps<T>) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState(values);
	const [error, setError] = useState<string>();
	const formId = useId();
	function changeOpen(next: boolean) {
		if (next) {
			setDraft(values);
			setError(undefined);
		}
		setOpen(next);
	}
	function updateDraft(next: T) {
		setDraft(next);
		setError(undefined);
	}

	return (
		<Sheet open={open} onOpenChange={changeOpen}>
			<SheetTrigger asChild>
				<Button type="button" variant="outline">
					<SlidersHorizontal className="mr-2 size-4" aria-hidden="true" />
					Filtros
					{activeCount > 0 && (
						<Badge variant="secondary" className="ml-2" aria-label={`${activeCount} filtros ativos`}>
							{activeCount}
						</Badge>
					)}
				</Button>
			</SheetTrigger>
			<SheetContent className="flex h-dvh w-full flex-col gap-0 p-0 sm:max-w-md">
				<SheetHeader className="border-b px-6 py-5 pr-12 text-left">
					<SheetTitle>{title}</SheetTitle>
					<SheetDescription>{description}</SheetDescription>
				</SheetHeader>
				<form
					id={formId}
					className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6"
					onSubmit={(event) => {
						event.preventDefault();
						const problem = validate?.(draft);
						if (problem) {
							setError(problem);

							return;
						}
						onApply(draft);
						setOpen(false);
					}}
				>
					{open && children(draft, updateDraft)}
					{error && (
						<p role="alert" className="text-sm text-destructive">
							{error}
						</p>
					)}
				</form>
				<SheetFooter className="gap-2 border-t p-6">
					<Button type="button" variant="ghost" onClick={() => updateDraft(defaultValues)}>
						Limpar filtros
					</Button>
					<SheetClose asChild>
						<Button type="button" variant="outline">
							Cancelar
						</Button>
					</SheetClose>
					<Button type="submit" form={formId}>
						Aplicar filtros
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
