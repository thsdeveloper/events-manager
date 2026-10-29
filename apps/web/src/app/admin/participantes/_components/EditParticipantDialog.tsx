'use client';

import { useState, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { isValidEmail, isValidBrazilianPhone } from '../_lib/utils';
import { DocumentInput, PhoneInput } from '@/components/ui/masked-inputs';
import { isValidDocument } from '@/lib/br-documents';
import type { ParticipantRow, EditParticipantData } from '../_lib/types';

// Schema de validação com Zod
const editParticipantSchema = z.object({
	participant_name: z.string().min(1, 'Nome é obrigatório'),
	participant_email: z.string().min(1, 'Email é obrigatório').refine(isValidEmail, 'Email inválido'),
	participant_phone: z
		.string()
		.optional()
		.refine((val) => !val || isValidBrazilianPhone(val), 'Telefone deve estar no formato (XX) XXXXX-XXXX'),
	participant_document: z
		.string()
		.optional()
		.refine((value) => !value || isValidDocument(value), 'Informe um CPF ou CNPJ válido'),
	notes: z.string().optional(),
});

type EditParticipantFormData = z.infer<typeof editParticipantSchema>;

interface EditParticipantDialogProps {
	participant: ParticipantRow | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: () => void;
}

export function EditParticipantDialog({ participant, open, onOpenChange, onSuccess }: EditParticipantDialogProps) {
	const [isLoading, setIsLoading] = useState(false);
	const { toast } = useToast();

	const {
		register,
		control,
		handleSubmit,
		formState: { errors },
		reset,
		setValue,
		watch,
	} = useForm<EditParticipantFormData>({
		resolver: zodResolver(editParticipantSchema),
	});

	// Atualizar formulário quando participante mudar
	useEffect(() => {
		if (participant && open) {
			// O formulário edita a pessoa do ingresso; as observações são do pedido.
			reset({
				participant_name: participant.attendee_name || '',
				participant_email: participant.attendee_email || '',
				participant_phone: participant.attendee_phone || '',
				participant_document: participant.attendee_document || '',
				notes: participant.registration.notes || '',
			});
		}
	}, [participant, open, reset]);

	// Masking now lives in PhoneInput, which keeps the stored value as digits.

	const onSubmit = async (data: EditParticipantFormData) => {
		if (!participant) return;

		setIsLoading(true);
		try {
			const response = await fetch(`/api/admin/participantes/${participant.id}/edit`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				credentials: 'include',
				body: JSON.stringify(data),
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.detail || 'Erro ao editar participante');
			}

			toast({
				title: 'Participante atualizado! ✓',
				description: `As informações de ${data.participant_name} foram atualizadas com sucesso`,
				variant: 'success',
			});

			onOpenChange(false);
			onSuccess?.();
		} catch (error) {
			toast({
				title: 'Não foi possível editar participante',
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
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Pencil className="size-5 text-blue-600" />
						{participant.attendee_name ? 'Editar Participante' : 'Informar Participante'}
					</DialogTitle>
					<DialogDescription>
						Quem vai usar este ingresso ({participant.ticket_type?.title ?? 'Ingresso'} {participant.sequence} de{' '}
						{participant.registration.quantity}). Comprado por {participant.registration.participant_name}.
					</DialogDescription>
				</DialogHeader>

				{participant.check_in_date ? (
					// Regra de negócio: ingresso com check-in é imutável. A saída é
					// desfazer o check-in, e isso fica registrado.
					<div className="space-y-4 py-4">
						<p
							role="alert"
							className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
						>
							Este ingresso já passou pelo check-in e não pode ser alterado. Desfaça o check-in para editar o
							participante.
						</p>
						<DialogFooter>
							<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
								Fechar
							</Button>
						</DialogFooter>
					</div>
				) : (
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
						{/* Nome completo */}
						<div className="space-y-2">
							<Label htmlFor="participant_name">
								Nome completo <span className="text-rose-600">*</span>
							</Label>
							<Input
								id="participant_name"
								{...register('participant_name')}
								disabled={isLoading}
								placeholder="Ex: João Silva"
							/>
							{errors.participant_name && <p className="text-sm text-rose-600">{errors.participant_name.message}</p>}
						</div>

						{/* Email */}
						<div className="space-y-2">
							<Label htmlFor="participant_email">
								Email <span className="text-rose-600">*</span>
							</Label>
							<Input
								id="participant_email"
								type="email"
								{...register('participant_email')}
								disabled={isLoading}
								placeholder="email@exemplo.com"
							/>
							{errors.participant_email && <p className="text-sm text-rose-600">{errors.participant_email.message}</p>}
						</div>

						{/* Telefone */}
						<div className="space-y-2">
							<Label htmlFor="participant_phone">Telefone</Label>
							<Controller
								control={control}
								name="participant_phone"
								render={({ field }) => (
									<PhoneInput
										id="participant_phone"
										value={field.value ?? ''}
										onChange={field.onChange}
										onBlur={field.onBlur}
										disabled={isLoading}
										showError={false}
									/>
								)}
							/>
							{errors.participant_phone && <p className="text-sm text-rose-600">{errors.participant_phone.message}</p>}
						</div>

						{/* Documento */}
						<div className="space-y-2">
							<Label htmlFor="participant_document">Documento</Label>
							<Controller
								control={control}
								name="participant_document"
								render={({ field }) => (
									<DocumentInput
										id="participant_document"
										value={field.value ?? ''}
										onChange={field.onChange}
										onBlur={field.onBlur}
										disabled={isLoading}
										showError={false}
									/>
								)}
							/>
							{errors.participant_document && (
								<p className="text-sm text-rose-600">{errors.participant_document.message}</p>
							)}
						</div>

						{/* Observações */}
						<div className="space-y-2">
							<Label htmlFor="notes">Observações</Label>
							<Textarea
								id="notes"
								{...register('notes')}
								disabled={isLoading}
								placeholder="Notas internas visíveis apenas para você"
								rows={3}
							/>
							{errors.notes && <p className="text-sm text-rose-600">{errors.notes.message}</p>}
							<p className="text-xs text-gray-500">
								Estas observações são internas e não serão compartilhadas com o participante
							</p>
						</div>

						<DialogFooter className="gap-2 pt-4">
							<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
								Cancelar
							</Button>
							<Button type="submit" loading={isLoading} className="gap-2">
								<Pencil className="size-4" />
								Salvar Alterações
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
