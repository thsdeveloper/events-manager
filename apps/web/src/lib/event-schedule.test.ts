/**
 * Como a data e o local de um evento são ditos para quem compra. Um intervalo
 * dentro do mesmo dia não deve repetir a data, e um evento online não tem
 * endereço para mostrar.
 */
import { describe, expect, it } from 'vitest';
import { formatEventDateRange, formatEventLocation } from './event-schedule';

describe('formatEventDateRange', () => {
	it('states a single day once, with the time', () => {
		expect(formatEventDateRange('2026-09-19T16:00:00.000Z', '2026-09-19T22:00:00.000Z')).toBe(
			'19 de setembro, 13:00 às 19:00',
		);
	});

	it('spans two dates when the event crosses days', () => {
		expect(formatEventDateRange('2026-09-19T16:00:00.000Z', '2026-09-21T22:00:00.000Z')).toBe(
			'19 de setembro a 21 de setembro',
		);
	});

	it('drops the end when the event has none', () => {
		expect(formatEventDateRange('2026-09-19T16:00:00.000Z', null)).toBe('19 de setembro, 13:00');
	});

	it('says nothing rather than "Invalid Date" when there is no start', () => {
		expect(formatEventDateRange(null, null)).toBe('');
	});
});

describe('formatEventLocation', () => {
	it('uses the venue name for an in-person event', () => {
		expect(formatEventLocation('in_person', 'Ginásio Central', 'Rua A, 100')).toBe('Ginásio Central');
	});

	it('falls back to the address when the venue has no name', () => {
		expect(formatEventLocation('in_person', null, 'Rua A, 100')).toBe('Rua A, 100');
	});

	it('says the event happens online instead of showing an empty address', () => {
		expect(formatEventLocation('online', null, null)).toBe('Evento online');
	});

	it('names a hybrid event as both', () => {
		expect(formatEventLocation('hybrid', 'Ginásio Central', null)).toBe('Ginásio Central · também online');
	});

	it('admits when the location was not informed', () => {
		expect(formatEventLocation('in_person', null, null)).toBe('Local a confirmar');
	});
});
