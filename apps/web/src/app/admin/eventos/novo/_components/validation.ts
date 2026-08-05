'use client';

import { z } from 'zod';

export const basicInfoSchema = z.object({
	title: z
		.string({ required_error: 'Informe um nome para o evento' })
		.trim()
		.min(10, 'O nome deve ter pelo menos 10 caracteres')
		.max(100, 'O nome pode ter no máximo 100 caracteres'),
	category_id: z.string({ required_error: 'Selecione uma categoria' }).min(1, 'Selecione uma categoria'),
	short_description: z
		.string()
		.trim()
		.max(160, 'Limite de 160 caracteres')
		.optional()
		.or(z.literal('')),
});

export const coverImageSchema = z.object({
	cover_image: z.string().optional().or(z.literal('')),
});

export const detailsSchema = z.object({
	description: z
		.string({ required_error: 'Descreva seu evento' })
		.trim()
		.min(80, 'Descreva seu evento com pelo menos 80 caracteres'),
	tags: z
		.array(
			z
				.string()
				.trim()
				.min(2, 'Tags precisam ter pelo menos 2 caracteres')
				.max(24, 'Tags podem ter até 24 caracteres'),
		)
		.max(10, 'Use até 10 tags')
		.optional()
		.default([]),
});

const scheduleFields = z.object({
	start_date: z.string({ required_error: 'Informe a data de início' }).min(1, 'Informe a data de início'),
	end_date: z.string().min(1, 'Informe a data de término'),
	registration_start: z.string().optional().or(z.literal('')),
	registration_end: z.string().optional().or(z.literal('')),
});

export const scheduleSchema = scheduleFields
		.refine(
			data => {
				if (!data.start_date || !data.end_date) {
					return false;
				}

				return new Date(data.end_date).getTime() >= new Date(data.start_date).getTime();
			},
		{
			path: ['end_date'],
			message: 'A data de término deve ser após o início',
		},
	)
		.refine(
			data => {
				if (!data.registration_start || !data.registration_end) {
					return true;
				}

				return new Date(data.registration_end).getTime() >= new Date(data.registration_start).getTime();
			},
		{
			path: ['registration_end'],
			message: 'O encerramento das inscrições deve ser após a abertura',
		},
	)
		.refine(
			data => {
				if (!data.registration_end) {
					return true;
				}

				return new Date(data.registration_end).getTime() <= new Date(data.end_date).getTime();
			},
		{
			path: ['registration_end'],
			message: 'Inscrições não podem encerrar depois do evento',
		},
	);

const locationFields = z.object({
	event_type: z.enum(['in_person', 'online', 'hybrid'], {
		required_error: 'Escolha o formato do evento',
	}),
	location_name: z.string().optional().or(z.literal('')),
	location_address: z.string().optional().or(z.literal('')),
	online_url: z.string().optional().or(z.literal('')),
});

export const locationSchema = locationFields
	.superRefine((data, ctx) => {
		if (data.event_type === 'in_person' || data.event_type === 'hybrid') {
			if (!data.location_name || data.location_name.trim().length < 3) {
				ctx.addIssue({
					path: ['location_name'],
					code: z.ZodIssueCode.custom,
					message: 'Informe o nome do local',
				});
			}
			if (!data.location_address || data.location_address.trim().length < 5) {
				ctx.addIssue({
					path: ['location_address'],
					code: z.ZodIssueCode.custom,
					message: 'Informe o endereço completo',
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
					new URL(data.online_url);
				} catch {
					ctx.addIssue({
						path: ['online_url'],
						code: z.ZodIssueCode.custom,
						message: 'Informe uma URL válida',
					});
				}
			}
		}
	});

export const ticketsSchema = z.object({
	is_free: z.boolean(),
	max_attendees: z
		.union([
			z
				.number({
					invalid_type_error: 'Informe um número válido',
				})
				.int()
				.min(1, 'Informe um número acima de zero')
				.max(100000, 'Informe um limite realista'),
			z.null(),
		])
		.optional()
		.default(null),
	status: z.enum(['draft', 'published', 'cancelled', 'archived']),
	featured: z.boolean(),
	publish_after_create: z.boolean(),
});

export const eventWizardSchema = basicInfoSchema
	.merge(coverImageSchema)
	.merge(detailsSchema)
	.merge(scheduleFields)
	.merge(locationFields)
	.merge(ticketsSchema)
	.superRefine((data, ctx) => {
		const scheduleCheck = scheduleSchema.safeParse({
			start_date: data.start_date,
			end_date: data.end_date,
			registration_start: data.registration_start,
			registration_end: data.registration_end,
		});

		if (!scheduleCheck.success) {
			scheduleCheck.error.issues.forEach(issue => ctx.addIssue(issue));
		}

		const locationCheck = locationSchema.safeParse({
			event_type: data.event_type,
			location_name: data.location_name,
			location_address: data.location_address,
			online_url: data.online_url,
		});

		if (!locationCheck.success) {
			locationCheck.error.issues.forEach(issue => ctx.addIssue(issue));
		}
	});
