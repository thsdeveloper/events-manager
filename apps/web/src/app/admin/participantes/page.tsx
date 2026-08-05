'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ParticipantsTable } from './_components/ParticipantsTable';
import { MetricsCards } from './_components/MetricsCards';
import { SearchBar } from './_components/SearchBar';
import { ParticipantFilters } from './_components/ParticipantFilters';
import { ActiveFilterBadges } from './_components/ActiveFilterBadges';
import { ExportButton } from './_components/ExportButton';
import { useAuthToken } from './_hooks/useAuthToken';
import type { ParticipantsResponse, ParticipantFilters as Filters } from './_lib/types';

export default function ParticipantesPage() {
  const [data, setData] = useState<ParticipantsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);

  // Auth token
  const { token, error: tokenError, isRedirecting: isTokenRedirecting } = useAuthToken();
  const router = useRouter();

  // Filter options
  const [eventOptions, setEventOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [ticketTypeOptions, setTicketTypeOptions] = useState<Array<{ id: string; title: string }>>([]);

  // Filters
  const [filters, setFilters] = useState<Filters>({
    search: '',
    eventIds: [],
    ticketTypeIds: [],
    registrationStatus: [],
    paymentStatus: [],
    hasCheckedIn: null,
    checkInDateRange: { start: null, end: null },
  });

  // Serialize filters for stable dependency
  const filtersKey = useMemo(
    () => JSON.stringify(filters),
    [filters]
  );

  const handleUnauthorized = useCallback(
    (message?: string) => {
      setRedirectMessage(message ?? 'Sessão expirada. Redirecionando para login...');
      setData(null);
      setEventOptions([]);
      setTicketTypeOptions([]);
      setError(null);
      setIsLoading(true);
      setIsRedirecting((prev) => {
        if (!prev) {
          router.push('/login?redirect=/admin/participantes');
        }
        
return true;
      });
    },
    [router]
  );

  useEffect(() => {
    if (isTokenRedirecting && !isRedirecting) {
      handleUnauthorized(tokenError ?? undefined);
    }
  }, [handleUnauthorized, isRedirecting, isTokenRedirecting, tokenError]);

  // Load filter options on mount
  useEffect(() => {
    if (!token) return;

    async function loadFilterOptions() {
      try {
        const response = await fetch('/api/admin/participantes/filter-options', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          handleUnauthorized();
          
return;
        }

        if (response.ok) {
          const options = await response.json();
          setEventOptions(options.events || []);
          setTicketTypeOptions(options.ticketTypes || []);
        }
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    }

    loadFilterOptions();
  }, [handleUnauthorized, token]);

  // Load participants data
  useEffect(() => {
    if (!token) {
      if (tokenError && !isTokenRedirecting && !isRedirecting) {
        setError(tokenError);
        setIsLoading(false);
      }

      return;
    }

    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setError(null);
      let keepLoading = false;

      try {
        // Parse filters from key
        const parsedFilters = JSON.parse(filtersKey) as Filters;

        // Build query params
        const params = new URLSearchParams({
          page: currentPage.toString(),
        });

        if (parsedFilters.search) params.set('search', parsedFilters.search);
        if (parsedFilters.eventIds.length > 0) params.set('eventIds', parsedFilters.eventIds.join(','));
        if (parsedFilters.ticketTypeIds.length > 0) params.set('ticketTypeIds', parsedFilters.ticketTypeIds.join(','));
        if (parsedFilters.registrationStatus.length > 0)
          params.set('registrationStatus', parsedFilters.registrationStatus.join(','));
        if (parsedFilters.paymentStatus.length > 0) params.set('paymentStatus', parsedFilters.paymentStatus.join(','));
        if (parsedFilters.hasCheckedIn !== null) params.set('hasCheckedIn', parsedFilters.hasCheckedIn.toString());

        const response = await fetch(`/api/admin/participantes?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          if (!cancelled) {
            keepLoading = true;
            handleUnauthorized();
          }
          
return;
        }

        if (cancelled) return;

        const json = await response.json();

        if (json.error) {
          setError(json.error);
        } else {
          setData(json);
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading participants:', error);
        setError('Erro ao carregar participantes');
      } finally {
        if (!cancelled && !keepLoading) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [currentPage, filtersKey, handleUnauthorized, isRedirecting, isTokenRedirecting, token, tokenError, refreshTrigger]);

  const handleFilterChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
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
        } else if (filterType === 'ticketTypeIds' && value) {
          newFilters.ticketTypeIds = newFilters.ticketTypeIds.filter((id) => id !== value);
        } else if (filterType === 'registrationStatus' && value) {
          newFilters.registrationStatus = newFilters.registrationStatus.filter((s) => s !== value);
        } else if (filterType === 'paymentStatus' && value) {
          newFilters.paymentStatus = newFilters.paymentStatus.filter((s) => s !== value);
        } else if (filterType === 'hasCheckedIn') {
          newFilters.hasCheckedIn = null;
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
      ticketTypeIds: [],
      registrationStatus: [],
      paymentStatus: [],
      hasCheckedIn: null,
      checkInDateRange: { start: null, end: null },
    });
    setCurrentPage(1);
  }, []);

  const handleDataRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  if (isRedirecting) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="size-6 animate-spin text-gray-500 dark:text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {redirectMessage ?? 'Redirecionando para o login...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gerenciar Participantes
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Visualize e gerencie todos os participantes dos seus eventos
          </p>
        </div>
      </div>

      {/* Metrics */}
      <MetricsCards metrics={data?.metrics || null} isLoading={isLoading && currentPage === 1} />

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
            <div className="flex gap-2">
              <ExportButton filters={filters} disabled={isLoading} />
              <ParticipantFilters
                filters={filters}
                onChange={handleFilterChange}
                eventOptions={eventOptions}
                ticketTypeOptions={ticketTypeOptions}
              />
            </div>
          </div>

          {/* Active Filter Badges */}
          <ActiveFilterBadges
            filters={filters}
            eventOptions={eventOptions}
            ticketTypeOptions={ticketTypeOptions}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={handleClearAllFilters}
          />
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <ParticipantsTable
            data={data?.data || []}
            isLoading={isLoading}
            pageCount={data?.meta?.pageCount || 1}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onDataRefresh={handleDataRefresh}
          />
        </div>
      )}
    </div>
  );
}
