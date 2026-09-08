import { describe, expect, it } from 'vitest';
import type { AppUser } from './domain.js';
import { getProfileChecklist, getProfileCompletion, isProfileComplete } from './profile.js';

const empty: AppUser = { id: 'u1', email: 'ana@example.com' };
const complete: AppUser = {
	id: 'u1',
	email: 'ana@example.com',
	first_name: 'Ana',
	last_name: 'Silva',
	avatar: 'media-1',
	birth_date: '1990-05-20',
	document: '52998224725',
	phone: '11999990000',
	phone_verified_at: '2026-09-04T19:00:00.000Z',
	location: 'Uberlândia - MG',
	description: 'Gosto de festivais.',
};

describe('profile checklist (shared by API and web)', () => {
	it('lists every item with a stable id and its state', () => {
		const items = getProfileChecklist(empty);

		expect(items.map((item) => item.id)).toEqual([
			'name',
			'avatar',
			'birth_date',
			'document',
			'phone',
			'phone_verified',
			'location',
			'description',
		]);
		expect(items.every((item) => item.complete === false)).toBe(true);
		expect(items.find((item) => item.id === 'document')?.label).toBe('CPF');
	});

	it('computes the percentage and the completeness from the same list', () => {
		expect(getProfileCompletion(empty)).toBe(0);
		expect(getProfileCompletion({ ...empty, first_name: 'Ana', last_name: 'Silva', avatar: 'm' })).toBe(25);
		expect(getProfileCompletion(complete)).toBe(100);
		expect(isProfileComplete(complete)).toBe(true);
		expect(isProfileComplete({ ...complete, phone_verified_at: null })).toBe(false);
	});
});
