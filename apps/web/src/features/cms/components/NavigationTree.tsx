'use client';

import {
	ArrowDown,
	ArrowUp,
	CornerDownRight,
	ExternalLink,
	FileText,
	Folder,
	Newspaper,
	Pencil,
	Plus,
	Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { revalidateCmsContent } from '../api/actions';
import { cmsRequest, describeError } from '../api/client';
import type { CmsNavigationDetail, CmsNavigationItemNode } from '../types';
import { NavigationItemDialog } from './NavigationItemDialog';

type DialogState = { item: CmsNavigationItemNode | null; parent: { id: string; title: string } | null } | null;

const TYPE_ICONS = { page: FileText, post: Newspaper, url: ExternalLink, group: Folder } as const;

function itemTarget(item: CmsNavigationItemNode) {
	if (item.type === 'page') return item.page?.permalink ?? 'página removida';
	if (item.type === 'post') return item.post ? `/blog/${item.post.slug}` : 'post removido';
	if (item.type === 'url') return item.url ?? '';

	return 'grupo';
}

export function NavigationTree({ navigation }: { navigation: CmsNavigationDetail }) {
	const router = useRouter();
	const { toast } = useToast();
	const [dialog, setDialog] = useState<DialogState>(null);
	const [toDelete, setToDelete] = useState<CmsNavigationItemNode | null>(null);
	const [busy, setBusy] = useState(false);

	async function afterMutation(message?: string) {
		await revalidateCmsContent();
		if (message) toast({ title: message, variant: 'success' });
		router.refresh();
	}

	async function run(action: () => Promise<unknown>, message?: string) {
		setBusy(true);
		try {
			await action();
			await afterMutation(message);
		} catch (failure) {
			toast({
				title: 'Não foi possível atualizar o menu',
				description: describeError(failure),
				variant: 'destructive',
			});
		} finally {
			setBusy(false);
		}
	}

	function move(siblings: CmsNavigationItemNode[], parent: string | null, index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= siblings.length) return;
		const order = siblings.map((item) => item.id);
		[order[index], order[target]] = [order[target], order[index]];
		void run(() => cmsRequest(`/navigation/${navigation.id}/items/order`, { method: 'PUT', body: { parent, order } }));
	}

	function toggleActive(active: boolean) {
		void run(
			() =>
				cmsRequest(`/navigation/${navigation.id}`, {
					method: 'PATCH',
					body: { title: navigation.title, is_active: active },
				}),
			active ? 'Menu ativado' : 'Menu desativado',
		);
	}

	async function confirmDelete() {
		if (!toDelete) return;
		const item = toDelete;
		await run(() => cmsRequest(`/navigation/${navigation.id}/items/${item.id}`, { method: 'DELETE' }), 'Item removido');
		setToDelete(null);
	}

	function renderItem(
		item: CmsNavigationItemNode,
		siblings: CmsNavigationItemNode[],
		index: number,
		parent: CmsNavigationItemNode | null,
	) {
		const Icon = TYPE_ICONS[item.type];

		return (
			<li key={item.id} className="space-y-2">
				<div
					className={cn(
						'flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm',
						parent && 'ml-8',
						busy && 'pointer-events-none opacity-60',
					)}
				>
					{parent && <CornerDownRight className="size-4 text-slate-400" />}
					<div className="flex flex-col">
						<Button
							size="icon"
							variant="ghost"
							className="size-7"
							disabled={index === 0}
							onClick={() => move(siblings, parent?.id ?? null, index, -1)}
							aria-label={`Mover ${item.title} para cima`}
						>
							<ArrowUp className="size-4" />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							className="size-7"
							disabled={index === siblings.length - 1}
							onClick={() => move(siblings, parent?.id ?? null, index, 1)}
							aria-label={`Mover ${item.title} para baixo`}
						>
							<ArrowDown className="size-4" />
						</Button>
					</div>
					<span className="flex size-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
						<Icon className="size-4" />
					</span>
					<div className="min-w-0 flex-1">
						<p className="font-medium text-slate-950">{item.title}</p>
						<p className="truncate text-xs text-slate-500">{itemTarget(item)}</p>
					</div>
					<div className="flex items-center gap-1">
						{!parent && (
							<Button
								size="sm"
								variant="ghost"
								onClick={() => setDialog({ item: null, parent: { id: item.id, title: item.title } })}
								aria-label={`Adicionar subitem em ${item.title}`}
							>
								<Plus className="mr-1 size-4" />
								Subitem
							</Button>
						)}
						<Button
							size="icon"
							variant="ghost"
							onClick={() => setDialog({ item, parent: parent ? { id: parent.id, title: parent.title } : null })}
							aria-label={`Editar ${item.title}`}
						>
							<Pencil className="size-4" />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							onClick={() => setToDelete(item)}
							aria-label={`Excluir ${item.title}`}
							className="text-red-600 hover:bg-red-50 hover:text-red-700"
						>
							<Trash2 className="size-4" />
						</Button>
					</div>
				</div>
				{item.children.length > 0 && (
					<ul className="space-y-2">
						{item.children.map((child, childIndex) => renderItem(child, item.children, childIndex, item))}
					</ul>
				)}
			</li>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
				<label className="flex items-center gap-3 text-sm">
					<Switch
						checked={navigation.is_active}
						onCheckedChange={toggleActive}
						aria-label="Menu ativo"
						disabled={busy}
					/>
					<span>
						<span className="font-medium text-slate-950">
							{navigation.is_active ? 'Menu ativo' : 'Menu desativado'}
						</span>
						<span className="block text-xs text-slate-500">Um menu desativado não aparece no site.</span>
					</span>
				</label>
				<Button onClick={() => setDialog({ item: null, parent: null })}>
					<Plus className="mr-2 size-4" />
					Adicionar item
				</Button>
			</div>

			{navigation.items.length === 0 ? (
				<p className="rounded-lg border border-dashed bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
					Este menu ainda não tem itens.
				</p>
			) : (
				<ul className="space-y-2">
					{navigation.items.map((item, index) => renderItem(item, navigation.items, index, null))}
				</ul>
			)}

			{dialog && (
				<NavigationItemDialog
					open
					onOpenChange={(open) => !open && setDialog(null)}
					navigationId={navigation.id}
					item={dialog.item}
					parent={dialog.parent}
					onSaved={() => void afterMutation(dialog.item ? 'Item atualizado' : 'Item adicionado')}
				/>
			)}

			<AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remover &ldquo;{toDelete?.title}&rdquo; do menu?</AlertDialogTitle>
						<AlertDialogDescription>
							{toDelete && toDelete.children.length > 0
								? `Os ${toDelete.children.length} subitens também são removidos.`
								: 'O item some do menu imediatamente.'}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDelete}>Remover</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
