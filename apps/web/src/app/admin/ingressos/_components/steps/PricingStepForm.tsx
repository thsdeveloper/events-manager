'use client';

import { memo, useMemo } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { DollarSign, Briefcase, User, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { calculateFees, calculateConvenienceFeePercentage, formatCurrency, type FeeConfig } from '@/lib/fees';
import type { TicketFormData } from '../../_lib/schemas';
import type { EventConfigurations as EventConfiguration } from '@events-manager/contracts';
import { FeeExplanationDialog } from '../FeeExplanationDialog';

interface PricingStepFormProps {
  form: UseFormReturn<TicketFormData>;
  feeConfig: FeeConfig;
  eventConfig: EventConfiguration | null;
}

export const PricingStepForm = memo(function PricingStepForm({ form, feeConfig, eventConfig }: PricingStepFormProps) {
  const priceValue = useWatch({ control: form.control, name: 'price' });
  const serviceFeeType = useWatch({ control: form.control, name: 'service_fee_type' });
  const allowInstallments = useWatch({ control: form.control, name: 'allow_installments' });

  const price = typeof priceValue === 'number' ? priceValue : 0;
  const resolvedServiceFeeType: 'absorbed' | 'passed_to_buyer' = serviceFeeType ?? 'passed_to_buyer';

  const fees = useMemo(
    () => (price > 0 ? calculateFees(price, resolvedServiceFeeType, feeConfig) : null),
    [price, resolvedServiceFeeType, feeConfig],
  );

  const convenienceFeePercentage = useMemo(
    () => (price > 0 ? calculateConvenienceFeePercentage(price, feeConfig) : 0),
    [price, feeConfig],
  );

  // Método de cálculo padrão da plataforma
  const defaultCalculationMethod = eventConfig?.convenience_fee_calculation_method || 'buyer_pays';
  const recommendedOption = defaultCalculationMethod === 'buyer_pays' ? 'passed_to_buyer' : 'absorbed';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b pb-4">
        <DollarSign className="size-5 text-primary" />
        <h3 className="text-lg font-semibold">Preços e Taxas</h3>
      </div>

      {/* Preço Base */}
      <FormField
        control={form.control}
        name="price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Preço do ingresso <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  type="number"
                  placeholder="0,00"
                  className="pl-12"
                  min="0"
                  step="0.01"
                  onChange={(e) => {
                    const value = e.target.value;
                    const numValue = value === '' ? undefined : parseFloat(value);
                    const finalValue = numValue === undefined || isNaN(numValue) ? undefined : numValue;
                    console.log('[PricingStepForm] Price input change:', { value, numValue, finalValue });
                    field.onChange(finalValue);
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  value={field.value ?? ''}
                />
              </div>
            </FormControl>
            <FormDescription>
              Valor que você deseja receber por ingresso
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Taxa de Serviço */}
      <FormField
        control={form.control}
        name="service_fee_type"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <div className="flex items-center gap-2">
              <FormLabel>
                Como será cobrada a taxa de conveniência? <span className="text-destructive">*</span>
              </FormLabel>
              <FeeExplanationDialog
                price={price}
                serviceFeeType={field.value ?? 'passed_to_buyer'}
                feeConfig={feeConfig}
              />
            </div>

            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                <strong>Recomendação da plataforma:</strong>{' '}
                {defaultCalculationMethod === 'buyer_pays'
                  ? 'No modelo "Comprador paga", o organizador recebe quase o valor total do ingresso.'
                  : 'No modelo "Organizador absorve", o comprador paga apenas o valor do ingresso.'}
              </AlertDescription>
            </Alert>

            <FormControl>
              <RadioGroup onValueChange={field.onChange} value={field.value ?? 'passed_to_buyer'} className="space-y-3">
                <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${
                  field.value === 'passed_to_buyer'
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}>
                  <RadioGroupItem value="passed_to_buyer" id="fee-passed" className="mt-1" />
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      <User className="size-4 text-primary" />
                      Comprador paga a taxa
                      {recommendedOption === 'passed_to_buyer' && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full">
                          Recomendado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Você recebe quase o valor total. A taxa de conveniência (~{convenienceFeePercentage.toFixed(2)}%) é cobrada do comprador
                    </p>
                    {fees && resolvedServiceFeeType === 'passed_to_buyer' && (
                      <div className="mt-3 p-3 bg-background rounded-lg border">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ingresso:</span>
                            <span className="font-medium">{formatCurrency(fees.ticketPrice)}</span>
                          </div>
                          <div className="flex justify-between text-primary">
                            <span>Taxa de conveniência:</span>
                            <span className="font-medium">{formatCurrency(fees.convenienceFee)}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between">
                            <span className="font-semibold">Comprador paga:</span>
                            <span className="font-bold text-lg">{formatCurrency(fees.buyerPrice)}</span>
                          </div>
                          <Separator />
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Taxa AbacatePay ({feeConfig.providerPercentageFee}% de {formatCurrency(fees.buyerPrice)} + {formatCurrency(feeConfig.providerFixedFee)}):</span>
                              <span>-{formatCurrency(fees.providerFee)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Taxa Plataforma ({feeConfig.platformFeePercentage}% de {formatCurrency(fees.ticketPrice)}):</span>
                              <span>-{formatCurrency(fees.platformFee)}</span>
                            </div>
                          </div>
                          <Separator />
                          <div className="flex justify-between">
                            <span className="font-semibold text-green-600 dark:text-green-400">Você recebe:</span>
                            <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(fees.organizerReceives)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${
                  field.value === 'absorbed'
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-border'
                }`}>
                  <RadioGroupItem value="absorbed" id="fee-absorbed" className="mt-1" />
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      <Briefcase className="size-4 text-primary" />
                      Organizador absorve as taxas
                      {recommendedOption === 'absorbed' && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full">
                          Recomendado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Você absorve todas as taxas. O comprador paga apenas o valor do ingresso
                    </p>
                    {fees && resolvedServiceFeeType === 'absorbed' && (
                      <div className="mt-3 p-3 bg-background rounded-lg border">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="font-semibold">Comprador paga:</span>
                            <span className="font-bold text-lg">{formatCurrency(fees.buyerPrice)}</span>
                          </div>
                          <Separator />
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Taxa AbacatePay ({feeConfig.providerPercentageFee}% de {formatCurrency(fees.buyerPrice)} + {formatCurrency(feeConfig.providerFixedFee)}):</span>
                              <span>-{formatCurrency(fees.providerFee)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Taxa Plataforma ({feeConfig.platformFeePercentage}% de {formatCurrency(fees.ticketPrice)}):</span>
                              <span>-{formatCurrency(fees.platformFee)}</span>
                            </div>
                          </div>
                          <Separator />
                          <div className="flex justify-between">
                            <span className="font-semibold text-yellow-600 dark:text-yellow-400">Você recebe:</span>
                            <span className="font-bold text-yellow-600 dark:text-yellow-400">{formatCurrency(fees.organizerReceives)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />


      {/* Parcelamento Pix */}
      <div className="space-y-4 pt-4 border-t">
        <FormField
          control={form.control}
          name="allow_installments"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Permitir parcelamento via Pix</FormLabel>
                <FormDescription>
                  Compradores poderão parcelar sem juros
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {allowInstallments && (
          <div className="space-y-4 pl-4 border-l-2 border-primary/20">
            <FormField
              control={form.control}
              name="max_installments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Até quantas parcelas?</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="4"
                      min="2"
                      max="12"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 4)}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription>Mínimo: 2 | Máximo: 12</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="min_amount_for_installments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor mínimo para permitir parcelamento</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        R$
                      </span>
                      <Input
                        type="number"
                        placeholder="50,00"
                        className="pl-12"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 50)}
                        value={field.value || ''}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Ingressos abaixo deste valor não poderão ser parcelados
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
});

PricingStepForm.displayName = 'PricingStepForm';
