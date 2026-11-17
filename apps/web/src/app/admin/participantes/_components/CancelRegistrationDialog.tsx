'use client';

import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
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
	// O estorno é uma decisão do organizador, não um efeito do cancelamento: um
	// no-show cancelado não devolve dinheiro; um evento cancelado, sim.
	const [refund, setRefund] = useState(false);

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
		setRefund(false);
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
				body: JSON.stringify({ ...data, refund: canRefund && refund }),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.detail || 'Erro ao cancelar inscrição');
			}

			toast({
				title: 'Pedido cancelado',
				description:
					canRefund && refund
						? 'O pedido foi cancelado e o estorno foi solicitado ao provedor de pagamento'
						: 'O pedido foi cancelado com sucesso',
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

	// O cancelamento é do pedido inteiro: todos os ingressos daquela compra,
	// deste tipo, caem juntos. O diálogo recebe um ingresso, mas fala do pedido.
	const { registration } = participant;
	const canCancel = registration.status === 'confirmed' || registration.status === 'pending';
	const canRefund = registration.payment_status === 'paid';
	const orderTotal = Number(registration.total_amount ?? 0);

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<div className="flex items-center gap-3">
						<div className="flex size-10 items-center justify-center rounded-full bg-muted ">
							<AlertTriangle className="size-5 text-destructive " />
						</div>
						<div>
							<DialogTitle>Cancelar Pedido</DialogTitle>
							<DialogDescription>Esta ação não pode ser desfeita</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				{!canCancel ? (
					<Card className="p-4">
						<p className="text-sm font-medium text-muted-foreground ">Este pedido não pode ser cancelado</p>
						<p className="mt-1 text-sm text-muted-foreground ">
							Apenas pedidos com status "Confirmado" ou "Pendente" podem ser cancelados.
						</p>
					</Card>
				) : (
					<>
						<div className="space-y-4">
							<Card className="p-4">
								<h4 className="mb-3 text-sm font-semibold text-foreground">Detalhes do Pedido</h4>
								<dl className="space-y-2 text-sm">
									<div className="flex justify-between">
										<dt className="text-muted-foreground dark:text-muted-foreground">Comprado por:</dt>
										<dd className="font-medium text-foreground">{registration.participant_name}</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-muted-foreground dark:text-muted-foreground">Email:</dt>
										<dd className="font-medium text-foreground">{registration.participant_email}</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-muted-foreground dark:text-muted-foreground">Evento:</dt>
										<dd className="font-medium text-foreground">{participant.event.title}</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-muted-foreground dark:text-muted-foreground">Ingressos:</dt>
										<dd className="font-medium text-foreground">
											{registration.quantity} × {participant.ticket_type?.title || 'Ingresso'}
										</dd>
									</div>
									{orderTotal > 0 && (
										<div className="flex justify-between border-t border-border pt-2">
											<dt className="text-muted-foreground dark:text-muted-foreground">Valor do pedido:</dt>
											<dd className="font-medium text-foreground">
												{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(orderTotal)}
											</dd>
										</div>
									)}
								</dl>
							</Card>

							<Card className="p-4">
								<p className="text-sm font-medium text-destructive ">Atenção:</p>
								<ul className="mt-2 list-inside list-disc space-y-1 text-sm text-destructive ">
									<li>
										{registration.quantity === 1
											? 'O ingresso deste pedido será cancelado'
											: `Todos os ${registration.quantity} ingressos deste pedido serão cancelados, não só este`}
									</li>
									<li>
										{canRefund
											? 'O reembolso só acontece se você marcar a opção abaixo'
											: 'O cancelamento não gera reembolso automático'}
									</li>
									<li>Nenhum participante do pedido poderá fazer check-in</li>
									<li>Esta ação é irreversível</li>
								</ul>
							</Card>

							<form id="cancel-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="reason" className="text-sm font-medium">
										Motivo do cancelamento <span className="text-destructive">*</span>
									</Label>
									<Textarea
										id="reason"
										{...register('reason')}
										placeholder="Explique o motivo do cancelamento (mínimo 10 caracteres)"
										className="min-h-[100px] resize-none"
										disabled={isSubmitting}
									/>
									{errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
									<p className="text-xs text-muted-foreground dark:text-muted-foreground">
										Este motivo ficará registrado no histórico da inscrição
									</p>
								</div>
								{canRefund && (
									<Card className="flex items-start gap-3 p-3">
										<Checkbox
											id="refund"
											checked={refund}
											onCheckedChange={(checked) => setRefund(checked === true)}
											disabled={isSubmitting}
										/>
										<div className="space-y-1">
											<Label htmlFor="refund" className="text-sm font-medium">
												Reembolsar o pagamento pelo provedor
											</Label>
											<p className="text-xs text-muted-foreground dark:text-muted-foreground">
												Estorno integral do valor pago. A confirmação chega pelo provedor e pode levar alguns minutos.
											</p>
										</div>
									</Card>
								)}
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
