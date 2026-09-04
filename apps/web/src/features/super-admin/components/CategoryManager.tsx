'use client';

import { AlertTriangle, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useState } from 'react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { resolveCategoryIcon } from '@/features/categories/icons';
import { useToast } from '@/hooks/use-toast';
import { CategoryFormSheet, type EventCategoryRecord } from './CategoryFormSheet';

const CategoryRow = memo(function CategoryRow({
	category,
	onEdit,
	onDelete,
}: {
	category: EventCategoryRecord;
	onEdit: (category: EventCategoryRecord) => void;
	onDelete: (category: EventCategoryRecord) => void;
}) {
	const Icon = resolveCategoryIcon(category.icon);
	const color = category.color ?? '#6644ff';

	return (
		<li className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-violet-300">
			<div
				className="flex size-11 shrink-0 items-center justify-center rounded-lg"
				style={{ backgroundColor: `${color}1a`, color }}
			>
				<Icon className="size-5" />
			</div>

			<div className="min-w-0 flex-1">
				<p className="truncate font-semibold text-slate-950">{category.name}</p>
				<p className="truncate text-xs text-slate-500">{category.description || `/${category.slug}`}</p>
			</div>

			<span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
				{category.eventCount} {category.eventCount === 1 ? 'evento' : 'eventos'}
			</span>

			<div className="flex items-center gap-1">
				<Button variant="ghost" size="icon" onClick={() => onEdit(category)} aria-label={`Editar ${category.name}`}>
					<Pencil className="size-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => onDelete(category)}
					aria-label={`Excluir ${category.name}`}
					className="text-red-600 hover:bg-red-50 hover:text-red-700"
				>
					<Trash2 className="size-4" />
				</Button>
			</div>
		</li>
	);
});

export function CategoryManager({ initialCategories }: { initialCategories: EventCategoryRecord[] }) {
	const router = useRouter();
	const { toast } = useToast();
	const [sheetOpen, setSheetOpen] = useState(false);
	const [editing, setEditing] = useState<EventCategoryRecord | null>(null);
	const [toDelete, setToDelete] = useState<EventCategoryRecord | null>(null);
	const [deleting, setDeleting] = useState(false);

	const handleCreate = useCallback(() => {
		setEditing(null);
		setSheetOpen(true);
	}, []);

	const handleEdit = useCallback((category: EventCategoryRecord) => {
		setEditing(category);
		setSheetOpen(true);
	}, []);

	// The list is server-rendered, so a refresh is the single source of truth
	// after any mutation.
	const handleSaved = useCallback(() => {
		setEditing(null);
		router.refresh();
	}, [router]);

	const confirmDelete = useCallback(async () => {
		if (!toDelete) return;
		setDeleting(true);
		try {
			const response = await fetch(`/api/super-admin/categories/${toDelete.id}`, {
				method: 'DELETE',
				credentials: 'include',
			});
			const body = await response.json().catch(() => null);
			if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível excluir a categoria.');
			toast({ title: 'Categoria excluída', variant: 'success' });
			setToDelete(null);
			router.refresh();
		} catch (error) {
			toast({
				title: 'Erro ao excluir',
				description: error instanceof Error ? error.message : 'Tente novamente.',
				variant: 'destructive',
			});
		} finally {
			setDeleting(false);
		}
	}, [router, toDelete, toast]);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-4">
				<p className="text-sm text-slate-600">
					{initialCategories.length} {initialCategories.length === 1 ? 'categoria' : 'categorias'} disponíveis para os
					organizadores.
				</p>
				<Button onClick={handleCreate}>
					<Plus className="mr-2 size-4" />
					Nova categoria
				</Button>
			</div>

			{initialCategories.length === 0 ? (
				<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-slate-50 px-6 py-12 text-center">
					<div className="flex size-12 items-center justify-center rounded-full bg-violet-100 text-violet-700">
						<Tags className="size-6" />
					</div>
					<div>
						<p className="font-medium text-slate-950">Nenhuma categoria cadastrada</p>
						<p className="mt-1 text-sm text-slate-500">
							Sem categorias, os organizadores não conseguem concluir a etapa &ldquo;Básico&rdquo; do cadastro.
						</p>
					</div>
					<Button onClick={handleCreate}>
						<Plus className="mr-2 size-4" />
						Cadastrar a primeira
					</Button>
				</div>
			) : (
				<ul className="space-y-2">
					{initialCategories.map(category => (
						<CategoryRow key={category.id} category={category} onEdit={handleEdit} onDelete={setToDelete} />
					))}
				</ul>
			)}

			<CategoryFormSheet open={sheetOpen} onOpenChange={setSheetOpen} category={editing} onSaved={handleSaved} />

			<AlertDialog open={Boolean(toDelete)} onOpenChange={open => !open && setToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir &ldquo;{toDelete?.name}&rdquo;?</AlertDialogTitle>
						<AlertDialogDescription>
							{toDelete && toDelete.eventCount > 0 ? (
								<span className="flex items-start gap-2 text-amber-700">
									<AlertTriangle className="mt-0.5 size-4 shrink-0" />
									{toDelete.eventCount} {toDelete.eventCount === 1 ? 'evento usa' : 'eventos usam'} esta categoria.
									Eles não serão excluídos, mas ficarão sem categoria.
								</span>
							) : (
								'A categoria deixará de aparecer no cadastro de eventos.'
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDelete} loading={deleting}>
							Excluir
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
