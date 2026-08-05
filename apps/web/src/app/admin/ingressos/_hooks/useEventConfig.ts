import { useState, useEffect, useMemo, useCallback } from 'react';
import type { EventConfigurations as EventConfiguration } from '@events-manager/contracts';
import type { FeeConfig } from '@/lib/fees';

interface UseEventConfigReturn {
  config: EventConfiguration | null;
  feeConfig: FeeConfig;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook para buscar e gerenciar configurações de evento pela API
 * Converte automaticamente as configurações para o formato esperado pelos cálculos de taxas
 */
export function useEventConfig(): UseEventConfigReturn {
  const [config, setConfig] = useState<EventConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/event-configurations');

      if (!response.ok) {
        throw new Error('Falha ao buscar configurações de evento');
      }

      const data: EventConfiguration = await response.json();
      setConfig(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao buscar configurações';
      setError(errorMessage);
      console.error('Erro ao buscar configurações de evento:', err);

      // Definir configuração padrão em caso de erro
      setConfig({
        id: 0,
        allow_free_events: true,
        max_tickets_per_event: null,
        ticket_code_prefix: 'TKT',
        registration_confirmation_email: true,
        platform_fee_percentage: 5,
        payment_gateway: 'abacatepay',
        card_fee_percentage: 3.5,
        card_fee_fixed: 0.6,
        card_installment_2_6_percentage: 4,
        card_installment_7_12_percentage: 4.5,
        pix_fee_fixed: 0.8,
        boleto_fee_fixed: 2.5,
        payout_fee_fixed: 0.8,
        minimum_payout: 3.5,
        payouts_enabled: false,
        convenience_fee_calculation_method: 'buyer_pays',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  // Converter configuração para o formato FeeConfig usado pelos cálculos
  const feeConfig: FeeConfig = useMemo(
    () => ({
      platformFeePercentage: config?.platform_fee_percentage ?? 5,
      providerPercentageFee: config?.card_fee_percentage ?? 3.5,
      providerFixedFee: config?.card_fee_fixed ?? 0.6,
    }),
    [config?.platform_fee_percentage, config?.card_fee_percentage, config?.card_fee_fixed],
  );

  return {
    config,
    feeConfig,
    isLoading,
    error,
    refetch: fetchConfig,
  };
}
