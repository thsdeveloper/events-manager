'use client';

import { memo, useMemo } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { Ticket, Globe, Lock, Hand } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import type { TicketFormData } from '../../_lib/schemas';

interface BasicInfoStepFormProps {
  form: UseFormReturn<TicketFormData>;
  eventOptions: Array<{ id: string; title: string; start_date: string }>;
}

export const BasicInfoStepForm = memo(function BasicInfoStepForm({ form, eventOptions }: BasicInfoStepFormProps) {
  const title = useWatch({ control: form.control, name: 'title' }) ?? '';
  const description = useWatch({ control: form.control, name: 'description' }) ?? '';
  const titleLength = title.length;
  const descriptionLength = description.length;

  const formattedEventOptions = useMemo(
    () =>
      eventOptions.map((event) => ({
        ...event,
        formattedDate: new Date(event.start_date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      })),
    [eventOptions],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b pb-4">
        <Ticket className="size-5 text-primary" />
        <h3 className="text-lg font-semibold">Informações Básicas</h3>
      </div>

      {/* Evento */}
      <FormField
        control={form.control}
        name="event_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Para qual evento? <span className="text-destructive">*</span>
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o evento" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {formattedEventOptions.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{event.title}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {event.formattedDate}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Selecione o evento ao qual este ingresso pertence
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Nome do Ingresso */}
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Nome do ingresso <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder="Ex: Ingresso Único, Meia-Entrada, VIP"
                maxLength={100}
                {...field}
              />
            </FormControl>
            <div className="flex justify-between">
              <FormDescription>
                Nome que aparecerá para os compradores
              </FormDescription>
              <span className="text-xs text-muted-foreground">{titleLength}/100</span>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Descrição */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição (opcional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Informações adicionais sobre o ingresso (opcional)"
                maxLength={500}
                rows={4}
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <div className="flex justify-between">
              <FormDescription>
                Inclua detalhes sobre o que está incluso, restrições, etc.
              </FormDescription>
              <span className="text-xs text-muted-foreground">{descriptionLength}/500</span>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Visibilidade */}
      <FormField
        control={form.control}
        name="visibility"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>
              Quem pode comprar? <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="space-y-2"
              >
                <div className="flex items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent">
                  <RadioGroupItem value="public" id="visibility-public" className="mt-1" />
                  <div className="flex-1">
                    <label
                      htmlFor="visibility-public"
                      className="flex items-center gap-2 cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      <Globe className="size-4 text-primary" />
                      Público
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Qualquer pessoa pode comprar este ingresso
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent">
                  <RadioGroupItem value="invited_only" id="visibility-invited" className="mt-1" />
                  <div className="flex-1">
                    <label
                      htmlFor="visibility-invited"
                      className="flex items-center gap-2 cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      <Lock className="size-4 text-primary" />
                      Somente Convidados
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Apenas pessoas com link especial podem comprar
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent">
                  <RadioGroupItem value="manual" id="visibility-manual" className="mt-1" />
                  <div className="flex-1">
                    <label
                      htmlFor="visibility-manual"
                      className="flex items-center gap-2 cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      <Hand className="size-4 text-primary" />
                      Manual
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vendas controladas manualmente pelo organizador
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
});

BasicInfoStepForm.displayName = 'BasicInfoStepForm';
