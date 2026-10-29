/**
 * O tema de tipografia (`prose`) não pode fixar o tamanho do parágrafo em
 * rem: isso ignorava `prose-sm`/`prose-base`/`prose-lg` e deixava todo texto
 * rico com 20px, do editor à página pública. O tamanho vem do contêiner; os
 * títulos escalam em `em`, proporcionais a ele.
 */
import { describe, expect, it } from 'vitest';
import config from '../../tailwind.config';

type ProseCss = Record<string, Record<string, string | undefined>>;

function proseCss(): ProseCss {
	const typography = (config.theme?.extend as { typography?: { DEFAULT?: { css?: ProseCss } } } | undefined)
		?.typography;

	return typography?.DEFAULT?.css ?? {};
}

describe('tipografia do texto rico', () => {
	it('lets paragraphs inherit the size of their prose container', () => {
		expect(proseCss().p?.fontSize).toBeUndefined();
	});

	it('scales headings relative to the container instead of fixed viewport sizes', () => {
		for (const heading of ['h1', 'h2', 'h3']) {
			expect(proseCss()[heading]?.fontSize, heading).toMatch(/em$/);
		}
	});
});
