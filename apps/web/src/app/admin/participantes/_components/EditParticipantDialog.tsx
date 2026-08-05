'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Loader2 } from 'lucide-react';
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
import { useAuthToken } from '../_hooks/useAuthToken';
import { isValidEmail, isValidBrazilianPhone, formatBrazilianPhone } from '../_lib/utils';
import type { ParticipantRow, EditParticipantData } from '../_lib/types';

// Schema de validação com Zod
const editParticipantSchema = z.object({
  participant_name: z.string().min(1, 'Nome é obrigatório'),
  participant_email: z
    .string()
    .min(1, 'Email é obrigatório')
    .refine(isValidEmail, 'Email inválido'),
  participant_phone: z
    .string()
    .optional()
    .refine((val) => !val || isValidBrazilianPhone(val), 'Telefone deve estar no formato (XX) XXXXX-XXXX'),
  participant_document: z.string().optional(),
  notes: z.string().optional(),
});

type EditParticipantFormData = z.infer<typeof editParticipantSchema>;

interface EditParticipantDialogProps {
  participant: ParticipantRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditParticipantDialog({
  participant,
  open,
  onOpenChange,
  onSuccess,
}: EditParticipantDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { token } = useAuthToken();

  const {
    register,
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
      reset({
        participant_name: participant.participant_name || '',
        participant_email: participant.participant_email || '',
        participant_phone: participant.participant_phone || '',
        participant_document: participant.participant_document || '',
        notes: participant.notes || '',
      });
    }
  }, [participant, open, reset]);

  // Formatar telefone ao digitar
  const phoneValue = watch('participant_phone');
  useEffect(() => {
    if (phoneValue) {
      const formatted = formatBrazilianPhone(phoneValue);
      if (formatted !== phoneValue) {
        setValue('participant_phone', formatted);
      }
    }
  }, [phoneValue, setValue]);

  const onSubmit = async (data: EditParticipantFormData) => {
    if (!participant || !token) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/participantes/${participant.id}/edit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao editar participante');
      }

      toast({
        title: 'Participante atualizado! ✓',
        description: `As informações de ${data.participant_name} foram atualizadas com sucesso`,
        variant: 'success',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error editing participant:', error);
      toast({
        title: 'Não foi possível editar participante',
        description: error.message || 'Tente novamente em alguns instantes',
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
            Editar Participante
          </DialogTitle>
          <DialogDescription>
            Atualize as informações básicas do participante
          </DialogDescription>
        </DialogHeader>

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
            {errors.participant_name && (
              <p className="text-sm text-rose-600">{errors.participant_name.message}</p>
            )}
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
            {errors.participant_email && (
              <p className="text-sm text-rose-600">{errors.participant_email.message}</p>
            )}
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="participant_phone">Telefone</Label>
            <Input
              id="participant_phone"
              type="tel"
              {...register('participant_phone')}
              disabled={isLoading}
              placeholder="(11) 98765-4321"
            />
            {errors.participant_phone && (
              <p className="text-sm text-rose-600">{errors.participant_phone.message}</p>
            )}
            <p className="text-xs text-gray-500">Formato: (XX) XXXXX-XXXX</p>
          </div>

          {/* Documento */}
          <div className="space-y-2">
            <Label htmlFor="participant_document">Documento</Label>
            <Input
              id="participant_document"
              {...register('participant_document')}
              disabled={isLoading}
              placeholder="CPF ou RG"
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Pencil className="size-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
