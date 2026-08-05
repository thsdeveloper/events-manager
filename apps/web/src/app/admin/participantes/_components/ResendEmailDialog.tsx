'use client';

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
import { useAuthToken } from '../_hooks/useAuthToken';
import type { ParticipantRow } from '../_lib/types';

interface ResendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participant: ParticipantRow | null;
  onSuccess?: () => void;
}

export function ResendEmailDialog({
  open,
  onOpenChange,
  participant,
  onSuccess,
}: ResendEmailDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token } = useAuthToken();

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleResend = async () => {
    if (!participant || !token) {
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
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao reenviar email');
      }

      toast({
        title: 'Email reenviado',
        description: 'O email de confirmação foi reenviado com sucesso',
        variant: 'success',
      });

      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error resending email:', error);
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

  const isCancelled = participant.status === 'cancelled';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
              <Mail className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle>Reenviar Email de Confirmação</DialogTitle>
              <DialogDescription>Enviar novamente o email com os detalhes da inscrição</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Detalhes do Email</h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Destinatário:</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{participant.participant_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Email:</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{participant.participant_email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Evento:</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{participant.event_id.title}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Código do Ingresso:</dt>
                <dd className="font-mono text-xs font-medium text-gray-900 dark:text-white">
                  {participant.ticket_code || 'N/A'}
                </dd>
              </div>
            </dl>
          </div>

          {isCancelled && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">Inscrição Cancelada</p>
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    Esta inscrição foi cancelada. O email será enviado normalmente, mas o participante não poderá fazer
                    check-in.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h4 className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-200">
              O email incluirá:
            </h4>
            <ul className="list-inside list-disc space-y-1 text-sm text-blue-700 dark:text-blue-300">
              <li>Detalhes completos do evento</li>
              <li>Informações do ingresso</li>
              <li>Código único de check-in</li>
              <li>QR code para facilitar o check-in</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleResend} disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Reenviar Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
