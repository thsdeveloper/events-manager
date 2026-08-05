'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { TicketFormData } from '../../_lib/types';

interface PricingStepProps {
  formData: Partial<TicketFormData>;
  onChange: (data: Partial<TicketFormData>) => void;
  serviceFeePercentage: number;
}

export function PricingStep({ formData, onChange, serviceFeePercentage }: PricingStepProps) {
  const price = formData.price || 0;
  const serviceFee = price * serviceFeePercentage;
  const organizerReceives =
    formData.service_fee_type === 'absorbed' ? price - serviceFee : price;
  const buyerPays =
    formData.service_fee_type === 'absorbed' ? price : price + serviceFee;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">💰 Preços e Taxas</h3>
      </div>

      {/* Preço Base */}
      <div className="space-y-2">
        <Label htmlFor="price">
          Preço do ingresso <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            R$
          </span>
          <Input
            id="price"
            type="number"
            placeholder="0,00"
            value={formData.price || ''}
            onChange={(e) => onChange({ price: parseFloat(e.target.value) || 0 })}
            className="pl-12"
            min="0"
            step="0.01"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Valor que você deseja receber por ingresso
        </p>
      </div>

      {/* Taxa de Serviço */}
      <div className="space-y-3">
        <Label>
          Como será cobrada a taxa de serviço? <span className="text-red-500">*</span>
        </Label>
        <RadioGroup
          value={formData.service_fee_type}
          onValueChange={(value: any) => onChange({ service_fee_type: value })}
        >
          <div className="flex items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent">
            <RadioGroupItem value="absorbed" id="fee-absorbed" className="mt-1" />
            <div className="flex-1">
              <label
                htmlFor="fee-absorbed"
                className="cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                💼 Absorvo a taxa
              </label>
              <p className="text-sm text-muted-foreground mt-1">
                Você paga a taxa (comprador paga apenas o preço base)
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-accent">
            <RadioGroupItem value="passed_to_buyer" id="fee-passed" className="mt-1" />
            <div className="flex-1">
              <label
                htmlFor="fee-passed"
                className="cursor-pointer font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                👤 Repassar para o comprador
              </label>
              <p className="text-sm text-muted-foreground mt-1">
                Comprador paga preço + taxa
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Simulação de Valores */}
      {price > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📊 Simulação de Valores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Preço base:</span>
              <span className="font-medium">{formatCurrency(price)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Taxa de serviço ({(serviceFeePercentage * 100).toFixed(0)}%):
              </span>
              <span className="font-medium">{formatCurrency(serviceFee)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold">Você recebe:</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(organizerReceives)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Comprador paga:</span>
              <span className="font-semibold text-primary">{formatCurrency(buyerPays)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parcelamento Pix */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="allow-installments">Permitir parcelamento via Pix</Label>
            <p className="text-sm text-muted-foreground">
              Compradores poderão parcelar sem juros
            </p>
          </div>
          <Switch
            id="allow-installments"
            checked={formData.allow_installments}
            onCheckedChange={(checked) => onChange({ allow_installments: checked })}
          />
        </div>

        {formData.allow_installments && (
          <div className="space-y-4 pl-4 border-l-2 border-primary/20">
            <div className="space-y-2">
              <Label htmlFor="max-installments">Até quantas parcelas?</Label>
              <Input
                id="max-installments"
                type="number"
                placeholder="4"
                value={formData.max_installments || ''}
                onChange={(e) =>
                  onChange({ max_installments: parseInt(e.target.value) || 4 })
                }
                min="2"
                max="12"
              />
              <p className="text-sm text-muted-foreground">Mínimo: 2 | Máximo: 12</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-amount">Valor mínimo para permitir parcelamento</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="min-amount"
                  type="number"
                  placeholder="50,00"
                  value={formData.min_amount_for_installments || ''}
                  onChange={(e) =>
                    onChange({
                      min_amount_for_installments: parseFloat(e.target.value) || 50,
                    })
                  }
                  className="pl-12"
                  min="0"
                  step="0.01"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Ingressos abaixo deste valor não poderão ser parcelados
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
