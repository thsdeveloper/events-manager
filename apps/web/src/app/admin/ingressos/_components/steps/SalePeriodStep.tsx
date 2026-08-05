'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import type { TicketFormData } from '../../_lib/types';

interface SalePeriodStepProps {
  formData: Partial<TicketFormData>;
  onChange: (data: Partial<TicketFormData>) => void;
  eventOptions: Array<{ id: string; title: string; start_date: string }>;
}

export function SalePeriodStep({ formData, onChange, eventOptions }: SalePeriodStepProps) {
  const selectedEvent = eventOptions.find((e) => e.id === formData.event_id);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSaleStatusMessage = () => {
    const now = new Date();
    const startDate = formData.sale_start_date ? new Date(formData.sale_start_date) : null;
    const endDate = formData.sale_end_date ? new Date(formData.sale_end_date) : null;

    if (!startDate && !endDate) {
      return {
        icon: '✅',
        message: 'Vendas abertas até o evento começar',
        variant: 'success',
      };
    }

    if (startDate && startDate > now) {
      return {
        icon: '⏰',
        message: `Vendas iniciarão em ${formatDateTime(formData.sale_start_date!)}`,
        variant: 'info',
      };
    }

    if (endDate && endDate < now) {
      return {
        icon: '🔒',
        message: 'Período de vendas encerrado',
        variant: 'error',
      };
    }

    if (startDate && endDate && startDate <= now && endDate >= now) {
      return {
        icon: '✅',
        message: `Vendas abertas até ${formatDateTime(formData.sale_end_date!)}`,
        variant: 'success',
      };
    }

    if (startDate && !endDate) {
      return {
        icon: '✅',
        message: 'Vendas abertas até o evento começar',
        variant: 'success',
      };
    }

    return null;
  };

  const statusMessage = getSaleStatusMessage();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">📅 Período de Vendas</h3>
      </div>

      {/* Referência do Evento */}
      {selectedEvent && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">🎉 Evento:</div>
              <div className="font-semibold">{selectedEvent.title}</div>
              <div className="text-sm text-muted-foreground">
                📅 Data: {formatDate(selectedEvent.start_date)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data de Início das Vendas */}
      <div className="space-y-2">
        <Label htmlFor="sale-start">Quando começam as vendas? (opcional)</Label>
        <Input
          id="sale-start"
          type="datetime-local"
          value={formData.sale_start_date || ''}
          onChange={(e) => onChange({ sale_start_date: e.target.value || null })}
        />
        <p className="text-sm text-muted-foreground">
          Deixe em branco para começar imediatamente
        </p>
      </div>

      {/* Data de Encerramento das Vendas */}
      <div className="space-y-2">
        <Label htmlFor="sale-end">Quando encerram as vendas? (opcional)</Label>
        <Input
          id="sale-end"
          type="datetime-local"
          value={formData.sale_end_date || ''}
          onChange={(e) => onChange({ sale_end_date: e.target.value || null })}
        />
        <p className="text-sm text-muted-foreground">
          Deixe em branco para vender até o evento começar
        </p>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <Card
          className={
            statusMessage.variant === 'success'
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
              : statusMessage.variant === 'error'
              ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
              : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
          }
        >
          <CardContent className="pt-6">
            <p
              className={`text-sm font-medium ${
                statusMessage.variant === 'success'
                  ? 'text-green-900 dark:text-green-200'
                  : statusMessage.variant === 'error'
                  ? 'text-red-900 dark:text-red-200'
                  : 'text-blue-900 dark:text-blue-200'
              }`}
            >
              {statusMessage.icon} {statusMessage.message}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Validation Warning */}
      {formData.sale_start_date &&
        formData.sale_end_date &&
        new Date(formData.sale_start_date) >= new Date(formData.sale_end_date) && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            <p className="font-medium">❌ Erro</p>
            <p className="text-sm mt-1">
              A data de início deve ser anterior à data de encerramento
            </p>
          </div>
        )}

      {/* Event Date Warning */}
      {formData.sale_end_date &&
        selectedEvent &&
        new Date(formData.sale_end_date) >= new Date(selectedEvent.start_date) && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
            <p className="font-medium">⚠️ Atenção</p>
            <p className="text-sm mt-1">
              A data de encerramento das vendas é posterior à data do evento. Considere
              encerrar as vendas antes do evento iniciar.
            </p>
          </div>
        )}
    </div>
  );
}
