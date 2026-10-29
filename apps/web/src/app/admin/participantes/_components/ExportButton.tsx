'use client';

import { useState } from 'react';
import { Download } from '@/components/animate-ui/icons/download';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { ParticipantFilters } from '../_lib/types';

interface ExportButtonProps {
	filters: ParticipantFilters;
	disabled?: boolean;
}

export function ExportButton({ filters, disabled }: ExportButtonProps) {
	const [isExporting, setIsExporting] = useState(false);
	const { toast } = useToast();

	const handleExport = async () => {
		setIsExporting(true);

		try {
			// Build query params
			const params = new URLSearchParams();

			if (filters.search) params.set('search', filters.search);
			if (filters.eventIds.length > 0) params.set('eventIds', filters.eventIds.join(','));
			if (filters.ticketTypeIds.length > 0) params.set('ticketTypeIds', filters.ticketTypeIds.join(','));
			if (filters.registrationStatus.length > 0) params.set('registrationStatus', filters.registrationStatus.join(','));
			if (filters.paymentStatus.length > 0) params.set('paymentStatus', filters.paymentStatus.join(','));
			if (filters.hasCheckedIn !== null) params.set('hasCheckedIn', filters.hasCheckedIn.toString());
			if (filters.checkInDateRange.start) params.set('checkInDateStart', filters.checkInDateRange.start);
			if (filters.checkInDateRange.end) params.set('checkInDateEnd', filters.checkInDateRange.end);

			// Fetch data
			const response = await fetch(`/api/admin/participantes/export?${params.toString()}`, {
				credentials: 'include',
			});

			if (!response.ok) {
				const problem = await response.json().catch(() => null);
				throw new Error(problem?.detail || 'Erro ao exportar dados');
			}

			// A API monta o CSV, uma linha por ingresso nominal; aqui só baixamos.
			const csv = await response.text();
			const rows = csv.split('\n').length - 1;
			if (rows <= 0) {
				toast({
					title: 'Nenhum dado para exportar',
					description: 'Não há ingressos com os filtros aplicados',
					variant: 'destructive',
				});

				return;
			}

			downloadFile(csv, `participantes_${new Date().toISOString().slice(0, 10)}.csv`);

			toast({
				title: 'Exportação iniciada',
				description: `${rows} ingresso${rows > 1 ? 's' : ''} exportado${rows > 1 ? 's' : ''} com sucesso`,
				variant: 'success',
			});
		} catch (error) {
			toast({
				title: 'Erro ao exportar',
				description: error instanceof Error ? error.message : 'Não foi possível exportar os dados',
				variant: 'destructive',
			});
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleExport}
			loading={isExporting}
			disabled={disabled}
			className="gap-2"
		>
			<Download className="size-4" animateOnHover />
			Exportar CSV
		</Button>
	);
}

function downloadFile(content: string, filename: string) {
	const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.style.visibility = 'hidden';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
