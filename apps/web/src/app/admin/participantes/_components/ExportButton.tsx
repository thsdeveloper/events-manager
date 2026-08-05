'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthToken } from '../_hooks/useAuthToken';
import { downloadCSV } from '../_lib/export';
import type { ParticipantFilters, ParticipantRow } from '../_lib/types';

interface ExportButtonProps {
  filters: ParticipantFilters;
  disabled?: boolean;
}

export function ExportButton({ filters, disabled }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { token } = useAuthToken();
  const { toast } = useToast();

  const handleExport = async () => {
    if (!token) {
      toast({
        title: 'Erro de autenticação',
        description: 'Você precisa estar autenticado para exportar',
        variant: 'destructive',
      });
      
return;
    }

    setIsExporting(true);

    try {
      // Build query params
      const params = new URLSearchParams();

      if (filters.search) params.set('search', filters.search);
      if (filters.eventIds.length > 0) params.set('eventIds', filters.eventIds.join(','));
      if (filters.ticketTypeIds.length > 0) params.set('ticketTypeIds', filters.ticketTypeIds.join(','));
      if (filters.registrationStatus.length > 0)
        params.set('registrationStatus', filters.registrationStatus.join(','));
      if (filters.paymentStatus.length > 0) params.set('paymentStatus', filters.paymentStatus.join(','));
      if (filters.hasCheckedIn !== null) params.set('hasCheckedIn', filters.hasCheckedIn.toString());
      if (filters.checkInDateRange.start) params.set('checkInDateStart', filters.checkInDateRange.start);
      if (filters.checkInDateRange.end) params.set('checkInDateEnd', filters.checkInDateRange.end);

      // Fetch data
      const response = await fetch(`/api/admin/participantes/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Erro ao exportar dados');
      }

      const data = json.data as ParticipantRow[];

      if (data.length === 0) {
        toast({
          title: 'Nenhum dado para exportar',
          description: 'Não há participantes com os filtros aplicados',
          variant: 'destructive',
        });
        
return;
      }

      // Download CSV
      downloadCSV(data);

      toast({
        title: 'Exportação iniciada',
        description: `${data.length} participante${data.length > 1 ? 's' : ''} exportado${data.length > 1 ? 's' : ''} com sucesso`,
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Error exporting participants:', error);
      toast({
        title: 'Erro ao exportar',
        description: error.message || 'Não foi possível exportar os dados',
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
      disabled={disabled || isExporting}
      className="gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Exportando...
        </>
      ) : (
        <>
          <Download className="size-4" />
          Exportar CSV
        </>
      )}
    </Button>
  );
}
