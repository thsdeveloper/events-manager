import { describe, expect, it } from 'vitest';
import { eventCreateSchema, eventInputSchema, eventPatchSchema, ticketInputSchema } from './schemas.js';
import { eventDraftInputSchema } from './event-drafts.js';
import { ticketGroupInputSchema, ticketOrderInputSchema } from './ticket-groups.js';
const event = {
	title: 'Encontro de organizadores',
	slug: 'encontro-organizadores',
	start_date: '2026-12-01T18:00:00Z',
	end_date: '2026-12-01T22:00:00Z',
};
const group = '00000000-0000-4000-8000-000000000030';
const child = '00000000-0000-4000-8000-000000000031';
const other = '00000000-0000-4000-8000-000000000032';
const ticket = { title: 'Meia-entrada', quantity: 50, price: 25, service_fee_type: 'passed_to_buyer' as const };
const paths = (result: ReturnType<typeof eventCreateSchema.safeParse>) =>
	result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
describe('event metadata captured from the organizer workflow', () => {
	it('preserves translated descriptions, alternative banner text and structured venue fields', () => {
		const metadata = {
			description_en: '<p>Welcome</p>',
			description_es: '<p>Bienvenidos</p>',
			cover_image_alt: 'Pessoas no encontro',
			location_tbd: true,
			show_map: false,
			location_street: 'Rua das Flores',
			location_number: '42',
			location_complement: 'Sala 3',
			location_neighborhood: 'Centro',
			location_city: 'Recife',
			location_state: 'PE',
			location_postal_code: '50000-000',
		};
		expect(eventCreateSchema.parse({ ...event, ...metadata })).toMatchObject(metadata);
		expect(eventPatchSchema.parse(metadata)).toMatchObject(metadata);
	});
	it('rejects oversized alternative text', () =>
		expect(eventInputSchema.safeParse({ ...event, cover_image_alt: 'a'.repeat(241) }).success).toBe(false));
	it.each([
		['youtube', 'https://www.youtube.com/watch?v=abc', true],
		['youtube', 'https://youtu.be/abc', true],
		['youtube', 'https://youtube.com.evil.example/watch', false],
		['zoom', 'https://empresa.zoom.us/j/123', true],
		['google_meet', 'https://meet.google.com/abc-defg-hij', true],
		['google_meet', 'https://other.example/meet', false],
		['microsoft_teams', 'https://teams.microsoft.com/l/meetup-join/123', true],
		['vimeo', 'https://vimeo.com/event/123', true],
		['custom', 'https://my-event.example/live', true],
	])('checks the selected %s platform without making a network request', (online_platform, online_url, valid) => {
		expect(eventCreateSchema.safeParse({ ...event, event_type: 'online', online_platform, online_url }).success).toBe(
			valid,
		);
	});
	it('rejects an unsupported platform', () =>
		expect(eventInputSchema.safeParse({ ...event, online_platform: 'unsupported' }).success).toBe(false));
	it('retains a draft reference only in the final creation payload', () => {
		expect(eventCreateSchema.parse({ ...event, draft_id: group })).toHaveProperty('draft_id', group);
		expect(eventPatchSchema.parse({ title: event.title })).not.toHaveProperty('draft_id');
	});
});
describe('ticket grouping and independent half-price inventory', () => {
	it('keeps the admission classification and group in a separately priced ticket', () => {
		expect(
			ticketInputSchema.parse({ ...ticket, event_id: other, group_id: group, admission_type: 'half_price' }),
		).toMatchObject({ price: 25, quantity: 50, group_id: group, admission_type: 'half_price' });
	});
	it('rejects an unknown admission type', () =>
		expect(ticketInputSchema.safeParse({ ...ticket, event_id: other, admission_type: 'unknown' }).success).toBe(false));
	it('preserves a root group, its subgroup and ticket association in creation', () => {
		const ticket_groups = [
			{ client_id: group, title: 'Pista' },
			{ client_id: child, title: 'Primeiro lote', parent_client_id: group },
		];
		expect(
			eventCreateSchema.parse({ ...event, is_free: false, ticket_groups, tickets: [{ ...ticket, group_id: child }] }),
		).toMatchObject({ ticket_groups });
	});
	it.each([
		[
			[
				{ client_id: group, title: 'Pista' },
				{ client_id: group, title: 'Duplicado' },
			],
			'ticket_groups',
		],
		[[{ client_id: group, title: 'Pista', parent_client_id: other }], 'ticket_groups.0.parent_client_id'],
		[[{ client_id: group, title: 'Pista', parent_client_id: group }], 'ticket_groups.0.parent_client_id'],
		[
			[
				{ client_id: group, title: 'Pista' },
				{ client_id: child, title: 'Lote', parent_client_id: group },
				{ client_id: other, title: 'Nível 3', parent_client_id: child },
			],
			'ticket_groups.2.parent_client_id',
		],
	])('rejects duplicated, orphan or deeper groups', (ticket_groups, field) => {
		expect(paths(eventCreateSchema.safeParse({ ...event, ticket_groups }))).toContain(field);
	});
	it('rejects a ticket associated with a group not included in its event', () => {
		expect(paths(eventCreateSchema.safeParse({ ...event, tickets: [{ ...ticket, group_id: other }] }))).toContain(
			'tickets.0.group_id',
		);
	});
	it('requires a non-empty group title and non-negative integer position', () => {
		expect(ticketGroupInputSchema.safeParse({ event_id: other, title: '  ', sort: -1 }).success).toBe(false);
	});
	it('requires the complete reordering request to be non-empty and free of duplicates', () => {
		expect(ticketOrderInputSchema.safeParse({ ticket_ids: [] }).success).toBe(false);
		expect(ticketOrderInputSchema.safeParse({ ticket_ids: [group, group] }).success).toBe(false);
		expect(ticketOrderInputSchema.safeParse({ ticket_ids: [group, child] }).success).toBe(true);
	});
});
describe('incomplete server drafts', () => {
	it('accepts work in progress without turning it into an event', () => {
		const values = {
			title: 'A',
			start_date: '',
			end_date: '',
			is_free: false,
			tickets: [],
			location_tbd: true,
			show_map: false,
		};
		expect(eventDraftInputSchema.parse({ values, current_step: 3 })).toMatchObject({ values, current_step: 3 });
	});
	it('does not persist unknown fields supplied by the client', () => {
		expect(
			eventDraftInputSchema.parse({ values: { title: 'A', organizer_id: other, secret: 'discard' } }).values,
		).toEqual({ title: 'A' });
	});
	it.each([-1, 7, 1.5])('rejects an invalid current step %s', (current_step) => {
		expect(eventDraftInputSchema.safeParse({ values: {}, current_step }).success).toBe(false);
	});
	it('bounds the draft size instead of accepting arbitrarily large text', () => {
		expect(eventDraftInputSchema.safeParse({ values: { description: 'a'.repeat(100001) } }).success).toBe(false);
	});
});
