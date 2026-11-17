'use client';

import { PageHeader } from '@/components/design-system/molecules/PageHeader';

import { Spinner } from '@/components/ui/spinner';
import { Card } from '@/components/ui/card';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ParticipantsRequestError, useParticipants } from './_lib/useParticipants';
import { ParticipantsTable } from './_components/ParticipantsTable';
import { MetricsCards } from './_components/MetricsCards';
import { ParticipantFilters } from './_components/ParticipantFilters';
import { ActiveFilterBadges } from './_components/ActiveFilterBadges';
import { ExportButton } from './_components/ExportButton';
import type { ParticipantFilters as Filters } from './_lib/types';

export default function ParticipantesPage() {
	const [currentPage, setCurrentPage] = useState(1);
	const [isRedirecting, setIsRedirecting] = useState(false);
	const [redirectMessage, setRedirectMessage] = useState<string | null>(null);

	const router = useRouter();
	const searchParams = useSearchParams();
	const initialEventId = searchParams.get('eventId');

	// Filters
	const [filters, setFilters] = useState<Filters>({
		search: '',
		eventIds: initialEventId ? [initialEventId] : [],
		ticketTypeIds: [],
		registrationStatus: [],
		paymentStatus: [],
		hasCheckedIn: null,
		checkInDateRange: { start: null, end: null },
	});

	const { participants, options, refresh } = useParticipants(filters, currentPage);
	const data = participants.data;
	const isLoading = participants.isPending;
	const requestError = participants.error ?? options.error;
	const error = requestError?.message ?? null;
	const eventOptions = options.data?.events ?? [];
	const ticketTypeOptions = options.data?.ticketTypes ?? [];
	useEffect(() => {
		if (requestError instanceof ParticipantsRequestError && requestError.status === 401) {
			setIsRedirecting(true);
			setRedirectMessage('Sessão expirada. Redirecionando para login...');
			router.push('/login?redirect=/admin/participantes');
		}
	}, [requestError, router]);

	const handleFilterChange = useCallback((newFilters: Filters) => {
		setFilters(newFilters);
		setCurrentPage(1); // Reset to first page when filters change
	}, []);

	const handleRemoveFilter = useCallback((filterType: string, value?: string) => {
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
	}, []);

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

	const handleDataRefresh = () => {
		void refresh();
	};

	if (isRedirecting) {
		return (
			<div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
				<Spinner className="size-6 animate-spin text-muted-foreground dark:text-muted-foreground" />
				<p className="text-sm text-muted-foreground">{redirectMessage ?? 'Redirecionando para o login...'}</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<PageHeader
				title="Gerenciar Participantes"
				description={<> Um ingresso por pessoa: veja quem vai, quem comprou e faça o check-in de cada um </>}
			/>

			{/* Metrics */}
			<MetricsCards metrics={data?.metrics || null} isLoading={isLoading && currentPage === 1} />

			{/* Error State */}
			{error && (
				<Card className="p-4 text-destructive ">
					<p className="font-medium">Erro ao carregar dados</p>
					<p className="text-sm">{error}</p>
				</Card>
			)}

			{/* Filters and Search */}
			{!error && (
				<div className="space-y-4">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
				<Card className="p-6" aria-busy={participants.isFetching}>
					{participants.isFetching && !isLoading && (
						<p role="status" className="mb-3 text-sm text-muted-foreground">
							Atualizando participantes…
						</p>
					)}
					<ParticipantsTable
						data={data?.data || []}
						isLoading={isLoading}
						pageCount={data?.meta?.pageCount || 1}
						currentPage={currentPage}
						onPageChange={setCurrentPage}
						onDataRefresh={handleDataRefresh}
					/>
				</Card>
			)}
		</div>
	);
}
