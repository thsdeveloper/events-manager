'use client';

import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { ParticipantFilters as Filters } from '../_lib/types';
import { statusLabels, paymentStatusLabels } from '../_lib/utils';

interface ParticipantFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  eventOptions: Array<{ id: string; title: string }>;
  ticketTypeOptions: Array<{ id: string; title: string }>;
}

export function ParticipantFilters({
  filters,
  onChange,
  eventOptions,
  ticketTypeOptions,
}: ParticipantFiltersProps) {
  const registrationStatusOptions = [
    { value: 'pending', label: statusLabels.pending },
    { value: 'confirmed', label: statusLabels.confirmed },
    { value: 'checked_in', label: statusLabels.checked_in },
    { value: 'cancelled', label: statusLabels.cancelled },
  ];

  const paymentStatusOptions = [
    { value: 'pending', label: paymentStatusLabels.pending },
    { value: 'paid', label: paymentStatusLabels.paid },
    { value: 'failed', label: paymentStatusLabels.failed },
    { value: 'refunded', label: paymentStatusLabels.refunded },
    { value: 'free', label: paymentStatusLabels.free },
  ];

  const activeFiltersCount =
    filters.eventIds.length +
    filters.ticketTypeIds.length +
    filters.registrationStatus.length +
    filters.paymentStatus.length +
    (filters.hasCheckedIn !== null ? 1 : 0);

  const handleEventToggle = (eventId: string) => {
    const newEventIds = filters.eventIds.includes(eventId)
      ? filters.eventIds.filter((id) => id !== eventId)
      : [...filters.eventIds, eventId];

    onChange({ ...filters, eventIds: newEventIds });
  };

  const handleTicketTypeToggle = (ticketTypeId: string) => {
    const newTicketTypeIds = filters.ticketTypeIds.includes(ticketTypeId)
      ? filters.ticketTypeIds.filter((id) => id !== ticketTypeId)
      : [...filters.ticketTypeIds, ticketTypeId];

    onChange({ ...filters, ticketTypeIds: newTicketTypeIds });
  };

  const handleRegistrationStatusToggle = (status: string) => {
    const newStatus = filters.registrationStatus.includes(status as any)
      ? filters.registrationStatus.filter((s) => s !== status)
      : [...filters.registrationStatus, status as any];

    onChange({ ...filters, registrationStatus: newStatus });
  };

  const handlePaymentStatusToggle = (status: string) => {
    const newStatus = filters.paymentStatus.includes(status as any)
      ? filters.paymentStatus.filter((s) => s !== status)
      : [...filters.paymentStatus, status as any];

    onChange({ ...filters, paymentStatus: newStatus });
  };

  const handleCheckInToggle = (value: boolean | null) => {
    onChange({ ...filters, hasCheckedIn: value });
  };

  const handleClearAll = () => {
    onChange({
      search: filters.search,
      eventIds: [],
      ticketTypeIds: [],
      registrationStatus: [],
      paymentStatus: [],
      hasCheckedIn: null,
      checkInDateRange: { start: null, end: null },
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Filter className="mr-2 size-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge className="ml-2 size-5 rounded-full p-0 text-xs" variant="default">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filtros Avançados</SheetTitle>
          <SheetDescription>
            Refine sua busca aplicando filtros aos participantes
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Eventos */}
          {eventOptions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Eventos</Label>
                {filters.eventIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange({ ...filters, eventIds: [] })}
                    className="h-auto p-0 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Limpar
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {eventOptions.map((event) => (
                  <div key={event.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`event-${event.id}`}
                      checked={filters.eventIds.includes(event.id)}
                      onCheckedChange={() => handleEventToggle(event.id)}
                    />
                    <label
                      htmlFor={`event-${event.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {event.title}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tipos de Ingresso */}
          {ticketTypeOptions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Tipos de Ingresso</Label>
                {filters.ticketTypeIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange({ ...filters, ticketTypeIds: [] })}
                    className="h-auto p-0 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Limpar
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {ticketTypeOptions.map((ticketType) => (
                  <div key={ticketType.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`ticket-${ticketType.id}`}
                      checked={filters.ticketTypeIds.includes(ticketType.id)}
                      onCheckedChange={() => handleTicketTypeToggle(ticketType.id)}
                    />
                    <label
                      htmlFor={`ticket-${ticketType.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {ticketType.title}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status de Inscrição */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Status de Inscrição</Label>
              {filters.registrationStatus.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...filters, registrationStatus: [] })}
                  className="h-auto p-0 text-xs text-gray-500 hover:text-gray-700"
                >
                  Limpar
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {registrationStatusOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`reg-status-${option.value}`}
                    checked={filters.registrationStatus.includes(option.value as any)}
                    onCheckedChange={() => handleRegistrationStatusToggle(option.value)}
                  />
                  <label
                    htmlFor={`reg-status-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Status de Pagamento */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Status de Pagamento</Label>
              {filters.paymentStatus.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...filters, paymentStatus: [] })}
                  className="h-auto p-0 text-xs text-gray-500 hover:text-gray-700"
                >
                  Limpar
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {paymentStatusOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`pay-status-${option.value}`}
                    checked={filters.paymentStatus.includes(option.value as any)}
                    onCheckedChange={() => handlePaymentStatusToggle(option.value)}
                  />
                  <label
                    htmlFor={`pay-status-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Check-in */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Check-in</Label>
              {filters.hasCheckedIn !== null && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCheckInToggle(null)}
                  className="h-auto p-0 text-xs text-gray-500 hover:text-gray-700"
                >
                  Limpar
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="checkin-yes"
                  checked={filters.hasCheckedIn === true}
                  onCheckedChange={() =>
                    handleCheckInToggle(filters.hasCheckedIn === true ? null : true)
                  }
                />
                <label
                  htmlFor="checkin-yes"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Realizou check-in
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="checkin-no"
                  checked={filters.hasCheckedIn === false}
                  onCheckedChange={() =>
                    handleCheckInToggle(filters.hasCheckedIn === false ? null : false)
                  }
                />
                <label
                  htmlFor="checkin-no"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Não realizou check-in
                </label>
              </div>
            </div>
          </div>

          {/* Clear All */}
          {activeFiltersCount > 0 && (
            <div className="pt-4">
              <Button variant="outline" onClick={handleClearAll} className="w-full">
                <X className="mr-2 size-4" />
                Limpar Todos os Filtros
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
