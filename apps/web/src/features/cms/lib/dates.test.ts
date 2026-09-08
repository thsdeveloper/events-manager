import { describe, expect, it } from 'vitest';
import { formatRelativeDate, fromDateTimeLocal, toDateTimeLocal } from './dates';

describe('datetime-local conversion', () => {
	it('renders an ISO instant in the local timezone for the input and reads it back as ISO', () => {
		const iso = '2026-09-04T18:30:00.000Z';
		const local = toDateTimeLocal(iso);

		expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
		expect(fromDateTimeLocal(local)).toBe(new Date(new Date(iso).setSeconds(0, 0)).toISOString());
	});

	it('treats an empty input as no schedule', () => {
		expect(toDateTimeLocal(null)).toBe('');
		expect(fromDateTimeLocal('')).toBeNull();
		expect(fromDateTimeLocal('not-a-date')).toBeNull();
	});
});

describe('formatRelativeDate', () => {
	it('describes how long ago something happened in Portuguese', () => {
		const now = new Date('2026-09-04T12:00:00Z');

		expect(formatRelativeDate('2026-09-04T11:57:40Z', now)).toBe('há 2 minutos');
		expect(formatRelativeDate('2026-09-01T12:00:00Z', now)).toBe('há 3 dias');
	});
});
