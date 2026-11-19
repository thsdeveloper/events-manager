'use client';
import { PlatformCan } from '@/features/platform-access/PlatformPermissions';

import { Card } from '@/components/ui/card';
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
		<Card className="flex flex-wrap items-center justify-between gap-3 p-4">
			<p className="text-xs text-muted-foreground">
				{isProtected
					? 'Menus do sistema (principal e rodapé) não podem ser excluídos.'
					: 'Excluir o menu remove todos os seus itens.'}
			</p>
			<PlatformCan permission="platform_navigation.update">
				<Button variant="destructive" disabled={isProtected} onClick={() => setOpen(true)}>
					<Trash2 className="mr-2 size-4" />
					Excluir menu
				</Button>
			</PlatformCan>
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
		</Card>
	);
}
