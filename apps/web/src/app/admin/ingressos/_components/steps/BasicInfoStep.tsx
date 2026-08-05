'use client';

import { Label } from '@/components/ui/label';
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
import type { TicketFormData } from '../../_lib/types';

interface BasicInfoStepProps {
  formData: Partial<TicketFormData>;
  onChange: (data: Partial<TicketFormData>) => void;
  eventOptions: Array<{ id: string; title: string; start_date: string }>;
}

export function BasicInfoStep({ formData, onChange, eventOptions }: BasicInfoStepProps) {
  const characterCount = formData.title?.length || 0;
  const descriptionCount = formData.description?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">🎫 Informações Básicas</h3>
      </div>

      {/* Evento */}
      <div className="space-y-2">
        <Label htmlFor="event_id">
          Para qual evento? <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.event_id}
          onValueChange={(value) => onChange({ event_id: value })}
        >
          <SelectTrigger id="event_id">
            <SelectValue placeholder="Selecione o evento" />
          </SelectTrigger>
          <SelectContent>
            {eventOptions.map((event) => (
              <SelectItem key={event.id} value={event.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{event.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {new Date(event.start_date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Selecione o evento ao qual este ingresso pertence
        </p>
      </div>

      {/* Nome do Ingresso */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Nome do ingresso <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          type="text"
          placeholder="Ex: Ingresso Único, Meia-Entrada, VIP"
          value={formData.title || ''}
          onChange={(e) => onChange({ title: e.target.value })}
          maxLength={100}
        />
        <div className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            Nome que aparecerá para os compradores
          </p>
          <p className="text-xs text-muted-foreground">{characterCount}/100</p>
        </div>
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea
          id="description"
          placeholder="Informações adicionais sobre o ingresso (opcional)"
          value={formData.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          maxLength={500}
          rows={4}
        />
        <div className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            Inclua detalhes sobre o que está incluso, restrições, etc.
          </p>
          <p className="text-xs text-muted-foreground">{descriptionCount}/500</p>
        </div>
      </div>

      {/* Visibilidade */}
      <div className="space-y-3">
        <Label>
          Quem pode comprar? <span className="text-red-500">*</span>
        </Label>
        <RadioGroup
          value={formData.visibility}
          onValueChange={(value: any) => onChange({ visibility: value })}
        >
          <div className="flex items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent">
            <RadioGroupItem value="public" id="visibility-public" className="mt-1" />
            <div className="flex-1">
              <label
                htmlFor="visibility-public"
                className="cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                🌐 Público
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
                className="cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                🔒 Somente Convidados
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
                className="cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                ✋ Manual
              </label>
              <p className="text-sm text-muted-foreground mt-1">
                Vendas controladas manualmente pelo organizador
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}
