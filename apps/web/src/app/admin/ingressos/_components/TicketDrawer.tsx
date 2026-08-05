'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { PricingStep } from './steps/PricingStep';
import { AvailabilityStep } from './steps/AvailabilityStep';
import { SalePeriodStep } from './steps/SalePeriodStep';
import type { EventTicket, TicketFormData } from '../_lib/types';

interface TicketDrawerProps {
  open: boolean;
  onClose: () => void;
  ticket: EventTicket | null;
  onSaved: () => void;
  eventOptions: Array<{ id: string; title: string; start_date: string }>;
}

const STEPS = [
  { id: 1, title: 'Informações Básicas', icon: '🎫' },
  { id: 2, title: 'Preços e Taxas', icon: '💰' },
  { id: 3, title: 'Disponibilidade', icon: '📦' },
  { id: 4, title: 'Período de Vendas', icon: '📅' },
];

const SERVICE_FEE_PERCENTAGE = 0.05; // 5%

export function TicketDrawer({ open, onClose, ticket, onSaved, eventOptions }: TicketDrawerProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<TicketFormData>>({
    status: 'active',
    visibility: 'public',
    service_fee_type: 'passed_to_buyer',
    allow_installments: false,
    max_installments: 4,
    min_amount_for_installments: 50,
  });

  // Reset form when drawer opens/closes or ticket changes
  useEffect(() => {
    if (open) {
      if (ticket) {
        // Edit mode - populate form with ticket data
        setFormData({
          event_id: ticket.event_id.id,
          title: ticket.title,
          description: ticket.description || '',
          visibility: ticket.visibility || 'public',
          price: ticket.price ?? undefined,
          service_fee_type: ticket.service_fee_type || 'passed_to_buyer',
          allow_installments: ticket.allow_installments ?? false,
          max_installments: ticket.max_installments || 4,
          min_amount_for_installments: ticket.min_amount_for_installments || 50,
          quantity: ticket.quantity ?? undefined,
          min_quantity_per_purchase: ticket.min_quantity_per_purchase ?? undefined,
          max_quantity_per_purchase: ticket.max_quantity_per_purchase ?? undefined,
          sale_start_date: ticket.sale_start_date,
          sale_end_date: ticket.sale_end_date,
          status: ticket.status,
        });
      } else {
        // Create mode - reset to defaults
        setFormData({
          status: 'active',
          visibility: 'public',
          service_fee_type: 'passed_to_buyer',
          allow_installments: false,
          max_installments: 4,
          min_amount_for_installments: 50,
        });
      }
      setCurrentStep(1);
    }
  }, [open, ticket]);

  const updateFormData = (data: Partial<TicketFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.event_id) {
          toast({
            title: 'Campo obrigatório',
            description: 'Selecione um evento',
            variant: 'destructive',
          });
          
return false;
        }
        if (!formData.title || formData.title.length < 3) {
          toast({
            title: 'Campo obrigatório',
            description: 'Digite um nome com pelo menos 3 caracteres',
            variant: 'destructive',
          });
          
return false;
        }
        
return true;

      case 2:
        if (!formData.price || formData.price <= 0) {
          toast({
            title: 'Campo obrigatório',
            description: 'Digite um preço maior que zero',
            variant: 'destructive',
          });
          
return false;
        }
        if (formData.allow_installments) {
          if (!formData.max_installments || formData.max_installments < 2 || formData.max_installments > 12) {
            toast({
              title: 'Campo inválido',
              description: 'O número de parcelas deve estar entre 2 e 12',
              variant: 'destructive',
            });
            
return false;
          }
          if (!formData.min_amount_for_installments || formData.min_amount_for_installments <= 0) {
            toast({
              title: 'Campo inválido',
              description: 'Digite um valor mínimo válido para parcelamento',
              variant: 'destructive',
            });
            
return false;
          }
        }
        
return true;

      case 3:
        if (!formData.quantity || formData.quantity < 1) {
          toast({
            title: 'Campo obrigatório',
            description: 'Digite uma quantidade maior que zero',
            variant: 'destructive',
          });
          
return false;
        }
        if (
          formData.min_quantity_per_purchase &&
          formData.max_quantity_per_purchase &&
          formData.min_quantity_per_purchase > formData.max_quantity_per_purchase
        ) {
          toast({
            title: 'Campo inválido',
            description: 'A quantidade máxima deve ser maior que a mínima',
            variant: 'destructive',
          });
          
return false;
        }
        
return true;

      case 4:
        if (formData.sale_start_date && formData.sale_end_date) {
          if (new Date(formData.sale_start_date) >= new Date(formData.sale_end_date)) {
            toast({
              title: 'Datas inválidas',
              description: 'A data de início deve ser anterior à data de fim',
              variant: 'destructive',
            });
            
return false;
          }
        }
        
return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSave = async (isDraft: boolean = false) => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);

    try {
      const finalData = {
        ...formData,
        status: isDraft ? 'inactive' : formData.status,
      };

      const url = ticket
        ? `/api/admin/ingressos/${ticket.id}`
        : '/api/admin/ingressos';

      const method = ticket ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
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
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[600px] overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <SheetTitle>
              {ticket ? `Editar Ingresso: ${ticket.title}` : 'Novo Ingresso'}
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
          <div className="space-y-2 mt-4">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-sm">
              {STEPS.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex flex-col items-center gap-1 flex-1 ${
                    currentStep === step.id
                      ? 'text-primary font-medium'
                      : currentStep > step.id
                      ? 'text-green-600'
                      : 'text-muted-foreground'
                  }`}
                  disabled={currentStep < step.id && !ticket}
                >
                  <span className="text-lg">{step.icon}</span>
                  <span className="text-xs text-center leading-tight hidden sm:block">
                    {step.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </SheetHeader>

        <div className="p-6">
          {currentStep === 1 && (
            <BasicInfoStep
              formData={formData}
              onChange={updateFormData}
              eventOptions={eventOptions}
            />
          )}
          {currentStep === 2 && (
            <PricingStep
              formData={formData}
              onChange={updateFormData}
              serviceFeePercentage={SERVICE_FEE_PERCENTAGE}
            />
          )}
          {currentStep === 3 && (
            <AvailabilityStep
              formData={formData}
              onChange={updateFormData}
              quantitySold={ticket?.quantity_sold || 0}
            />
          )}
          {currentStep === 4 && (
            <SalePeriodStep
              formData={formData}
              onChange={updateFormData}
              eventOptions={eventOptions}
            />
          )}
        </div>

        <div className="px-6 py-4 border-t sticky bottom-0 bg-background flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            {currentStep === STEPS.length && (
              <Button
                variant="outline"
                onClick={() => handleSave(true)}
                disabled={isSubmitting}
              >
                Salvar Rascunho
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Voltar
              </Button>
            )}
            {currentStep < STEPS.length ? (
              <Button onClick={handleNext}>Próximo</Button>
            ) : (
              <Button onClick={() => handleSave(false)} disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : ticket ? 'Atualizar Ingresso' : 'Publicar Ingresso'}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
