'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useState } from 'react';
import type { ParticipantRow } from '../_lib/types';

interface CheckInDialogProps {
	participant: ParticipantRow | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

export function CheckInDialog({ participant, open, onOpenChange, onSuccess }: CheckInDialogProps) {
	const [isLoading, setIsLoading] = useState(false);
	const { toast } = useToast();

	const hasCheckedIn = !!participant?.check_in_date;
	const isCancelled = participant?.status === 'cancelled';

	const handleCheckIn = async () => {
		if (!participant) return;

		setIsLoading(true);
		try {
			const response = await fetch(`/api/admin/participantes/${participant.id}/checkin`, {
				method: 'POST',
				credentials: 'include',
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.detail || 'Erro ao realizar check-in');
			}

			toast({
				title: 'Check-in realizado! ✓',
				description: `${participant.participant_name} confirmou presença no evento`,
				variant: 'success',
			});

			onOpenChange(false);
			onSuccess?.();
		} catch (error) {
			toast({
				title: 'Não foi possível realizar check-in',
				description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleUndoCheckIn = async () => {
		if (!participant) return;

		setIsLoading(true);
		try {
			const response = await fetch(`/api/admin/participantes/${participant.id}/checkin`, {
				method: 'DELETE',
				credentials: 'include',
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.detail || 'Erro ao desfazer check-in');
			}

			toast({
				title: 'Check-in desfeito',
				description: `${participant.participant_name} voltou para status confirmado`,
				variant: 'warning',
			});

			onOpenChange(false);
			onSuccess?.();
		} catch (error) {
			toast({
				title: 'Não foi possível desfazer check-in',
				description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	if (!participant) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						{hasCheckedIn ? (
							<>
								<X className="size-5 text-amber-600" />
								Desfazer Check-in
							</>
						) : (
							<>
								<CheckCircle className="size-5 text-emerald-600" />
								Confirmar Check-in
							</>
						)}
					</DialogTitle>
					<DialogDescription>
						{hasCheckedIn
							? 'Deseja desfazer o check-in deste participante?'
							: 'Confirme a presença do participante no evento'}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Participant Info */}
					<div className="rounded-lg border border-border bg-muted/40 p-4  ">
						<div className="space-y-2">
							<div>
								<p className="text-sm font-medium text-muted-foreground ">Participante</p>
								<p className="text-base font-semibold text-foreground ">{participant.participant_name}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground ">Email</p>
								<p className="text-sm text-foreground ">{participant.participant_email}</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground ">Código</p>
								<p className="font-mono text-sm text-foreground ">{participant.ticket_code}</p>
							</div>
						</div>
					</div>

					{/* Warnings */}
					{isCancelled && (
						<div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-900/20">
							<AlertTriangle className="size-5 shrink-0 text-rose-600 dark:text-rose-400" />
							<div>
								<p className="font-medium text-rose-900 dark:text-rose-200">Inscrição cancelada</p>
								<p className="text-sm text-rose-700 dark:text-rose-300">
									Não é possível realizar check-in de uma inscrição cancelada
								</p>
							</div>
						</div>
					)}

					{hasCheckedIn && !isCancelled && (
						<Alert className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
							<AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
							<div>
								<p className="font-medium text-amber-900 dark:text-amber-200">Check-in já realizado</p>
								<p className="text-sm text-amber-700 dark:text-amber-300">
									Realizado em{' '}
									{new Date(participant.check_in_date!).toLocaleString('pt-BR', {
										dateStyle: 'short',
										timeStyle: 'short',
									})}
								</p>
							</div>
						</Alert>
					)}
				</div>

				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
						Cancelar
					</Button>
					{hasCheckedIn ? (
						<Button variant="destructive" onClick={handleUndoCheckIn} loading={isLoading} className="gap-2">
							<X className="size-4" />
							Desfazer Check-in
						</Button>
					) : (
						<Button
							onClick={handleCheckIn}
							loading={isLoading}
							disabled={isCancelled}
							className="gap-2 bg-emerald-600 hover:bg-emerald-700"
						>
							<CheckCircle className="size-4" />
							Confirmar Check-in
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
