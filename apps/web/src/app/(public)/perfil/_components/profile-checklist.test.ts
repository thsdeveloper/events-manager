import { describe, expect, it } from 'vitest';
import { getProfileChecklist, getProfileCompletion, type ProfileUser } from './types';

const empty: ProfileUser = {
	id: 'u1',
	email: 'ana@example.com',
	first_name: null,
	last_name: null,
	avatar: null,
	birth_date: null,
	document: null,
	phone: null,
	phone_verified_at: null,
	location: null,
	description: null,
	city_id: null,
};

const complete: ProfileUser = {
	...empty,
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

describe('getProfileChecklist', () => {
	it('lists every piece of the profile with its state and where to fill it in', () => {
		const items = getProfileChecklist(empty);

		expect(items.map((item) => item.label)).toEqual([
			'Nome e sobrenome',
			'Foto de perfil',
			'Data de nascimento',
			'CPF',
			'Telefone',
			'Telefone confirmado',
			'Localização',
			'Sobre você',
		]);
		expect(items.every((item) => !item.complete)).toBe(true);
		expect(items.find((item) => item.label === 'Foto de perfil')?.section).toBe('overview');
		expect(items.find((item) => item.label === 'CPF')?.section).toBe('personal');
	});

	it('marks items as done as the profile is filled in', () => {
		const items = getProfileChecklist({ ...empty, first_name: 'Ana', last_name: 'Silva', phone: '11999990000' });
		const done = items.filter((item) => item.complete).map((item) => item.label);

		expect(done).toEqual(['Nome e sobrenome', 'Telefone']);
	});

	it('keeps "Telefone confirmado" pending until the saved phone has been verified', () => {
		// The API clears phone_verified_at whenever the phone changes, so a saved
		// user never carries a verification for a different number.
		const unverified = getProfileChecklist({ ...complete, phone_verified_at: null });

		expect(unverified.find((item) => item.label === 'Telefone')?.complete).toBe(true);
		expect(unverified.find((item) => item.label === 'Telefone confirmado')?.complete).toBe(false);
		expect(getProfileChecklist(complete).every((item) => item.complete)).toBe(true);
	});
});

describe('getProfileCompletion', () => {
	it('derives the percentage from the same checklist the card shows', () => {
		expect(getProfileCompletion(empty)).toBe(0);
		expect(getProfileCompletion({ ...empty, first_name: 'Ana', last_name: 'Silva', avatar: 'media-1' })).toBe(25);
		expect(getProfileCompletion(complete)).toBe(100);
	});
});
