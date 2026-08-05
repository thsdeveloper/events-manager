'use client';

import { memo, useMemo } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { Package, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { TicketFormData } from '../../_lib/schemas';

interface AvailabilityStepFormProps {
  form: UseFormReturn<TicketFormData>;
  quantitySold: number;
}

export const AvailabilityStepForm = memo(function AvailabilityStepForm({ form, quantitySold }: AvailabilityStepFormProps) {
  const quantityValue = useWatch({ control: form.control, name: 'quantity' });
  const quantity = typeof quantityValue === 'number' ? quantityValue : 0;

  const { available, soldPercentage } = useMemo(() => {
    if (quantity <= 0) {
      return { available: 0, soldPercentage: 0 };
    }

    const remaining = quantity - quantitySold;
    const percentage = (quantitySold / quantity) * 100;

    return {
      available: remaining,
      soldPercentage: Number.isFinite(percentage) ? percentage : 0,
    };
  }, [quantity, quantitySold]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b pb-4">
        <Package className="size-5 text-primary" />
        <h3 className="text-lg font-semibold">Disponibilidade</h3>
      </div>

      {/* Quantidade Total */}
      <FormField
        control={form.control}
        name="quantity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Quantos ingressos deseja vender? <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="100"
                min={quantitySold}
                onChange={(e) => {
                  const value = e.target.value;
                  const numValue = value === '' ? undefined : parseInt(value, 10);
                  const finalValue = numValue === undefined || isNaN(numValue) ? undefined : numValue;
                  console.log('[AvailabilityStepForm] Quantity input change:', { value, numValue, finalValue });
                  field.onChange(finalValue);
                }}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormDescription>
              Total de ingressos disponíveis para venda
            </FormDescription>
            {quantitySold > 0 && (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription>
                  Já foram vendidos {quantitySold} ingressos. A quantidade total deve ser maior ou
                  igual a este valor.
                </AlertDescription>
              </Alert>
            )}
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Quantidade Mínima por Compra */}
      <FormField
        control={form.control}
        name="min_quantity_per_purchase"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Mínimo por compra (opcional)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="1"
                min="1"
                {...field}
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value === '' ? null : parseInt(value, 10));
                }}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormDescription>
              Deixe em branco para sem limite mínimo
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Quantidade Máxima por Compra */}
      <FormField
        control={form.control}
        name="max_quantity_per_purchase"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Máximo por compra (opcional)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="10"
                min="1"
                {...field}
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value === '' ? null : parseInt(value, 10));
                }}
                value={field.value ?? ''}
              />
            </FormControl>
            <FormDescription>
              Deixe em branco para sem limite máximo
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Resumo de Disponibilidade */}
      {quantity > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4" />
              Resumo de Disponibilidade
            </CardTitle>
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
    </div>
  );
});

AvailabilityStepForm.displayName = 'AvailabilityStepForm';
