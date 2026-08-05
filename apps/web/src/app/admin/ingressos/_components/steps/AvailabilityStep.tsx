'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { TicketFormData } from '../../_lib/types';

interface AvailabilityStepProps {
  formData: Partial<TicketFormData>;
  onChange: (data: Partial<TicketFormData>) => void;
  quantitySold: number;
}

export function AvailabilityStep({
  formData,
  onChange,
  quantitySold,
}: AvailabilityStepProps) {
  const quantity = formData.quantity || 0;
  const available = quantity - quantitySold;
  const soldPercentage = quantity > 0 ? (quantitySold / quantity) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">📦 Disponibilidade</h3>
      </div>

      {/* Quantidade Total */}
      <div className="space-y-2">
        <Label htmlFor="quantity">
          Quantos ingressos deseja vender? <span className="text-red-500">*</span>
        </Label>
        <Input
          id="quantity"
          type="number"
          placeholder="100"
          value={formData.quantity || ''}
          onChange={(e) => onChange({ quantity: parseInt(e.target.value) || 0 })}
          min={quantitySold}
        />
        <p className="text-sm text-muted-foreground">
          Total de ingressos disponíveis para venda
        </p>
        {quantitySold > 0 && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            ⚠️ Já foram vendidos {quantitySold} ingressos. A quantidade total deve ser maior ou
            igual a este valor.
          </p>
        )}
      </div>

      {/* Quantidade Mínima por Compra */}
      <div className="space-y-2">
        <Label htmlFor="min-quantity">Mínimo por compra (opcional)</Label>
        <Input
          id="min-quantity"
          type="number"
          placeholder="1"
          value={formData.min_quantity_per_purchase || ''}
          onChange={(e) =>
            onChange({ min_quantity_per_purchase: parseInt(e.target.value) || null })
          }
          min="1"
        />
        <p className="text-sm text-muted-foreground">
          Deixe em branco para sem limite mínimo
        </p>
      </div>

      {/* Quantidade Máxima por Compra */}
      <div className="space-y-2">
        <Label htmlFor="max-quantity">Máximo por compra (opcional)</Label>
        <Input
          id="max-quantity"
          type="number"
          placeholder="10"
          value={formData.max_quantity_per_purchase || ''}
          onChange={(e) =>
            onChange({ max_quantity_per_purchase: parseInt(e.target.value) || null })
          }
          min="1"
        />
        <p className="text-sm text-muted-foreground">
          Deixe em branco para sem limite máximo
        </p>
      </div>

      {/* Resumo de Disponibilidade */}
      {quantity > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📊 Resumo de Disponibilidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium">{quantity} ingressos</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vendidos:</span>
                <span className="font-medium">{quantitySold} ingressos</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Disponíveis:</span>
                <span className="font-medium text-green-600">{available} ingressos</span>
              </div>
            </div>
            <div className="space-y-2">
              <Progress value={soldPercentage} className="h-2" />
              <div className="text-center text-sm text-muted-foreground">
                {soldPercentage.toFixed(0)}% vendidos
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validação de Limites */}
      {formData.min_quantity_per_purchase &&
        formData.max_quantity_per_purchase &&
        formData.min_quantity_per_purchase > formData.max_quantity_per_purchase && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
            <p className="font-medium">⚠️ Atenção</p>
            <p className="text-sm mt-1">
              A quantidade máxima deve ser maior ou igual à quantidade mínima
            </p>
          </div>
        )}
    </div>
  );
}
