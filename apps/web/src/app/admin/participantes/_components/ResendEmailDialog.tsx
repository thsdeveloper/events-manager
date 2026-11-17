'use client';

import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { Mail, AlertTriangle } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import type { ParticipantRow } from '../_lib/types';

interface ResendEmailDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	participant: ParticipantRow | null;
	onSuccess?: () => void;
}

/**
 * Reenvio por ingresso. O que sai depende de quem é o ingresso: o recibo da
 * compra, com todos os ingressos do pedido, vai para quem comprou; o ingresso
 * nominal vai para o participante. Sem participante não há para quem enviar.
 */
export function ResendEmailDialog({ open, onOpenChange, participant, onSuccess }: ResendEmailDialogProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleClose = () => {
		onOpenChange(false);
	};

	const handleResend = async () => {
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
			const response = await fetch(`/api/admin/participantes/${participant.id}/resend-email`, {
				method: 'POST',
				credentials: 'include',
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.detail || 'Erro ao reenviar email');
			}

			toast({
				title: 'Email reenviado',
				description: participant.is_buyer
					? 'O recibo da compra foi reenviado para quem comprou'
					: 'O ingresso foi reenviado para o participante',
				variant: 'success',
			});

			handleClose();
			onSuccess?.();
		} catch (error) {
			toast({
				title: 'Erro ao reenviar',
				description: error instanceof Error ? error.message : 'Ocorreu um erro ao reenviar o email',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!participant) return null;

	const isCancelled = participant.registration.status === 'cancelled';
	const isUnnamed = !participant.attendee_email;
	const recipientName = participant.is_buyer ? participant.registration.participant_name : participant.attendee_name;
	const recipientEmail = participant.is_buyer ? participant.registration.participant_email : participant.attendee_email;

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-full bg-muted ">
							<Mail className="size-5 text-muted-foreground " />
						</div>
						<div>
							<DialogTitle>{participant.is_buyer ? 'Reenviar Recibo da Compra' : 'Reenviar Ingresso'}</DialogTitle>
							<DialogDescription>
								{participant.is_buyer
									? `Envia de novo o recibo da compra para ${recipientName}, com todos os ingressos do pedido.`
									: `Envia de novo o ingresso de ${recipientName ?? 'quem for informado'}, com o código de acesso.`}
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<div className="space-y-4">
					<Card className="p-4">
						<h4 className="mb-3 text-sm font-semibold text-foreground">Detalhes do Email</h4>
						<dl className="space-y-2 text-sm">
							<div className="flex justify-between">
								<dt className="text-muted-foreground dark:text-muted-foreground">Destinatário:</dt>
								<dd className="font-medium text-foreground">{recipientName ?? '—'}</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-muted-foreground dark:text-muted-foreground">Email:</dt>
								<dd className="font-medium text-foreground">{recipientEmail ?? '—'}</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-muted-foreground dark:text-muted-foreground">Evento:</dt>
								<dd className="font-medium text-foreground">{participant.event.title}</dd>
							</div>
							<div className="flex justify-between">
								<dt className="text-muted-foreground dark:text-muted-foreground">Código do Ingresso:</dt>
								<dd className="font-mono text-xs font-medium text-foreground">{participant.ticket_code}</dd>
							</div>
						</dl>
					</Card>

					{isUnnamed && (
						<Card className="p-4">
							<div className="flex items-start gap-2">
								<AlertTriangle className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground " />
								<div>
									<p className="text-sm font-medium text-muted-foreground ">Sem participante</p>
									<p className="mt-1 text-sm text-muted-foreground ">
										Informe quem vai usar este ingresso antes de reenviar.
									</p>
								</div>
							</div>
						</Card>
					)}

					{isCancelled && (
						<Card className="p-4">
							<div className="flex items-start gap-2">
								<AlertTriangle className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground " />
								<div>
									<p className="text-sm font-medium text-muted-foreground ">Pedido Cancelado</p>
									<p className="mt-1 text-sm text-muted-foreground ">
										Este pedido foi cancelado. O email será enviado normalmente, mas o participante não poderá fazer
										check-in.
									</p>
								</div>
							</div>
						</Card>
					)}

					<Card className="p-4">
						<h4 className="mb-2 text-sm font-semibold text-muted-foreground ">O email incluirá:</h4>
						<ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground ">
							{participant.is_buyer ? (
								<>
									<li>Todos os ingressos do pedido e seus participantes</li>
									<li>Quais ingressos ainda precisam de participante</li>
									<li>Comprovante de pagamento, quando houver</li>
								</>
							) : (
								<>
									<li>Detalhes do evento: data e local</li>
									<li>Quem comprou o ingresso</li>
									<li>Código único de check-in</li>
								</>
							)}
						</ul>
					</Card>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
						Cancelar
					</Button>
					<Button onClick={handleResend} disabled={isSubmitting || isUnnamed}>
						{isSubmitting ? 'Enviando...' : participant.is_buyer ? 'Reenviar Recibo' : 'Reenviar Ingresso'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
