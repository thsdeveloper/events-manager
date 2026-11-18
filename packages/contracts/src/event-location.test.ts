import { describe, expect, it } from 'vitest';
import { eventInputSchema, eventCreateSchema } from './schemas.js';
const event = {
	title: 'Evento presencial',
	slug: 'evento-presencial',
	start_date: '2027-01-01T10:00:00Z',
	end_date: '2027-01-01T18:00:00Z',
	event_type: 'in_person',
	location_name: 'Teatro Municipal',
	location_postal_code: '01001-000',
	location_number: '10',
	location_state: 'SP',
};
describe('endereço de evento físico', () => {
	it('exige o endereço também ao criar o evento junto com seus ingressos', () => {
		expect(
			eventCreateSchema.safeParse({ ...event, is_free: true, tickets: [], location_postal_code: '' }).success,
		).toBe(false);
	});
	it.each(['location_name', 'location_postal_code', 'location_number', 'location_state'])(
		'exige %s quando o local está definido',
		(field) => {
			const result = eventInputSchema.safeParse({ ...event, [field]: '' });
			expect(result.success).toBe(false);
			if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
		},
	);
	it.each([{ location_state: 'XX' }, { location_postal_code: '010' }])('rejeita endereço inválido: %j', (patch) =>
		expect(eventInputSchema.safeParse({ ...event, ...patch }).success).toBe(false),
	);
	it('aceita CEP com ou sem máscara e número sem algarismos para locais sem número', () => {
		expect(eventInputSchema.safeParse(event).success).toBe(true);
		expect(
			eventInputSchema.safeParse({ ...event, location_postal_code: '01001000', location_number: 's/n' }).success,
		).toBe(true);
	});
	it.each(['in_person', 'hybrid', 'online'])('permite preparar um evento %s com local a definir', (event_type) => {
		expect(
			eventInputSchema.safeParse({
				...event,
				event_type,
				location_tbd: true,
				location_name: '',
				location_postal_code: '',
				location_number: '',
				location_state: '',
			}).success,
		).toBe(true);
	});
});
