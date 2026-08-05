import { z } from 'zod';

// Step 1: Informações Básicas
export const basicInfoSchema = z.object({
  event_id: z.string({
    required_error: 'Selecione um evento',
    invalid_type_error: 'Selecione um evento válido',
  }).min(1, 'Selecione um evento'),
  title: z.string({
    required_error: 'O nome do ingresso é obrigatório',
    invalid_type_error: 'O nome deve ser um texto',
  })
    .min(3, 'O nome deve ter pelo menos 3 caracteres')
    .max(100, 'O nome deve ter no máximo 100 caracteres'),
  description: z.string()
    .max(500, 'A descrição deve ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
  visibility: z.enum(['public', 'invited_only', 'manual'], {
    required_error: 'Selecione a visibilidade do ingresso',
    invalid_type_error: 'Selecione uma opção válida',
  }),
});

// Step 2: Preços e Taxas
export const pricingSchema = z.object({
  price: z.number({
    required_error: 'Informe o preço do ingresso',
    invalid_type_error: 'Informe o preço do ingresso',
  })
    .nonnegative('O preço não pode ser negativo')
    .refine((val) => val > 0, {
      message: 'O preço deve ser maior que zero',
    }),
  service_fee_type: z.enum(['absorbed', 'passed_to_buyer'], {
    required_error: 'Selecione como será cobrada a taxa de serviço',
    invalid_type_error: 'Selecione uma opção válida',
  }),
  allow_installments: z.boolean({
    invalid_type_error: 'Valor inválido para permitir parcelamento',
  }).default(false),
  max_installments: z.number({
    invalid_type_error: 'O número de parcelas deve ser um número',
  })
    .int('O número de parcelas deve ser um número inteiro')
    .min(2, 'O número mínimo de parcelas é 2')
    .max(12, 'O número máximo de parcelas é 12')
    .optional()
    .nullable(),
  min_amount_for_installments: z.number({
    invalid_type_error: 'O valor mínimo deve ser um número',
  })
    .positive('O valor mínimo deve ser maior que zero')
    .optional()
    .nullable(),
}).refine(
  (data) => {
    if (data.allow_installments) {
      return data.max_installments && data.max_installments >= 2 && data.max_installments <= 12;
    }
    
return true;
  },
  {
    message: 'Ao permitir parcelamento, defina entre 2 e 12 parcelas',
    path: ['max_installments'],
  }
).refine(
  (data) => {
    if (data.allow_installments) {
      return data.min_amount_for_installments && data.min_amount_for_installments > 0;
    }
    
return true;
  },
  {
    message: 'Ao permitir parcelamento, defina um valor mínimo',
    path: ['min_amount_for_installments'],
  }
);

// Step 3: Disponibilidade
export const availabilitySchema = z.object({
  quantity: z.number({
    required_error: 'Informe a quantidade de ingressos',
    invalid_type_error: 'Informe a quantidade de ingressos',
  })
    .int('A quantidade deve ser um número inteiro')
    .nonnegative('A quantidade não pode ser negativa')
    .refine((val) => val > 0, {
      message: 'A quantidade deve ser maior que zero',
    }),
  min_quantity_per_purchase: z.number({
    invalid_type_error: 'A quantidade mínima deve ser um número',
  })
    .int('A quantidade mínima deve ser um número inteiro')
    .positive('A quantidade mínima deve ser maior que zero')
    .optional()
    .nullable(),
  max_quantity_per_purchase: z.number({
    invalid_type_error: 'A quantidade máxima deve ser um número',
  })
    .int('A quantidade máxima deve ser um número inteiro')
    .positive('A quantidade máxima deve ser maior que zero')
    .optional()
    .nullable(),
}).refine(
  (data) => {
    if (data.min_quantity_per_purchase && data.max_quantity_per_purchase) {
      return data.max_quantity_per_purchase >= data.min_quantity_per_purchase;
    }
    
return true;
  },
  {
    message: 'A quantidade máxima por compra deve ser maior ou igual à quantidade mínima',
    path: ['max_quantity_per_purchase'],
  }
);

// Step 4: Período de Vendas
export const salePeriodSchema = z.object({
  sale_start_date: z.string({
    invalid_type_error: 'A data de início deve ser válida',
  }).nullable().optional(),
  sale_end_date: z.string({
    invalid_type_error: 'A data de término deve ser válida',
  }).nullable().optional(),
}).refine(
  (data) => {
    if (data.sale_start_date && data.sale_end_date) {
      return new Date(data.sale_start_date) < new Date(data.sale_end_date);
    }
    
return true;
  },
  {
    message: 'A data de início das vendas deve ser anterior à data de término',
    path: ['sale_end_date'],
  }
);

// Schema completo do formulário - reconstruído para evitar problemas com .merge()
export const ticketFormSchema = z.object({
  // Basic Info
  event_id: z.string({
    required_error: 'Selecione um evento',
    invalid_type_error: 'Selecione um evento válido',
  }).min(1, 'Selecione um evento'),
  title: z.string({
    required_error: 'O nome do ingresso é obrigatório',
    invalid_type_error: 'O nome deve ser um texto',
  })
    .min(3, 'O nome deve ter pelo menos 3 caracteres')
    .max(100, 'O nome deve ter no máximo 100 caracteres'),
  description: z.string()
    .max(500, 'A descrição deve ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
  visibility: z.enum(['public', 'invited_only', 'manual'], {
    required_error: 'Selecione a visibilidade do ingresso',
    invalid_type_error: 'Selecione uma opção válida',
  }),

  // Pricing
  price: z.number({
    required_error: 'Informe o preço do ingresso',
    invalid_type_error: 'Informe o preço do ingresso',
  })
    .nonnegative('O preço não pode ser negativo')
    .refine((val) => val > 0, {
      message: 'O preço deve ser maior que zero',
    }),
  service_fee_type: z.enum(['absorbed', 'passed_to_buyer'], {
    required_error: 'Selecione como será cobrada a taxa de serviço',
    invalid_type_error: 'Selecione uma opção válida',
  }),
  allow_installments: z.boolean({
    invalid_type_error: 'Valor inválido para permitir parcelamento',
  }).default(false),
  max_installments: z.number({
    invalid_type_error: 'O número de parcelas deve ser um número',
  })
    .int('O número de parcelas deve ser um número inteiro')
    .min(2, 'O número mínimo de parcelas é 2')
    .max(12, 'O número máximo de parcelas é 12')
    .optional()
    .nullable(),
  min_amount_for_installments: z.number({
    invalid_type_error: 'O valor mínimo deve ser um número',
  })
    .positive('O valor mínimo deve ser maior que zero')
    .optional()
    .nullable(),

  // Availability
  quantity: z.number({
    required_error: 'Informe a quantidade de ingressos',
    invalid_type_error: 'Informe a quantidade de ingressos',
  })
    .int('A quantidade deve ser um número inteiro')
    .nonnegative('A quantidade não pode ser negativa')
    .refine((val) => val > 0, {
      message: 'A quantidade deve ser maior que zero',
    }),
  min_quantity_per_purchase: z.number({
    invalid_type_error: 'A quantidade mínima deve ser um número',
  })
    .int('A quantidade mínima deve ser um número inteiro')
    .positive('A quantidade mínima deve ser maior que zero')
    .optional()
    .nullable(),
  max_quantity_per_purchase: z.number({
    invalid_type_error: 'A quantidade máxima deve ser um número',
  })
    .int('A quantidade máxima deve ser um número inteiro')
    .positive('A quantidade máxima deve ser maior que zero')
    .optional()
    .nullable(),

  // Sale Period
  sale_start_date: z.string({
    invalid_type_error: 'A data de início deve ser válida',
  }).nullable().optional(),
  sale_end_date: z.string({
    invalid_type_error: 'A data de término deve ser válida',
  }).nullable().optional(),

  // Status
  status: z.enum(['active', 'inactive', 'sold_out'], {
    required_error: 'O status do ingresso é obrigatório',
    invalid_type_error: 'Selecione um status válido',
  }).optional().default('active'),
})
.refine(
  (data) => {
    // Validação de parcelamento
    if (data.allow_installments) {
      return data.max_installments && data.max_installments >= 2 && data.max_installments <= 12;
    }
    
return true;
  },
  {
    message: 'Ao permitir parcelamento, defina entre 2 e 12 parcelas',
    path: ['max_installments'],
  }
)
.refine(
  (data) => {
    // Validação de valor mínimo para parcelamento
    if (data.allow_installments) {
      return data.min_amount_for_installments && data.min_amount_for_installments > 0;
    }
    
return true;
  },
  {
    message: 'Ao permitir parcelamento, defina um valor mínimo',
    path: ['min_amount_for_installments'],
  }
)
.refine(
  (data) => {
    // Validação de quantidade mínima vs máxima
    if (data.min_quantity_per_purchase && data.max_quantity_per_purchase) {
      return data.max_quantity_per_purchase >= data.min_quantity_per_purchase;
    }
    
return true;
  },
  {
    message: 'A quantidade máxima por compra deve ser maior ou igual à quantidade mínima',
    path: ['max_quantity_per_purchase'],
  }
)
.refine(
  (data) => {
    // Validação de datas
    if (data.sale_start_date && data.sale_end_date) {
      return new Date(data.sale_start_date) < new Date(data.sale_end_date);
    }
    
return true;
  },
  {
    message: 'A data de início das vendas deve ser anterior à data de término',
    path: ['sale_end_date'],
  }
);

// Type inference - apenas o tipo completo é usado
export type TicketFormData = z.infer<typeof ticketFormSchema>;
