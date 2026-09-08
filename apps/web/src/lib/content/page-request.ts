/**
 * Leitura dos parâmetros de rota e de query da página pública do CMS. Funções
 * puras para que a página (server component) fique só com a orquestração.
 */

export type SearchParamValue = string | string[] | undefined;

export function resolvePermalink(segments?: string[]): string {
	return `/${(segments ?? []).join('/')}`.replace(/\/+$/, '') || '/';
}

function firstValue(value: SearchParamValue): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

export function parsePageNumber(value: SearchParamValue): number {
	const raw = firstValue(value);
	if (!raw || !/^\d+$/.test(raw)) return 1;
	const parsed = Number(raw);

	return parsed >= 1 ? parsed : 1;
}

export function previewToken(value: SearchParamValue): string | undefined {
	const token = firstValue(value)?.trim();

	return token || undefined;
}

/** Mesma rota sem o token de preview, preservando os demais parâmetros. */
export function previewExitHref(permalink: string, searchParams: Record<string, SearchParamValue>): string {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(searchParams)) {
		if (key === 'preview') continue;
		const single = firstValue(value);
		if (single) query.set(key, single);
	}
	const suffix = query.toString();

	return suffix ? `${permalink}?${suffix}` : permalink;
}

/**
 * A API devolve a página publicada mesmo com token inválido; o aviso de
 * rascunho só faz sentido quando o que está na tela não é a versão pública.
 */
export function isDraftPreview(page: { status?: 'draft' | 'in_review' | 'published' | null }, token?: string): boolean {
	return Boolean(token) && page.status !== 'published';
}

/** Quantidade de páginas de um índice paginado. */
export function pageCount(total: number, perPage: number): number {
	return Math.ceil(Math.max(0, total) / perPage);
}
