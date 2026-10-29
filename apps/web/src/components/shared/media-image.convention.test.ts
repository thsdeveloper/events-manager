/**
 * `MediaImage` aceita o arquivo inteiro (`MediaFile`) e, quando ele tem `path`,
 * monta a URL pública do storage. Reduzir o arquivo ao `id` antes de passá-lo
 * joga essa informação fora e força a rota `/api/media/:id`, que responde 302
 * para outra origem — redirecionamento que o otimizador do `next/image` não
 * segue: ele devolve 400 e a imagem some da tela.
 *
 * Este teste varre o front para que o atalho não volte por outro caminho. O
 * contrato do helper está em `src/lib/media.test.ts`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** `uuid={typeof post.image === 'string' ? ... }` e variantes. */
const DISCARDS_MEDIA_FILE = /uuid=\{\s*typeof\s/;

/**
 * Arquivos rastreados e novos (ainda não adicionados), ignorando os que foram
 * apagados ou movidos da árvore de trabalho: a varredura acompanha o código
 * como ele está, não como o índice do git o lembra.
 */
function filesRenderingMediaImage(): string[] {
	const candidates = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '*.tsx'], {
		cwd: process.cwd(),
		encoding: 'utf8',
	})
		.split('\n')
		.filter((file) => file && !file.includes('.test.') && existsSync(file));

	return candidates.filter((file) => readFileSync(file, 'utf8').includes('<MediaImage'));
}

describe('consumidores de MediaImage', () => {
	it('encontra os componentes que renderizam mídia', () => {
		expect(filesRenderingMediaImage().length).toBeGreaterThan(0);
	});

	it('passam o MediaFile inteiro, em vez de reduzi-lo ao id', () => {
		const offenders = filesRenderingMediaImage().filter((file) => DISCARDS_MEDIA_FILE.test(readFileSync(file, 'utf8')));

		expect(offenders).toEqual([]);
	});
});
