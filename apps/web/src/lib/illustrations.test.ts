import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { emptyIllustrations } from './illustrations';

/**
 * Cada ilustração de estado vazio aponta para um SVG real em `public/` e
 * declara o tamanho intrínseco do desenho: os arquivos do Icons8 chegam só
 * com `viewBox`, e sem `width`/`height` explícitos o `<img>` colapsa para zero.
 */
describe('emptyIllustrations', () => {
	it.each(Object.entries(emptyIllustrations))('%s points to a real SVG whose viewBox matches its size', (_, art) => {
		const svg = readFileSync(join(process.cwd(), 'public', art.src), 'utf8');
		const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);

		expect(viewBox).not.toBeNull();
		expect(Math.round(Number(viewBox?.[1]))).toBe(art.width);
		expect(Math.round(Number(viewBox?.[2]))).toBe(art.height);
		expect(svg).not.toMatch(/<script/i);
	});
});
