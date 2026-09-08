'use client';

import { Trash2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { revalidateCmsContent } from '../api/actions';
import { cmsRequest, describeError } from '../api/client';
import { PROTECTED_NAVIGATIONS } from './NavigationsList';

export function NavigationDangerZone({ navigationId, title }: { navigationId: string; title: string }) {
	const router = useRouter();
	const { toast } = useToast();
	const [open, setOpen] = useState(false);
	const isProtected = Boolean(PROTECTED_NAVIGATIONS[navigationId]);

	async function remove() {
		try {
			await cmsRequest(`/navigation/${navigationId}`, { method: 'DELETE' });
			await revalidateCmsContent();
			toast({ title: 'Menu excluído', variant: 'success' });
			router.push('/super-admin/conteudo/menus');
			router.refresh();
		} catch (failure) {
			toast({ title: 'Não foi possível excluir', description: describeError(failure), variant: 'destructive' });
		} finally {
			setOpen(false);
		}
	}

	return (
		<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
			<p className="text-xs text-slate-500">
				{isProtected
					? 'Menus do sistema (principal e rodapé) não podem ser excluídos.'
					: 'Excluir o menu remove todos os seus itens.'}
			</p>
			<Button
				variant="outline"
				className="text-red-600 hover:text-red-700"
				disabled={isProtected}
				onClick={() => setOpen(true)}
			>
				<Trash2 className="mr-2 size-4" />
				Excluir menu
			</Button>
			<AlertDialog open={open} onOpenChange={setOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir &ldquo;{title}&rdquo;?</AlertDialogTitle>
						<AlertDialogDescription>Todos os itens deste menu são apagados.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
