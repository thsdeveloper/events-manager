/**
 * Funções utilitárias para cálculo de taxas de ingressos
 *
 * A taxa de serviço da plataforma pode ser repassada ao comprador. A tarifa do
 * gateway varia conforme o método escolhido no checkout e é exibida aqui como
 * estimativa de cartão à vista; o valor efetivo vem do webhook do AbacatePay.
 */

export interface FeeConfig {
  platformFeePercentage: number; // Taxa da plataforma (ex: 5 = 5%)
  providerPercentageFee: number;
  providerFixedFee: number;
}

export interface FeeCalculation {
  ticketPrice: number;           // Preço base do ingresso
  convenienceFee: number;        // Taxa de conveniência
  buyerPrice: number;            // Total pago pelo comprador
  providerFee: number;             // Estimativa da tarifa do gateway
  platformFee: number;           // Taxa da plataforma
  organizerReceives: number;     // Valor que o organizador recebe
}

/**
 * Calcula a taxa de conveniência que deve ser cobrada do comprador
 * A taxa de conveniência é a taxa da plataforma repassada ao comprador.
 */
export function calculateConvenienceFee(
  ticketPrice: number,
  config: FeeConfig
): number {
  return Math.round(ticketPrice * (config.platformFeePercentage / 100) * 100) / 100;
}

/**
 * Calcula todas as taxas e valores envolvidos na transação
 */
export function calculateFees(
  ticketPrice: number,
  serviceFeeType: 'passed_to_buyer' | 'absorbed',
  config: FeeConfig
): FeeCalculation {
  const { platformFeePercentage, providerPercentageFee, providerFixedFee } = config;

  let convenienceFee = 0;
  let buyerPrice = ticketPrice;
  let providerFee = 0;
  let platformFee = 0;
  let organizerReceives = 0;

  if (serviceFeeType === 'passed_to_buyer') {
    // Comprador paga a taxa de conveniência
    convenienceFee = calculateConvenienceFee(ticketPrice, config);
    buyerPrice = ticketPrice + convenienceFee;

    // Estimativa da tarifa de cartão à vista do gateway
    providerFee = (buyerPrice * providerPercentageFee / 100) + providerFixedFee;

    // Taxa da plataforma sobre o preço base
    platformFee = ticketPrice * platformFeePercentage / 100;

    // O comprador já cobriu a taxa da plataforma.
    organizerReceives = ticketPrice - providerFee;
  } else {
    // Organizador absorve todas as taxas
    buyerPrice = ticketPrice;

    // Estimativa da tarifa de cartão à vista do gateway
    providerFee = (buyerPrice * providerPercentageFee / 100) + providerFixedFee;

    // Taxa da plataforma sobre o preço base
    platformFee = ticketPrice * platformFeePercentage / 100;

    // Organizador recebe o valor menos todas as taxas
    organizerReceives = buyerPrice - providerFee - platformFee;
  }

  return {
    ticketPrice: Math.round(ticketPrice * 100) / 100,
    convenienceFee: Math.round(convenienceFee * 100) / 100,
    buyerPrice: Math.round(buyerPrice * 100) / 100,
    providerFee: Math.round(providerFee * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
    organizerReceives: Math.round(organizerReceives * 100) / 100,
  };
}

/**
 * Calcula o buyer_price (preço final para o comprador)
 */
export function calculateBuyerPrice(
  ticketPrice: number,
  serviceFeeType: 'passed_to_buyer' | 'absorbed',
  config: FeeConfig
): number {
  if (serviceFeeType === 'passed_to_buyer') {
    const convenienceFee = calculateConvenienceFee(ticketPrice, config);
    
return Math.round((ticketPrice + convenienceFee) * 100) / 100;
  }
  
return Math.round(ticketPrice * 100) / 100;
}

/**
 * Formata valores monetários para exibição
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calcula a porcentagem que a taxa de conveniência representa sobre o preço base
 */
export function calculateConvenienceFeePercentage(
  ticketPrice: number,
  config: FeeConfig
): number {
  const convenienceFee = calculateConvenienceFee(ticketPrice, config);
  
return Math.round((convenienceFee / ticketPrice) * 10000) / 100; // Arredondar para 2 casas decimais
}
