'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarIcon, Filter, RotateCcw } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { AnalyticsFilters as Filters } from '../actions'

interface AnalyticsFiltersProps {
  onFilterChange: (filters: Filters) => void
  events?: Array<{ id: string; title: string }>
  organizers?: Array<{ id: string; name: string }>
}

const QUICK_RANGES = [
  { label: 'Últimos 7 dias', days: 7 },
  { label: 'Últimos 30 dias', days: 30 },
  { label: 'Últimos 90 dias', days: 90 },
  { label: 'Últimos 12 meses', days: 365 }
]

export function AnalyticsFilters({
  onFilterChange,
  events = [],
  organizers = []
}: AnalyticsFiltersProps) {
  const [filters, setFilters] = useState<Filters>({
    startDate: subDays(new Date(), 30),
    endDate: new Date()
  })

  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: filters.startDate,
    to: filters.endDate
  })

  const handleQuickRange = (days: number) => {
    const newFilters = {
      ...filters,
      startDate: subDays(new Date(), days),
      endDate: new Date()
    }
    setFilters(newFilters)
    setDateRange({ from: newFilters.startDate, to: newFilters.endDate })
    onFilterChange(newFilters)
  }

  const handleDateRangeSelect = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range)
    if (range.from && range.to) {
      const newFilters = {
        ...filters,
        startDate: range.from,
        endDate: range.to
      }
      setFilters(newFilters)
      onFilterChange(newFilters)
    }
  }

  const handleEventChange = (eventId: string) => {
    const newFilters = {
      ...filters,
      eventId: eventId === 'all' ? undefined : eventId
    }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleOrganizerChange = (organizerId: string) => {
    const newFilters = {
      ...filters,
      organizerId: organizerId === 'all' ? undefined : organizerId
    }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleReset = () => {
    const defaultFilters: Filters = {
      startDate: subDays(new Date(), 30),
      endDate: new Date()
    }
    setFilters(defaultFilters)
    setDateRange({ from: defaultFilters.startDate, to: defaultFilters.endDate })
    onFilterChange(defaultFilters)
  }

  const hasActiveFilters = filters.eventId || filters.organizerId

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="size-4 text-muted-foreground" />
          <h3 className="font-semibold">Filtros</h3>
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReset}
              className="ml-auto"
            >
              <RotateCcw className="size-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Seletor de período rápido */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Período</label>
            <Select onValueChange={(value) => handleQuickRange(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                {QUICK_RANGES.map((range) => (
                  <SelectItem key={range.days} value={range.days.toString()}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seletor de data personalizado */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Personalizada</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dateRange.from && !dateRange.to && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'dd/MM/yy', { locale: ptBR })} -{' '}
                        {format(dateRange.to, 'dd/MM/yy', { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
                    )
                  ) : (
                    'Selecione as datas'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{
                    from: dateRange.from,
                    to: dateRange.to
                  }}
                  onSelect={(range) => handleDateRangeSelect({
                    from: range?.from,
                    to: range?.to
                  })}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Filtro por evento */}
          {events.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Evento</label>
              <Select
                value={filters.eventId || 'all'}
                onValueChange={handleEventChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os eventos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os eventos</SelectItem>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filtro por organizador (apenas para admins) */}
          {organizers.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Organizador</label>
              <Select
                value={filters.organizerId || 'all'}
                onValueChange={handleOrganizerChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os organizadores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os organizadores</SelectItem>
                  {organizers.map((organizer) => (
                    <SelectItem key={organizer.id} value={organizer.id}>
                      {organizer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
