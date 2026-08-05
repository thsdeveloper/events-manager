'use client';

import { useState, useEffect, useCallback, type FormEvent, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { WizardProgressBar, type WizardStepMeta } from '@/components/shared/WizardProgressBar';
import { BasicInfoStepForm } from './steps/BasicInfoStepForm';
import { PricingStepForm } from './steps/PricingStepForm';
import { AvailabilityStepForm } from './steps/AvailabilityStepForm';
import { SalePeriodStepForm } from './steps/SalePeriodStepForm';
import {
  ticketFormSchema,
  basicInfoSchema,
  pricingSchema,
  availabilitySchema,
  salePeriodSchema,
  type TicketFormData,
} from '../_lib/schemas';
import type { EventTicket } from '../_lib/types';
import { useEventConfig } from '../_hooks/useEventConfig';
import { useAuthToken } from '../_hooks/useAuthToken';

interface TicketDrawerFormProps {
  open: boolean;
  onClose: () => void;
  ticket: EventTicket | null;
  onSaved: () => void;
  eventOptions: Array<{ id: string; title: string; start_date: string }>;
}

const STEPS: WizardStepMeta[] = [
  { id: 'basic', title: 'Básico', description: 'Informações básicas do ingresso', estimatedMinutes: 2 },
  { id: 'pricing', title: 'Preços', description: 'Preços e taxas', estimatedMinutes: 2 },
  { id: 'availability', title: 'Disponibilidade', description: 'Quantidades', estimatedMinutes: 1 },
  { id: 'period', title: 'Período', description: 'Período de vendas', estimatedMinutes: 1 },
];

const STEP_SCHEMAS = [basicInfoSchema, pricingSchema, availabilitySchema, salePeriodSchema];

export function TicketDrawerForm({ open, onClose, ticket, onSaved, eventOptions }: TicketDrawerFormProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLastStep = currentStep === STEPS.length - 1;

  // Buscar configurações de evento pela API
  const { config: eventConfig, feeConfig } = useEventConfig();

  // Token de autenticação
  const { token } = useAuthToken();

  const form = useForm<TicketFormData>({
	resolver: zodResolver(ticketFormSchema) as any,
    mode: 'onBlur',
    shouldUnregister: false, // Mantém campos mesmo quando não visíveis
    defaultValues: {
      event_id: '',
      title: '',
      description: '',
      visibility: 'public',
      status: 'active',
      price: undefined,
      service_fee_type: 'passed_to_buyer',
      allow_installments: false,
      max_installments: null,
      min_amount_for_installments: null,
      quantity: undefined,
      min_quantity_per_purchase: null,
      max_quantity_per_purchase: null,
      sale_start_date: null,
      sale_end_date: null,
    },
  });

  // Reset form when drawer opens/closes or ticket changes
  useEffect(() => {
    if (open) {
      if (ticket) {
        form.reset({
          event_id: ticket.event_id.id,
          title: ticket.title,
          description: ticket.description || '',
		  visibility: ticket.visibility ?? 'public',
		  price: ticket.price ?? 0,
		  service_fee_type: ticket.service_fee_type ?? 'passed_to_buyer',
		  allow_installments: ticket.allow_installments ?? false,
          max_installments: ticket.max_installments ?? null,
          min_amount_for_installments: ticket.min_amount_for_installments ?? null,
		  quantity: ticket.quantity ?? 1,
          min_quantity_per_purchase: ticket.min_quantity_per_purchase,
          max_quantity_per_purchase: ticket.max_quantity_per_purchase,
          sale_start_date: ticket.sale_start_date,
          sale_end_date: ticket.sale_end_date,
          status: ticket.status,
        });
      } else {
        form.reset({
          event_id: '',
          title: '',
          description: '',
          visibility: 'public',
          status: 'active',
          price: undefined,
          service_fee_type: 'passed_to_buyer',
          allow_installments: false,
          max_installments: null,
          min_amount_for_installments: null,
          quantity: undefined,
          min_quantity_per_purchase: null,
          max_quantity_per_purchase: null,
          sale_start_date: null,
          sale_end_date: null,
        });
      }
      setCurrentStep(0);
      setVisitedSteps(new Set([0]));
    }
  }, [open, ticket, form]);

  const validateCurrentStep = useCallback(async () => {
    const currentSchema = STEP_SCHEMAS[currentStep];

    if (!currentSchema) return true;

    const values = form.getValues();
    console.log('[TicketDrawerForm] Validating step', currentStep, 'with values:', values);

    const result = await currentSchema.safeParseAsync(values);

    if (!result.success) {
      console.log('[TicketDrawerForm] Validation failed:', result.error.errors);
      // Set errors for the current step fields
      result.error.errors.forEach((error) => {
        form.setError(error.path[0] as any, {
          type: 'manual',
          message: error.message,
        });
      });
      
return false;
    }

    console.log('[TicketDrawerForm] Validation passed for step', currentStep);
    
return true;
  }, [currentStep, form]);

  const onSubmit = useCallback(async (data: TicketFormData, isDraft: boolean = false) => {
    console.log('[TicketDrawerForm] onSubmit called with:', { data, isDraft, currentStep });

    // Prevenir submit se não estiver na última etapa (exceto para rascunho)
    if (!isDraft && currentStep !== STEPS.length - 1) {
      console.log('[TicketDrawerForm] Not on last step, preventing submit');
      
return;
    }

    setIsSubmitting(true);

    try {
      console.log('[TicketDrawerForm] Submit raw data:', data);
      console.log('[TicketDrawerForm] Data types:', {
        price: typeof data.price,
        quantity: typeof data.quantity,
        priceValue: data.price,
        quantityValue: data.quantity,
      });

      const normalizedPrice = typeof data.price === 'number' && Number.isFinite(data.price)
        ? data.price
        : 0;
      const normalizedQuantity = typeof data.quantity === 'number' && Number.isFinite(data.quantity)
        ? data.quantity
        : 0;

      console.log('[TicketDrawerForm] Normalized values -> price:', normalizedPrice, 'quantity:', normalizedQuantity);

      if (!isDraft && normalizedPrice < 0) {
        throw new Error('O preço não pode ser negativo');
      }
      if (!isDraft && normalizedQuantity <= 0) {
        throw new Error('A quantidade de ingressos é obrigatória');
      }

      let finalServiceFeeType: TicketFormData['service_fee_type'] = data.service_fee_type ?? 'passed_to_buyer';
      let buyer_price: number | undefined;

      if (normalizedPrice > 0) {
        const { calculateBuyerPrice } = await import('@/lib/fees');
        buyer_price = calculateBuyerPrice(normalizedPrice, finalServiceFeeType, feeConfig);
      } else {
        finalServiceFeeType = 'absorbed';
      }

      const finalData: Record<string, unknown> = {
        ...data,
        service_fee_type: finalServiceFeeType,
        status: isDraft ? 'inactive' : data.status,
      };

      finalData.price = normalizedPrice;
      finalData.quantity = normalizedQuantity;

      if (buyer_price !== undefined) {
        finalData.buyer_price = buyer_price;
      } else {
        delete finalData.buyer_price;
      }

      console.log('[TicketDrawerForm] Final payload:', finalData);

      const url = ticket
        ? `/api/admin/ingressos/${ticket.id}`
        : '/api/admin/ingressos';

      const method = ticket ? 'PATCH' : 'POST';

      if (!token) {
        throw new Error('Não autenticado. Por favor, faça login novamente.');
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(finalData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar ingresso');
      }

      toast({
        title: ticket ? 'Ingresso atualizado' : 'Ingresso criado',
        description: `O ingresso foi ${ticket ? 'atualizado' : 'criado'} com sucesso.`,
        variant: 'success',
      });

      onSaved();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Não foi possível salvar o ingresso.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [currentStep, feeConfig, ticket, token, toast, onSaved]);

  const handleSaveDraft = useCallback(() => {
    if (isSubmitting || !isLastStep) return;
    form.handleSubmit((data) => onSubmit(data, true))();
  }, [form, isSubmitting, isLastStep, onSubmit]);

  const handlePublish = useCallback(async () => {
    if (isSubmitting || !isLastStep) return;

    // Pegar valores diretamente do formulário sem passar pelo Zod
    const currentValues = form.getValues();
    console.log('[TicketDrawerForm] Form values before submit:', currentValues);
    console.log('[TicketDrawerForm] Form state:', form.formState);

    // Validar manualmente com Zod
    const validationResult = await ticketFormSchema.safeParseAsync(currentValues);
    console.log('[TicketDrawerForm] Manual validation result:', validationResult);
    console.log('[TicketDrawerForm] Validated data keys:', validationResult.success ? Object.keys(validationResult.data) : 'N/A');
    console.log('[TicketDrawerForm] Validated data:', validationResult.success ? validationResult.data : 'N/A');

    if (!validationResult.success) {
      console.log('[TicketDrawerForm] Validation errors:', validationResult.error.errors);

      // Setar erros manualmente
      validationResult.error.errors.forEach((error) => {
        const fieldName = error.path[0] as any;
        form.setError(fieldName, {
          type: 'manual',
          message: error.message,
        });
      });

      toast({
        title: 'Erro de validação',
        description: 'Por favor, corrija os erros antes de continuar.',
        variant: 'destructive',
      });
      
return;
    }

    // Se passou na validação, submeter com os valores validados
    await onSubmit(validationResult.data, false);
  }, [form, isSubmitting, isLastStep, onSubmit, toast]);

  const handleNext = useCallback(async () => {
    console.log('[TicketDrawerForm] handleNext called, current step:', currentStep);
    const isValid = await validateCurrentStep();
    console.log('[TicketDrawerForm] Validation result:', isValid);

    if (!isValid) {
      console.log('[TicketDrawerForm] Validation failed, not advancing');
      
return;
    }

    setCurrentStep((prev) => {
      const nextStep = Math.min(prev + 1, STEPS.length - 1);
      console.log('[TicketDrawerForm] Advancing from step', prev, 'to step', nextStep);
      setVisitedSteps((visited) => {
        const updated = new Set(visited);
        updated.add(nextStep);
        
return updated;
      });
      
return nextStep;
    });
  }, [validateCurrentStep, currentStep]);

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleStepSelect = useCallback(
    (index: number) => {
      if (!visitedSteps.has(index)) return;
      setCurrentStep(index);
    },
    [visitedSteps],
  );

  const handleFormSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  }, []);

  const handleFormKeyDown = useCallback((event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault();
    }
  }, []);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[700px] overflow-y-auto p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>
              {ticket ? `Editar Ingresso` : 'Novo Ingresso'}
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="mt-4">
            <WizardProgressBar
              steps={STEPS}
              currentStep={currentStep}
              visitedSteps={visitedSteps}
              onStepSelect={handleStepSelect}
            />
          </div>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={handleFormSubmit} onKeyDown={handleFormKeyDown} className="flex-1 flex flex-col">
            <div className="flex-1 p-6 overflow-y-auto">
              <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
                <BasicInfoStepForm form={form} eventOptions={eventOptions} />
              </div>
              <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                <PricingStepForm form={form} feeConfig={feeConfig} eventConfig={eventConfig} />
              </div>
              <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                <AvailabilityStepForm form={form} quantitySold={ticket?.quantity_sold || 0} />
              </div>
              <div style={{ display: currentStep === 3 ? 'block' : 'none' }}>
                <SalePeriodStepForm form={form} eventOptions={eventOptions} />
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-background flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                {isLastStep && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={isSubmitting}
                  >
                    Salvar Rascunho
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button type="button" variant="outline" onClick={handleBack}>
                    Voltar
                  </Button>
                )}
                {currentStep < STEPS.length - 1 ? (
                  <Button type="button" onClick={handleNext}>
                    Próximo
                  </Button>
                ) : (
                  <Button type="button" onClick={handlePublish} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {isSubmitting
                      ? 'Salvando...'
                      : ticket
                      ? 'Atualizar Ingresso'
                      : 'Publicar Ingresso'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
