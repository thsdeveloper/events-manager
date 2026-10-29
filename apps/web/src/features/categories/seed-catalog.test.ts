/**
 * O catálogo inicial vive no seed do Supabase, mas quem o desenha é o front.
 * Este teste amarra os dois: um ícone gravado no seed que o mapa de ícones não
 * conhece cairia silenciosamente no fallback, e a categoria apareceria genérica
 * no assistente de criação de evento sem que nada quebrasse.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CATEGORY_ICON_NAMES } from './icons';

interface SeedCategory {
	name: string;
	slug: string;
	icon: string;
	color: string;
	sort: number;
}

/** Lê as linhas do `insert into public.event_categories` do seed local. */
function readSeedCategories(): SeedCategory[] {
	const seedPath = fileURLToPath(new URL('../../../../../supabase/seed.sql', import.meta.url));
	const seed = readFileSync(seedPath, 'utf8');
	const insert = /insert into public\.event_categories \([^)]*\)\s*values\s*([\s\S]*?);/i.exec(seed);
	if (!insert) throw new Error('O seed não tem mais um insert em public.event_categories.');

	const rows = insert[1].matchAll(
		/\(\s*'[^']*'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'[^']*'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*(\d+)\s*\)/g,
	);

	return [...rows].map(([, name, slug, icon, color, sort]) => ({
		name,
		slug,
		icon,
		color,
		sort: Number(sort),
	}));
}

describe('catálogo inicial de categorias', () => {
	const categories = readSeedCategories();

	it('entrega um catálogo com variedade suficiente para o organizador escolher', () => {
		expect(categories.length).toBeGreaterThanOrEqual(8);
	});

	it('usa apenas ícones que o front sabe desenhar', () => {
		const unknown = categories.filter((category) => !CATEGORY_ICON_NAMES.includes(category.icon as never));

		expect(unknown.map((category) => `${category.name}: ${category.icon}`)).toEqual([]);
	});

	it('dá a cada categoria um slug, uma cor hexadecimal e uma posição própria', () => {
		expect(new Set(categories.map((category) => category.slug)).size).toBe(categories.length);
		expect(new Set(categories.map((category) => category.sort)).size).toBe(categories.length);
		expect(categories.filter((category) => !/^#[0-9a-f]{6}$/i.test(category.color))).toEqual([]);
	});
});
