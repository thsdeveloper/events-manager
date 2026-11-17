'use client';

import { z } from 'zod';
import { eventVisibilitySchema, onlinePlatformSchema, isOnlinePlatformUrl } from '@events-manager/contracts';
import { structuredAddress } from './wizard-content';
import { htmlToPlainText } from '@/components/ui/Text';

export const basicInfoSchema = z.object({
	title: z
		.string({ error: 'Informe um nome para o evento' })
		.trim()
		.min(10, 'O nome deve ter pelo menos 10 caracteres')
		.max(100, 'O nome pode ter no máximo 100 caracteres'),
	category_id: z.string({ error: 'Selecione uma categoria' }).min(1, 'Selecione uma categoria'),
	short_description: z.string().trim().max(160, 'Limite de 160 caracteres').optional().or(z.literal('')),
});

export const coverImageSchema = z.object({
	cover_image_alt: z.string().max(240, 'Use até 240 caracteres').optional(),
	cover_image: z.string().optional().or(z.literal('')),
});

export const detailsSchema = z.object({
	description_en: z.string().optional(),
	description_es: z.string().optional(),
	// HTML do editor: o mínimo vale para o texto visível, não para as tags.
	description: z
		.string({ error: 'Descreva seu evento' })
		.trim()
		.refine((value) => htmlToPlainText(value).length >= 80, 'Descreva seu evento com pelo menos 80 caracteres'),
	tags: z
		.array(
			z.string().trim().min(2, 'Tags precisam ter pelo menos 2 caracteres').max(24, 'Tags podem ter até 24 caracteres'),
		)
		.max(10, 'Use até 10 tags')
		.optional()
		.default([]),
});

const scheduleFields = z.object({
	start_date: z.string({ error: 'Informe a data de início' }).min(1, 'Informe a data de início'),
	end_date: z.string().min(1, 'Informe a data de término'),
});

export const scheduleSchema = scheduleFields.refine(
	(data) => new Date(data.end_date).getTime() > new Date(data.start_date).getTime(),
	{
		path: ['end_date'],
		message: 'A data de término deve ser após o início',
	},
);

const locationFields = z.object({
	location_tbd: z.boolean().default(false),
	show_map: z.boolean().default(true),
	location_street: z.string().optional(),
	location_number: z.string().optional(),
	location_complement: z.string().optional(),
	location_neighborhood: z.string().optional(),
	location_city: z.string().optional(),
	location_state: z.string().optional(),
	location_postal_code: z.string().optional(),
	online_platform: onlinePlatformSchema.optional().default('custom'),
	event_type: z.enum(['in_person', 'online', 'hybrid'], {
		error: 'Escolha o formato do evento',
	}),
	location_name: z.string().optional().or(z.literal('')),
	location_address: z.string().optional().or(z.literal('')),
	latitude: z.number().min(-90).max(90).nullable().optional(),
	longitude: z.number().min(-180).max(180).nullable().optional(),
	online_url: z.string().optional().or(z.literal('')),
});

export const locationSchema = locationFields.superRefine((data, ctx) => {
	if ((data.event_type === 'in_person' || data.event_type === 'hybrid') && !data.location_tbd) {
		if (!data.location_name || data.location_name.trim().length < 3) {
			ctx.addIssue({
				path: ['location_name'],
				code: z.ZodIssueCode.custom,
				message: 'Informe o nome do local',
			});
		}
		if ((structuredAddress(data) || data.location_address || '').trim().length < 5) {
			ctx.addIssue({
				path: ['location_address'],
				code: z.ZodIssueCode.custom,
				message: 'Informe o endereço completo',
			});
		}
		if (
			data.show_map !== false &&
			(data.latitude === null || data.latitude === undefined || data.longitude === null || data.longitude === undefined)
		) {
			ctx.addIssue({
				path: ['latitude'],
				code: z.ZodIssueCode.custom,
				message: 'Marque o local do evento no mapa',
			});
		}
	}

	if (data.event_type === 'online' || data.event_type === 'hybrid') {
		if (!data.online_url || data.online_url.trim().length < 6) {
			ctx.addIssue({
				path: ['online_url'],
				code: z.ZodIssueCode.custom,
				message: 'Informe o link da transmissão',
			});
		} else {
			try {
				const url = new URL(data.online_url);
				if (
					!['http:', 'https:'].includes(url.protocol) ||
					!isOnlinePlatformUrl(data.online_platform ?? 'custom', data.online_url)
				)
					throw new Error('invalid protocol or platform');
			} catch {
				ctx.addIssue({
					path: ['online_url'],
					code: z.ZodIssueCode.custom,
					message: 'Informe uma URL válida da plataforma selecionada',
				});
			}
		}
	}
});

const ticketDraftSchema = z.object({
	title: z.string().trim().min(1),
	quantity: z.number().int().positive(),
	price: z.number().nonnegative(),
});

const ticketsFields = z.object({
	is_free: z.boolean(),
	tickets: z.array(ticketDraftSchema).default([]),
	max_attendees: z
		.union([
			z
				.number({
					error: 'Informe um número válido',
				})
				.int()
				.min(1, 'Informe um número acima de zero')
				.max(100000, 'Informe um limite realista'),
			z.null(),
		])
		.optional()
		.default(null),
	status: z.enum(['draft', 'published', 'cancelled', 'archived']),
	visibility: eventVisibilitySchema.default('public'),
	featured: z.boolean(),
	publish_after_create: z.boolean(),
});

/** Mirrors the API rule: a paid event cannot exist without a ticket to sell. */
function addPaidTicketIssue(data: { is_free: boolean; tickets: unknown[] }, ctx: z.RefinementCtx) {
	if (!data.is_free && data.tickets.length === 0) {
		ctx.addIssue({
			path: ['tickets'],
			code: z.ZodIssueCode.custom,
			message: 'Cadastre pelo menos um tipo de ingresso para um evento pago',
		});
	}
}

export const ticketsSchema = ticketsFields.superRefine(addPaidTicketIssue);

export const eventWizardSchema = basicInfoSchema
	.merge(coverImageSchema)
	.merge(detailsSchema)
	.merge(scheduleFields)
	.merge(locationFields)
	.merge(ticketsFields)
	.superRefine((data, ctx) => {
		const scheduleCheck = scheduleSchema.safeParse({
			start_date: data.start_date,
			end_date: data.end_date,
		});

		if (!scheduleCheck.success) {
			scheduleCheck.error.issues.forEach((issue) =>
				ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path }),
			);
		}

		const locationCheck = locationSchema.safeParse({
			event_type: data.event_type,
			location_tbd: data.location_tbd,
			show_map: data.show_map,
			online_platform: data.online_platform,
			location_street: data.location_street,
			location_number: data.location_number,
			location_complement: data.location_complement,
			location_neighborhood: data.location_neighborhood,
			location_city: data.location_city,
			location_state: data.location_state,
			location_postal_code: data.location_postal_code,
			location_name: data.location_name,
			location_address: data.location_address,
			latitude: data.latitude,
			longitude: data.longitude,
			online_url: data.online_url,
		});

		if (!locationCheck.success) {
			locationCheck.error.issues.forEach((issue) =>
				ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path }),
			);
		}

		addPaidTicketIssue(data, ctx);
	});
