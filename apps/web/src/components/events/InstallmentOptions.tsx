'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InstallmentOption {
  installments: number;
  installment_amount: number;
  first_installment_amount?: number;
  total_amount: number;
}

interface InstallmentOptionsProps {
  totalAmount: number;
  maxInstallments: number;
  minAmountForInstallments: number;
  allowInstallments: boolean;
  selectedInstallments: number | null;
  onInstallmentChange: (installments: number | null) => void;
}

export default function InstallmentOptions({
  totalAmount,
  maxInstallments,
  minAmountForInstallments,
  allowInstallments,
  selectedInstallments,
  onInstallmentChange,
}: InstallmentOptionsProps) {
  // Verificar se valor atinge mínimo para parcelamento
  const canInstall = allowInstallments && totalAmount >= minAmountForInstallments;

  if (!allowInstallments) {
    return null;
  }

  if (!canInstall) {
    return (
      <Alert>
        <Info className="size-4" />
        <AlertDescription>
          Parcelamento disponível para compras acima de R$ {minAmountForInstallments.toFixed(2)}
        </AlertDescription>
      </Alert>
    );
  }

  // Calcular opções de parcelamento
  const installmentOptions: InstallmentOption[] = [];

  // Adicionar opção à vista
  installmentOptions.push({
    installments: 1,
    installment_amount: totalAmount,
    total_amount: totalAmount,
  });

  // Calcular parcelamentos de 2 até maxInstallments
  for (let i = 2; i <= maxInstallments; i++) {
    const installmentAmount = Number((totalAmount / i).toFixed(2));
    const firstInstallmentAmount = Number(
      (totalAmount - installmentAmount * (i - 1)).toFixed(2)
    );

    installmentOptions.push({
      installments: i,
      installment_amount: installmentAmount,
      first_installment_amount:
        firstInstallmentAmount !== installmentAmount ? firstInstallmentAmount : undefined,
      total_amount: totalAmount,
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Forma de Pagamento</h3>
        <p className="text-sm text-muted-foreground">Escolha como deseja pagar via Pix</p>
      </div>

      <RadioGroup
        value={selectedInstallments?.toString() || '1'}
        onValueChange={(value) => onInstallmentChange(parseInt(value, 10))}
      >
        {installmentOptions.map((option) => (
          <div
            key={option.installments}
            className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent cursor-pointer transition-colors"
            onClick={() => onInstallmentChange(option.installments)}
          >
            <RadioGroupItem value={option.installments.toString()} id={`installment-${option.installments}`} />
            <Label
              htmlFor={`installment-${option.installments}`}
              className="flex-1 cursor-pointer"
            >
              {option.installments === 1 ? (
                <div className="space-y-1">
                  <div className="font-semibold">À vista - Pix</div>
                  <div className="text-sm text-muted-foreground">
                    R$ {option.total_amount.toFixed(2)}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="font-semibold">
                    {option.installments}x de R$ {option.installment_amount.toFixed(2)}
                  </div>
                  {option.first_installment_amount && (
                    <div className="text-xs text-muted-foreground">
                      1ª parcela: R$ {option.first_installment_amount.toFixed(2)}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    Total: R$ {option.total_amount.toFixed(2)} (via Pix)
                  </div>
                </div>
              )}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {selectedInstallments && selectedInstallments > 1 && (
        <Alert>
          <Info className="size-4" />
          <AlertDescription className="text-sm">
            Você pagará a primeira parcela agora via Pix. As demais parcelas vencerão mensalmente
            e você receberá lembretes por e-mail.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
