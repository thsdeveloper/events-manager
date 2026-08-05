'use client';

import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ParticipantFilters } from '../_lib/types';
import { statusLabels, paymentStatusLabels } from '../_lib/utils';

interface ActiveFilterBadgesProps {
  filters: ParticipantFilters;
  eventOptions: Array<{ id: string; title: string }>;
  ticketTypeOptions: Array<{ id: string; title: string }>;
  onRemoveFilter: (filterType: string, value?: string) => void;
  onClearAll: () => void;
}

export function ActiveFilterBadges({
  filters,
  eventOptions,
  ticketTypeOptions,
  onRemoveFilter,
  onClearAll,
}: ActiveFilterBadgesProps) {
  const badges: Array<{ label: string; type: string; value?: string }> = [];

  // Event filters
  filters.eventIds.forEach((eventId) => {
    const event = eventOptions.find((e) => e.id === eventId);

    if (event) {
      badges.push({
        label: `Evento: ${event.title}`,
        type: 'eventIds',
        value: eventId,
      });
    }
  });

  // Ticket type filters
  filters.ticketTypeIds.forEach((ticketTypeId) => {
    const ticketType = ticketTypeOptions.find((t) => t.id === ticketTypeId);

    if (ticketType) {
      badges.push({
        label: `Ingresso: ${ticketType.title}`,
        type: 'ticketTypeIds',
        value: ticketTypeId,
      });
    }
  });

  // Registration status filters
  filters.registrationStatus.forEach((status) => {
    if (status) {
      badges.push({
        label: `Status: ${statusLabels[status as string] || status}`,
        type: 'registrationStatus',
        value: status,
      });
    }
  });

  // Payment status filters
  filters.paymentStatus.forEach((status) => {
    if (status) {
      badges.push({
        label: `Pagamento: ${paymentStatusLabels[status as string] || status}`,
        type: 'paymentStatus',
        value: status,
      });
    }
  });

  // Check-in filter
  if (filters.hasCheckedIn === true) {
    badges.push({
      label: 'Com check-in',
      type: 'hasCheckedIn',
    });
  } else if (filters.hasCheckedIn === false) {
    badges.push({
      label: 'Sem check-in',
      type: 'hasCheckedIn',
    });
  }

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Filtros ativos:
      </span>
      {badges.map((badge, index) => (
        <Badge
          key={`${badge.type}-${badge.value || index}`}
          variant="secondary"
          className="gap-1 pr-1"
        >
          {badge.label}
          <button
            onClick={() => onRemoveFilter(badge.type, badge.value)}
            className="ml-1 rounded-sm opacity-70 hover:opacity-100"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={onClearAll} className="h-6 px-2 text-xs">
        Limpar todos
      </Button>
    </div>
  );
}
