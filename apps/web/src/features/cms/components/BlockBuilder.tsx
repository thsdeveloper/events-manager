'use client';

import type { CmsBlockCollection } from '@events-manager/contracts';
import { ArrowDown, ArrowUp, Eye, EyeOff, Moon, Pencil, Plus, Sun, Trash2 } from 'lucide-react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { revalidateCmsContent } from '../api/actions';
import { cmsRequest, describeError } from '../api/client';
import { BLOCK_TYPES, blockSummary, blockTypeMeta } from '../lib/blocks';
import type { CmsBlockRow } from '../types';
import { BlockFormSheet } from './BlockFormSheet';

interface BlockBuilderProps {
	pageId: string;
	blocks: CmsBlockRow[];
}

type SheetState = { collection: CmsBlockCollection; block: CmsBlockRow | null } | null;

export function BlockBuilder({ pageId, blocks }: BlockBuilderProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [pickerOpen, setPickerOpen] = useState(false);
	const [sheet, setSheet] = useState<SheetState>(null);
	const [toDelete, setToDelete] = useState<CmsBlockRow | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);

	async function afterMutation(message?: string) {
		await revalidateCmsContent();
		if (message) toast({ title: message, variant: 'success' });
		router.refresh();
	}

	async function run(id: string, action: () => Promise<unknown>, message?: string) {
		setBusyId(id);
		try {
			await action();
			await afterMutation(message);
		} catch (failure) {
			toast({
				title: 'Não foi possível atualizar o bloco',
				description: describeError(failure),
				variant: 'destructive',
			});
		} finally {
			setBusyId(null);
		}
	}

	function move(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= blocks.length) return;
		const order = blocks.map((block) => block.id);
		[order[index], order[target]] = [order[target], order[index]];
		void run(blocks[index].id, () => cmsRequest(`/pages/${pageId}/blocks/order`, { method: 'PUT', body: { order } }));
	}

	function patch(block: CmsBlockRow, body: { hide_block?: boolean; background?: 'light' | 'dark' }) {
		void run(block.id, () => cmsRequest(`/pages/${pageId}/blocks/${block.id}`, { method: 'PATCH', body }));
	}

	async function confirmDelete() {
		if (!toDelete) return;
		const block = toDelete;
		await run(
			block.id,
			() => cmsRequest(`/pages/${pageId}/blocks/${block.id}`, { method: 'DELETE' }),
			'Bloco excluído',
		);
		setToDelete(null);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-4">
				<p className="text-sm text-slate-600">
					{blocks.length === 0
						? 'A página ainda não tem blocos.'
						: `${blocks.length} ${blocks.length === 1 ? 'bloco' : 'blocos'} na ordem em que aparecem no site.`}
				</p>
				<Button onClick={() => setPickerOpen(true)}>
					<Plus className="mr-2 size-4" />
					Adicionar bloco
				</Button>
			</div>

			{blocks.length === 0 ? (
				<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-slate-50 px-6 py-12 text-center">
					<p className="font-medium text-slate-950">Comece adicionando um bloco</p>
					<p className="text-sm text-slate-500">Hero, texto, galeria, planos, posts, eventos ou formulário.</p>
				</div>
			) : (
				<ol className="space-y-2">
					{blocks.map((block, index) => {
						const meta = blockTypeMeta(block.collection);
						const Icon = meta.icon;
						const busy = busyId === block.id;

						return (
							<li
								key={block.id}
								className={cn(
									'flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-violet-300',
									block.hide_block && 'opacity-60',
									busy && 'pointer-events-none opacity-50',
								)}
							>
								<div className="flex flex-col">
									<Button
										size="icon"
										variant="ghost"
										className="size-7"
										disabled={index === 0}
										onClick={() => move(index, -1)}
										aria-label={`Mover ${meta.label} para cima`}
									>
										<ArrowUp className="size-4" />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										className="size-7"
										disabled={index === blocks.length - 1}
										onClick={() => move(index, 1)}
										aria-label={`Mover ${meta.label} para baixo`}
									>
										<ArrowDown className="size-4" />
									</Button>
								</div>
								<div
									className={cn(
										'flex size-10 shrink-0 items-center justify-center rounded-lg',
										block.background === 'dark' ? 'bg-slate-900 text-white' : 'bg-violet-50 text-violet-700',
									)}
								>
									<Icon className="size-5" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
										{index + 1}. {meta.label}
										{block.hide_block && <span className="ml-2 normal-case text-amber-600">oculto</span>}
									</p>
									<p className="truncate font-medium text-slate-950">{blockSummary(block)}</p>
								</div>
								<div className="flex items-center gap-1">
									<Button
										size="icon"
										variant="ghost"
										onClick={() => patch(block, { background: block.background === 'dark' ? 'light' : 'dark' })}
										aria-label={
											block.background === 'dark'
												? `Usar fundo claro em ${meta.label}`
												: `Usar fundo escuro em ${meta.label}`
										}
										title={block.background === 'dark' ? 'Fundo escuro' : 'Fundo claro'}
									>
										{block.background === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
									</Button>
									<Button
										size="icon"
										variant="ghost"
										onClick={() => patch(block, { hide_block: !block.hide_block })}
										aria-label={block.hide_block ? `Mostrar ${meta.label}` : `Ocultar ${meta.label}`}
									>
										{block.hide_block ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
									</Button>
									<Button
										size="icon"
										variant="ghost"
										onClick={() => setSheet({ collection: block.collection, block })}
										aria-label={`Editar ${meta.label}`}
									>
										<Pencil className="size-4" />
									</Button>
									<Button
										size="icon"
										variant="ghost"
										onClick={() => setToDelete(block)}
										aria-label={`Excluir ${meta.label}`}
										className="text-red-600 hover:bg-red-50 hover:text-red-700"
									>
										<Trash2 className="size-4" />
									</Button>
								</div>
							</li>
						);
					})}
				</ol>
			)}

			<Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Escolha o tipo de bloco</DialogTitle>
						<DialogDescription>O bloco é adicionado ao final da página; depois você pode reordenar.</DialogDescription>
					</DialogHeader>
					<ul className="grid gap-2 sm:grid-cols-2" aria-label="Tipos de bloco">
						{BLOCK_TYPES.map((type) => {
							const Icon = type.icon;

							return (
								<li key={type.collection}>
									<button
										type="button"
										onClick={() => {
											setPickerOpen(false);
											setSheet({ collection: type.collection, block: null });
										}}
										className="flex w-full items-start gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:border-violet-400 hover:bg-violet-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
									>
										<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
											<Icon className="size-4" />
										</span>
										<span>
											<span className="block font-medium text-slate-950">{type.label}</span>
											<span className="block text-xs text-slate-500">{type.description}</span>
										</span>
									</button>
								</li>
							);
						})}
					</ul>
				</DialogContent>
			</Dialog>

			{sheet && (
				<BlockFormSheet
					open
					onOpenChange={(open) => !open && setSheet(null)}
					pageId={pageId}
					collection={sheet.collection}
					block={sheet.block}
					onSaved={() => void afterMutation(sheet.block ? 'Bloco atualizado' : 'Bloco adicionado')}
				/>
			)}

			<AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir este bloco?</AlertDialogTitle>
						<AlertDialogDescription>
							{toDelete &&
								`O bloco "${blockSummary(toDelete)}" (${blockTypeMeta(toDelete.collection).label}) sai da página imediatamente.`}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
