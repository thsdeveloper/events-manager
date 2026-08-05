'use client';

import { useState } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { TicketFilters } from '../_lib/types';

interface TicketFiltersProps {
  filters: TicketFilters;
  onChange: (filters: TicketFilters) => void;
  eventOptions: Array<{ id: string; title: string; start_date: string }>;
}

export function TicketFilters({ filters, onChange, eventOptions }: TicketFiltersProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<TicketFilters>(filters);

  const statusOptions = [
    { value: 'active', label: 'Ativo' },
    { value: 'sold_out', label: 'Esgotado' },
    { value: 'inactive', label: 'Inativo' },
  ];

  const activeFilterCount =
    filters.eventIds.length +
    filters.status.length;

  const handleApply = () => {
    onChange(localFilters);
    setOpen(false);
  };

  const handleReset = () => {
    const resetFilters: TicketFilters = {
      search: filters.search,
      eventIds: [],
      status: [],
    };
    setLocalFilters(resetFilters);
    onChange(resetFilters);
  };

  const handleEventToggle = (eventId: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      eventIds: prev.eventIds.includes(eventId)
        ? prev.eventIds.filter((id) => id !== eventId)
        : [...prev.eventIds, eventId],
    }));
  };

  const handleStatusToggle = (status: 'active' | 'sold_out' | 'inactive') => {
    setLocalFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="mr-2 size-4" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge
              variant="default"
              className="absolute -right-2 -top-2 size-5 rounded-full p-0 text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Filtrar Ingressos</SheetTitle>
          <SheetDescription>
            Selecione os filtros para refinar sua busca
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Event Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Evento</Label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {eventOptions.map((event) => (
                <div key={event.id} className="flex items-start space-x-2">
                  <Checkbox
                    id={`event-${event.id}`}
                    checked={localFilters.eventIds.includes(event.id)}
                    onCheckedChange={() => handleEventToggle(event.id)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={`event-${event.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {event.title}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.start_date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Status</Label>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={localFilters.status.includes(option.value as any)}
                    onCheckedChange={() => handleStatusToggle(option.value as any)}
                  />
                  <label
                    htmlFor={`status-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            Limpar
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Aplicar Filtros
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
