'use client'

import { useRouter, useSearchParams } from 'next/navigation'
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
import { useState } from 'react'

const QUICK_RANGES = [
  { label: 'Últimos 7 dias', days: 7 },
  { label: 'Últimos 30 dias', days: 30 },
  { label: 'Últimos 90 dias', days: 90 },
  { label: 'Últimos 12 meses', days: 365 }
]

export function AnalyticsFiltersWrapper() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
    to: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
  })

  const updateSearchParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    router.push(`?${params.toString()}`)
  }

  const handleQuickRange = (days: number) => {
    const endDate = new Date()
    const startDate = subDays(endDate, days)

    setDateRange({ from: startDate, to: endDate })
    updateSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    })
  }

  const handleDateRangeSelect = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range)

    if (range.from && range.to) {
      updateSearchParams({
        startDate: range.from.toISOString(),
        endDate: range.to.toISOString()
      })
    }
  }

  const handleReset = () => {
    setDateRange({ from: undefined, to: undefined })
    router.push('/admin/analises')
  }

  const hasActiveFilters = searchParams.has('eventId') || searchParams.has('organizerId')

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
        </div>
      </CardContent>
    </Card>
  )
}
