'use client';

import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { CheckCircle, X, AlertTriangle } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { ParticipantRow } from '../_lib/types';
import { getParticipantFullName } from '../_lib/utils';

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
	const isCancelled = participant?.registration.status === 'cancelled';
	// Ingresso nominal sem pessoa: não há quem confirmar na porta.
	const isUnnamed = !participant?.attendee_name;

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
				description: `${getParticipantFullName(participant)} confirmou presença no evento`,
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
				description: `${getParticipantFullName(participant)} voltou para status confirmado`,
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
								<X className="size-5 text-muted-foreground" />
								Desfazer Check-in
							</>
						) : (
							<>
								<CheckCircle className="size-5 text-muted-foreground" />
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
					<Card className="p-4">
						<div className="space-y-2">
							<div>
								<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Participante</p>
								<p className="text-base font-semibold text-foreground">{getParticipantFullName(participant)}</p>
							</div>
							{participant.attendee_email && (
								<div>
									<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Email</p>
									<p className="text-sm text-foreground">{participant.attendee_email}</p>
								</div>
							)}
							<div>
								<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Ingresso</p>
								<p className="text-sm text-foreground">
									{participant.ticket_type?.title ?? 'Ingresso'} · {participant.sequence} de{' '}
									{participant.registration.quantity}
								</p>
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Código</p>
								<p className="font-mono text-sm text-foreground">{participant.ticket_code}</p>
							</div>
						</div>
					</Card>

					{/* Warnings */}
					{isUnnamed && !isCancelled && (
						<Card className="flex items-start gap-3 p-4">
							<AlertTriangle className="size-5 shrink-0 text-muted-foreground " />
							<div>
								<p className="font-medium text-muted-foreground ">Sem participante</p>
								<p className="text-sm text-muted-foreground ">
									Informe o participante antes do check-in: ingressos são nominais.
								</p>
							</div>
						</Card>
					)}

					{isCancelled && (
						<Card className="flex items-start gap-3 p-4">
							<AlertTriangle className="size-5 shrink-0 text-destructive " />
							<div>
								<p className="font-medium text-destructive ">Pedido cancelado</p>
								<p className="text-sm text-destructive ">
									Não é possível realizar check-in de um ingresso de pedido cancelado
								</p>
							</div>
						</Card>
					)}

					{hasCheckedIn && !isCancelled && (
						<Card className="flex items-start gap-3 p-4">
							<AlertTriangle className="size-5 shrink-0 text-muted-foreground " />
							<div>
								<p className="font-medium text-muted-foreground ">Check-in já realizado</p>
								<p className="text-sm text-muted-foreground ">
									Realizado em{' '}
									{new Date(participant.check_in_date!).toLocaleString('pt-BR', {
										dateStyle: 'short',
										timeStyle: 'short',
									})}
								</p>
							</div>
						</Card>
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
							variant="default"
							onClick={handleCheckIn}
							loading={isLoading}
							disabled={isCancelled || isUnnamed}
							className="gap-2"
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
