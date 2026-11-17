import { z } from 'zod';
import { categoryIdSchema } from './category-id.js';

/** Bounded, public event context. Provider keys and model selection stay in the API. */
export const eventAIContextSchema = z.object({
	title: z.string().trim().min(3).max(100),
	categoryId: categoryIdSchema,
	short_description: z.string().max(160).optional(),
	description: z.string().max(12000).optional(),
	tags: z.array(z.string().trim().min(1).max(24)).max(10).optional(),
	event_type: z.enum(['in_person', 'online', 'hybrid']).optional(),
	start_date: z.string().datetime({ offset: true }).optional(),
	end_date: z.string().datetime({ offset: true }).optional(),
	location_name: z.string().max(240).optional(),
	location_city: z.string().max(120).optional(),
	brief: z.string().trim().max(1000).optional(),
});
export type EventAIContext = z.infer<typeof eventAIContextSchema>;
