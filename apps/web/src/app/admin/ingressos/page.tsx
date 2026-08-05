'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TicketsTable } from './_components/TicketsTable';
import { SearchBar } from './_components/SearchBar';
import { TicketFilters } from './_components/TicketFilters';
import { ActiveFilterBadges } from './_components/ActiveFilterBadges';
import { TicketDrawerForm } from './_components/TicketDrawerForm';
import { useAuthToken } from './_hooks/useAuthToken';
import type { TicketsResponse, TicketFilters as Filters, EventTicket } from './_lib/types';

export default function IngressosPage() {
  const [data, setData] = useState<TicketsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<EventTicket | null>(null);

  // Auth token
  const { token, isLoading: isLoadingToken, error: tokenError } = useAuthToken();

  // Filter options
  const [eventOptions, setEventOptions] = useState<Array<{ id: string; title: string; start_date: string }>>([]);

  // Filters
  const [filters, setFilters] = useState<Filters>({
    search: '',
    eventIds: [],
    status: [],
  });

  // Serialize filters for stable dependency
  const filtersKey = useMemo(
    () => JSON.stringify(filters),
    [filters]
  );

  // Load filter options on mount
  useEffect(() => {
    if (!token) return;

    async function loadFilterOptions() {
      try {
        const response = await fetch('/api/admin/ingressos/filter-options', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const options = await response.json();
          setEventOptions(options.events || []);
        }
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    }

    loadFilterOptions();
  }, [token]);

  // Load tickets data
  useEffect(() => {
    if (!token) {
      if (tokenError) {
        setError(tokenError);
        setIsLoading(false);
      }
      
return;
    }

    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        // Parse filters from key
        const parsedFilters = JSON.parse(filtersKey) as Filters;

        // Build query params
        const params = new URLSearchParams({
          page: currentPage.toString(),
        });

        if (parsedFilters.search) params.set('search', parsedFilters.search);
        if (parsedFilters.eventIds.length > 0) params.set('eventIds', parsedFilters.eventIds.join(','));
        if (parsedFilters.status.length > 0) params.set('status', parsedFilters.status.join(','));

        const response = await fetch(`/api/admin/ingressos?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (cancelled) return;

        const json = await response.json();

        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading tickets:', error);
        setError('Erro ao carregar ingressos');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [token, tokenError, currentPage, filtersKey, refreshTrigger]);

  const handleFilterChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setCurrentPage(1);
  }, []);

  const handleRemoveFilter = useCallback(
    (filterType: string, value?: string) => {
      setFilters((prevFilters) => {
        const newFilters = { ...prevFilters };

        if (filterType === 'eventIds' && value) {
          newFilters.eventIds = newFilters.eventIds.filter((id) => id !== value);
        } else if (filterType === 'status' && value) {
          newFilters.status = newFilters.status.filter((s) => s !== value);
        }

        return newFilters;
      });
      setCurrentPage(1);
    },
    []
  );

  const handleClearAllFilters = useCallback(() => {
    setFilters({
      search: '',
      eventIds: [],
      status: [],
    });
    setCurrentPage(1);
  }, []);

  const handleDataRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleNewTicket = useCallback(() => {
    setEditingTicket(null);
    setDrawerOpen(true);
  }, []);

  const handleEditTicket = useCallback((ticket: EventTicket) => {
    setEditingTicket(ticket);
    setDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    setEditingTicket(null);
  }, []);

  const handleTicketSaved = useCallback(() => {
    handleDataRefresh();
    handleDrawerClose();
  }, [handleDataRefresh, handleDrawerClose]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Gerenciar Ingressos
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Crie e gerencie ingressos para seus eventos
            </p>
          </div>
        </div>
        <Button onClick={handleNewTicket} size="lg">
          <Plus className="mr-2 size-4" />
          Novo Ingresso
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-200">
          <p className="font-medium">Erro ao carregar dados</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Filters and Search */}
      {!error && (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <SearchBar value={filters.search} onChange={handleSearchChange} />
            </div>
            <TicketFilters
              filters={filters}
              onChange={handleFilterChange}
              eventOptions={eventOptions}
            />
          </div>

          {/* Active Filter Badges */}
          <ActiveFilterBadges
            filters={filters}
            eventOptions={eventOptions}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={handleClearAllFilters}
          />
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <TicketsTable
            data={data?.data || []}
            isLoading={isLoading}
            pageCount={data?.meta?.pageCount || 1}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onDataRefresh={handleDataRefresh}
            onEditTicket={handleEditTicket}
          />
        </div>
      )}

      {/* Drawer */}
      <TicketDrawerForm
        open={drawerOpen}
        onClose={handleDrawerClose}
        ticket={editingTicket}
        onSaved={handleTicketSaved}
        eventOptions={eventOptions}
      />
    </div>
  );
}
