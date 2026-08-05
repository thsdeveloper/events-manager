'use client';

import { useState } from 'react';
import { Trash2, Users, AlertTriangle } from 'lucide-react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { httpClient } from '@/lib/http-client';
import { toastSuccess } from '@/lib/toast-helpers';

interface DeleteEventDialogProps {
	eventId: string;
	eventTitle: string;
	participantsCount: number;
	onSuccess?: () => void;
}

export function DeleteEventDialog({ eventId, eventTitle, participantsCount, onSuccess }: DeleteEventDialogProps) {
	const [open, setOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const hasParticipants = participantsCount > 0;

	const handleDelete = async () => {
		setIsDeleting(true);

		try {
			await httpClient.delete(`/api/events/${eventId}`);

			toastSuccess({
				title: 'Evento excluído',
				description: `O evento "${eventTitle}" foi excluído com sucesso.`,
			});

			setOpen(false);

			if (onSuccess) {
				onSuccess();
			}
		} catch (error) {
			// O erro já é tratado pelo httpClient com toast automático
			console.error('Erro ao excluir evento:', error);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>
				<DropdownMenuItem
					className="text-destructive focus:text-destructive"
					onSelect={(e) => {
						e.preventDefault();
						setOpen(true);
					}}
				>
					<Trash2 className="mr-2 size-4" />
					Excluir
				</DropdownMenuItem>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{hasParticipants ? 'Não é possível excluir este evento' : 'Tem certeza que deseja excluir este evento?'}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{hasParticipants ? (
							<>
								O evento <strong>&quot;{eventTitle}&quot;</strong> não pode ser excluído porque possui{' '}
								<strong>{participantsCount}</strong> participante(s) registrado(s).
							</>
						) : (
							<>
								Esta ação não pode ser desfeita. O evento <strong>&quot;{eventTitle}&quot;</strong> será
								permanentemente removido do sistema.
							</>
						)}
					</AlertDialogDescription>
				</AlertDialogHeader>

				{hasParticipants && (
					<Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
						<AlertTriangle className="size-4 text-amber-600" />
						<AlertDescription className="text-amber-800 dark:text-amber-200">
							<strong>Ação necessária:</strong> Cancele todas as inscrições antes de excluir o evento. Você pode
							gerenciar as inscrições na página de participantes do evento.
						</AlertDescription>
					</Alert>
				)}

				{!hasParticipants && participantsCount === 0 && (
					<Alert className="border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
						<Users className="size-4 text-emerald-600" />
						<AlertDescription className="text-emerald-800 dark:text-emerald-200">
							Este evento não possui participantes registrados e pode ser excluído com segurança.
						</AlertDescription>
					</Alert>
				)}

				<AlertDialogFooter>
					<AlertDialogCancel disabled={isDeleting}>
						{hasParticipants ? 'Fechar' : 'Cancelar'}
					</AlertDialogCancel>
					{!hasParticipants && (
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								handleDelete();
							}}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? 'Excluindo...' : 'Excluir evento'}
						</AlertDialogAction>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
