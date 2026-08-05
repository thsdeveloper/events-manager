'use client';

import { memo, useMemo } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { Calendar, CheckCircle2, Clock, LockKeyhole, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { DatePicker } from '@/components/ui/date-picker';
import type { TicketFormData } from '../../_lib/schemas';

interface SalePeriodStepFormProps {
  form: UseFormReturn<TicketFormData>;
  eventOptions: Array<{ id: string; title: string; start_date: string }>;
}

export const SalePeriodStepForm = memo(function SalePeriodStepForm({ form, eventOptions }: SalePeriodStepFormProps) {
  const selectedEventId = useWatch({ control: form.control, name: 'event_id' });
  const saleStartDate = useWatch({ control: form.control, name: 'sale_start_date' });
  const saleEndDate = useWatch({ control: form.control, name: 'sale_end_date' });

  const selectedEvent = useMemo(
    () => eventOptions.find((event) => event.id === selectedEventId),
    [eventOptions, selectedEventId],
  );

  const eventStartDate = useMemo(
    () => (selectedEvent ? new Date(selectedEvent.start_date) : null),
    [selectedEvent],
  );

  const eventDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    [],
  );

  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [],
  );

  const saleStart = useMemo(() => (saleStartDate ? new Date(saleStartDate) : null), [saleStartDate]);
  const saleEnd = useMemo(() => (saleEndDate ? new Date(saleEndDate) : null), [saleEndDate]);

  const statusInfo = useMemo(() => {
    const now = new Date();

    if (!saleStart && !saleEnd) {
      return {
        icon: CheckCircle2,
        message: 'Vendas abertas até o evento começar',
        variant: 'default' as const,
      };
    }

    if (saleStart && saleStart > now) {
      return {
        icon: Clock,
        message: `Vendas iniciarão em ${dateTimeFormatter.format(saleStart)}`,
        variant: 'default' as const,
      };
    }

    if (saleEnd && saleEnd < now) {
      return {
        icon: LockKeyhole,
        message: 'Período de vendas encerrado',
        variant: 'destructive' as const,
      };
    }

    if (saleStart && saleEnd && saleStart <= now && saleEnd >= now) {
      return {
        icon: CheckCircle2,
        message: `Vendas abertas até ${dateTimeFormatter.format(saleEnd)}`,
        variant: 'default' as const,
      };
    }

    if (saleStart && !saleEnd) {
      return {
        icon: CheckCircle2,
        message: 'Vendas abertas até o evento começar',
        variant: 'default' as const,
      };
    }

    return null;
  }, [saleStart, saleEnd, dateTimeFormatter]);

  const eventStartLabel = useMemo(() => {
    if (!eventStartDate) return null;
    
return eventDateFormatter.format(eventStartDate);
  }, [eventStartDate, eventDateFormatter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b pb-4">
        <Calendar className="size-5 text-primary" />
        <h3 className="text-lg font-semibold">Período de Vendas</h3>
      </div>

      {/* Referência do Evento */}
      {selectedEvent && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="size-4" />
                Evento:
              </div>
              <div className="font-semibold">{selectedEvent.title}</div>
              {eventStartLabel && (
                <div className="text-sm text-muted-foreground">
                  Data: {eventStartLabel}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data de Início das Vendas */}
      <FormField
        control={form.control}
        name="sale_start_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Quando começam as vendas? (opcional)</FormLabel>
            <FormControl>
              <DatePicker
                date={saleStart ?? undefined}
                onSelect={(date) => field.onChange(date?.toISOString())}
                placeholder="Selecione a data de início"
              />
            </FormControl>
            <FormDescription>
              Deixe em branco para começar imediatamente
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Data de Encerramento das Vendas */}
      <FormField
        control={form.control}
        name="sale_end_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Quando encerram as vendas? (opcional)</FormLabel>
            <FormControl>
              <DatePicker
                date={saleEnd ?? undefined}
                onSelect={(date) => field.onChange(date?.toISOString())}
                placeholder="Selecione a data de encerramento"
                minDate={saleStart ?? undefined}
                maxDate={eventStartDate ?? undefined}
              />
            </FormControl>
            <FormDescription>
              Deixe em branco para vender até o evento começar
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Status Message */}
      {statusInfo && (
        <Alert variant={statusInfo.variant}>
          <statusInfo.icon className="size-4" />
          <AlertDescription>{statusInfo.message}</AlertDescription>
        </Alert>
      )}

      {/* Event Date Warning */}
      {saleEnd &&
        eventStartDate &&
        saleEnd >= eventStartDate && (
          <Alert>
            <AlertTriangle className="size-4" />
            <AlertDescription>
              A data de encerramento das vendas é posterior à data do evento. Considere
              encerrar as vendas antes do evento iniciar.
            </AlertDescription>
          </Alert>
        )}
    </div>
  );
});

SalePeriodStepForm.displayName = 'SalePeriodStepForm';
