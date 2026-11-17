import { describe, expect, it } from 'vitest';
import { contentDefaults, contentPayload, eventForPreview } from './wizard-content';
import { coverImageSchema, locationSchema } from './validation';
import type { EventWizardFormValues } from './types';
describe('event authoring metadata', () => {
	it('allows a place to be defined later and clears old physical details in the submission', () => {
		const values = {
			...contentDefaults,
			event_type: 'in_person',
			location_tbd: true,
			location_name: 'Local antigo',
			location_address: 'Endereço antigo',
			latitude: 1,
			longitude: 2,
		} as EventWizardFormValues;
		expect(locationSchema.safeParse(values).success).toBe(true);
		expect(contentPayload(values)).toMatchObject({
			location_tbd: true,
			location_name: null,
			location_address: null,
			latitude: null,
			longitude: null,
			online_url: null,
		});
	});
	it('preserves a structured address without requiring coordinates when the map is hidden', () => {
		const values = {
			...contentDefaults,
			event_type: 'in_person',
			show_map: false,
			location_name: 'Auditório',
			location_street: 'Rua Central',
			location_number: '10',
			location_city: 'Recife',
			location_state: 'PE',
		} as EventWizardFormValues;
		expect(locationSchema.safeParse(values).success).toBe(true);
		expect(contentPayload(values).location_address).toBe('Rua Central, 10 — Recife — PE');
	});
	it('validates the chosen streaming platform, allows a custom HTTP URL and limits banner alternative text', () => {
		expect(
			locationSchema.safeParse({
				event_type: 'online',
				online_platform: 'youtube',
				online_url: 'https://example.com/falso',
			}).success,
		).toBe(false);
		expect(
			locationSchema.safeParse({
				event_type: 'online',
				online_platform: 'youtube',
				online_url: 'https://www.youtube.com/watch?v=abc',
			}).success,
		).toBe(true);
		expect(
			locationSchema.safeParse({
				event_type: 'online',
				online_platform: 'custom',
				online_url: 'http://stream.example.com/sala',
			}).success,
		).toBe(true);
		expect(coverImageSchema.safeParse({ cover_image_alt: 'a'.repeat(241) }).success).toBe(false);
	});
	it('previews unsaved group structure and sanitizes the primary description', () => {
		const group = '00000000-0000-4000-8000-000000000041';
		const values = {
			...contentDefaults,
			title: 'Encontro',
			event_type: 'online',
			description: '<p>Texto</p><script>alert(1)</script>',
			tickets: [],
			ticket_groups: [{ client_id: group, title: 'Grupo' }],
		} as unknown as EventWizardFormValues;
		const preview = eventForPreview(values, null, []);
		expect(preview.ticket_groups).toEqual([expect.objectContaining({ id: group, title: 'Grupo' })]);
		expect(preview.description).not.toContain('<script>');
	});
});
