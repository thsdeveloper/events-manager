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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { ParticipantRow } from '../_lib/types';

interface CancelRegistrationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	participant: ParticipantRow | null;
	onSuccess?: () => void;
}

const cancelRegistrationSchema = z.object({
	reason: z
		.string()
		.min(10, 'O motivo deve ter no mínimo 10 caracteres')
		.max(500, 'O motivo deve ter no máximo 500 caracteres'),
});

type CancelRegistrationFormData = z.infer<typeof cancelRegistrationSchema>;

export function CancelRegistrationDialog({
	open,
	onOpenChange,
	participant,
	onSuccess,
}: CancelRegistrationDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<CancelRegistrationFormData>({
		resolver: zodResolver(cancelRegistrationSchema),
	});

	const handleClose = () => {
		reset();
		onOpenChange(false);
	};

	const onSubmit = async (data: CancelRegistrationFormData) => {
		if (!participant) {
			toast({
				title: 'Erro',
				description: 'Não foi possível processar a solicitação',
				variant: 'destructive',
			});

			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch(`/api/admin/participantes/${participant.id}/cancel`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(data),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.detail || 'Erro ao cancelar inscrição');
			}

			toast({
				title: 'Inscrição cancelada',
				description: 'A inscrição foi cancelada com sucesso',
				variant: 'success',
			});

			handleClose();
			onSuccess?.();
		} catch (error) {
			toast({
				title: 'Erro ao cancelar',
				description: error instanceof Error ? error.message : 'Ocorreu um erro ao cancelar a inscrição',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!participant) return null;

	const canCancel = participant.status === 'confirmed' || participant.status === 'pending';

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
							<AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
						</div>
						<div>
							<DialogTitle>Cancelar Inscrição</DialogTitle>
							<DialogDescription>Esta ação não pode ser desfeita</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				{!canCancel ? (
					<Alert className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
						<p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
							Esta inscrição não pode ser cancelada
						</p>
						<p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
							Apenas inscrições com status "Confirmada" ou "Pendente" podem ser canceladas.
						</p>
					</Alert>
				) : (
					<>
						<div className="space-y-4">
							<div className="rounded-lg border border-border bg-muted/40 p-4  ">
								<h4 className="mb-3 text-sm font-semibold text-foreground ">Detalhes da Inscrição</h4>
								<dl className="space-y-2 text-sm">
									<div className="flex justify-between">
										<dt className="text-muted-foreground ">Participante:</dt>
										<dd className="font-medium text-foreground ">{participant.participant_name}</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-muted-foreground ">Email:</dt>
										<dd className="font-medium text-foreground ">{participant.participant_email}</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-muted-foreground ">Evento:</dt>
										<dd className="font-medium text-foreground ">{participant.event_id.title}</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-muted-foreground ">Ingresso:</dt>
										<dd className="font-medium text-foreground ">{participant.ticket_type_id?.title || 'N/A'}</dd>
									</div>
									{participant.payment_amount && (
										<div className="flex justify-between border-t border-border pt-2 ">
											<dt className="text-muted-foreground ">Valor:</dt>
											<dd className="font-medium text-foreground ">
												{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
													participant.payment_amount / 100,
												)}
											</dd>
										</div>
									)}
								</dl>
							</div>

							<Alert className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
								<p className="text-sm font-medium text-red-900 dark:text-red-200">Atenção:</p>
								<ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-700 dark:text-red-300">
									<li>O cancelamento não gera reembolso automático</li>
									<li>O participante não poderá fazer check-in</li>
									<li>Esta ação é irreversível</li>
								</ul>
							</Alert>

							<form id="cancel-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="reason" className="text-sm font-medium">
										Motivo do cancelamento <span className="text-red-500">*</span>
									</Label>
									<Textarea
										id="reason"
										{...register('reason')}
										placeholder="Explique o motivo do cancelamento (mínimo 10 caracteres)"
										className="min-h-[100px] resize-none"
										disabled={isSubmitting}
									/>
									{errors.reason && <p className="text-sm text-red-500">{errors.reason.message}</p>}
									<p className="text-xs text-muted-foreground ">
										Este motivo ficará registrado no histórico da inscrição
									</p>
								</div>
							</form>
						</div>

						<DialogFooter>
							<Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
								Voltar
							</Button>
							<Button type="submit" form="cancel-form" variant="destructive" disabled={isSubmitting}>
								{isSubmitting ? 'Cancelando...' : 'Confirmar Cancelamento'}
							</Button>
						</DialogFooter>
					</>
				)}

				{!canCancel && (
					<DialogFooter>
						<Button variant="outline" onClick={handleClose}>
							Fechar
						</Button>
					</DialogFooter>
				)}
			</DialogContent>
		</Dialog>
	);
}
