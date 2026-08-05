import { z } from 'zod';

// Base schema without refinements (for field-level validation)
const eventFormBaseSchema = z.object({
	// Status e Publicação
	status: z.enum(['draft', 'published', 'cancelled', 'archived']),
	category_id: z.string().optional(),
	featured: z.boolean().default(false),

	// Informações Básicas
	cover_image: z.string().nullable(),
	title: z
		.string()
		.min(10, 'O nome deve ter no mínimo 10 caracteres')
		.max(100, 'O nome deve ter no máximo 100 caracteres'),
	short_description: z
		.string()
		.min(50, 'A descrição resumida deve ter no mínimo 50 caracteres para SEO')
		.max(160, 'A descrição resumida deve ter no máximo 160 caracteres')
		.optional(),
	description: z
		.string()
		.min(100, 'A descrição completa deve ter no mínimo 100 caracteres'),
	tags: z.array(z.string()).max(10, 'Máximo de 10 tags permitidas').optional(),

	// Datas e Horários
	start_date: z.string().refine((val) => {
		const date = new Date(val);

		return !isNaN(date.getTime());
	}, 'Data de início inválida'),
	end_date: z.string().refine((val) => {
		const date = new Date(val);

		return !isNaN(date.getTime());
	}, 'Data de término inválida'),
	registration_start: z.string().nullable(),
	registration_end: z.string().nullable(),

	// Tipo e Localização
	event_type: z.enum(['in_person', 'online', 'hybrid']),
	location_name: z.string().optional(),
	location_address: z.string().optional(),
	online_url: z.string().url('URL inválida').optional().or(z.literal('')),

	// Ingressos e Vagas
	is_free: z.boolean().default(true),
	price: z.number().min(0, 'O preço deve ser maior ou igual a zero').optional(),
	max_attendees: z.number().int().positive('O número de vagas deve ser positivo').optional(),
});

// Schema with cross-field validations (for form submission)
export const eventFormSchema = eventFormBaseSchema.refine(
	(data) => {
		// End date must be after start date
		if (data.end_date) {
			const start = new Date(data.start_date);
			const end = new Date(data.end_date);

			return end >= start;
		}

		return true;
	},
	{
		message: 'A data de término deve ser posterior à data de início',
		path: ['end_date'],
	}
).refine(
	(data) => {
		// If event is online or hybrid, online_url is required
		if (data.event_type === 'online' || data.event_type === 'hybrid') {
			return !!data.online_url && data.online_url.length > 0;
		}

		return true;
	},
	{
		message: 'URL do evento online é obrigatória para eventos online ou híbridos',
		path: ['online_url'],
	}
).refine(
	(data) => {
		// If event is in_person or hybrid, location_name is required
		if (data.event_type === 'in_person' || data.event_type === 'hybrid') {
			return !!data.location_name && data.location_name.length > 0;
		}

		return true;
	},
	{
		message: 'Nome do local é obrigatório para eventos presenciais ou híbridos',
		path: ['location_name'],
	}
);

export type EventFormData = z.infer<typeof eventFormSchema>;

// Partial schema for incremental validation (field by field)
export const createFieldValidator = (field: keyof EventFormData) => {
	return (value: any) => {
		try {
			const fieldSchema = eventFormBaseSchema.shape[field] as z.ZodTypeAny;
			fieldSchema.parse(value);

			return { valid: true, error: null };
		} catch (error) {
			if (error instanceof z.ZodError) {
				return {
					valid: false,
					error: error.errors[0]?.message || 'Valor inválido',
				};
			}

			return { valid: false, error: 'Erro de validação' };
		}
	};
};
