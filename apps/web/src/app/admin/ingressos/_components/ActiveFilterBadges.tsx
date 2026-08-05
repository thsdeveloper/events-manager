'use client';

import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TicketFilters } from '../_lib/types';

interface ActiveFilterBadgesProps {
  filters: TicketFilters;
  eventOptions: Array<{ id: string; title: string }>;
  onRemoveFilter: (filterType: string, value?: string) => void;
  onClearAll: () => void;
}

const statusLabels = {
  active: 'Ativo',
  sold_out: 'Esgotado',
  inactive: 'Inativo',
};

export function ActiveFilterBadges({
  filters,
  eventOptions,
  onRemoveFilter,
  onClearAll,
}: ActiveFilterBadgesProps) {
  const hasActiveFilters =
    filters.eventIds.length > 0 ||
    filters.status.length > 0;

  if (!hasActiveFilters) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Filtros ativos:
      </span>

      {/* Event Filters */}
      {filters.eventIds.map((eventId) => {
        const event = eventOptions.find((e) => e.id === eventId);
        if (!event) return null;

        return (
          <Badge key={eventId} variant="secondary" className="gap-1">
            Evento: {event.title}
            <button
              onClick={() => onRemoveFilter('eventIds', eventId)}
              className="ml-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <X className="size-3" />
            </button>
          </Badge>
        );
      })}

      {/* Status Filters */}
      {filters.status.map((status) => (
        <Badge key={status} variant="secondary" className="gap-1">
          Status: {statusLabels[status]}
          <button
            onClick={() => onRemoveFilter('status', status)}
            className="ml-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}

      {/* Clear All Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-6 px-2 text-xs"
      >
        Limpar todos
      </Button>
    </div>
  );
}
