import type { CmsContentStatus } from '@events-manager/contracts';

export const STATUS_OPTIONS: Array<{ value: CmsContentStatus; label: string; description: string }> = [
	{ value: 'draft', label: 'Rascunho', description: 'Visível só no painel e na pré-visualização.' },
	{ value: 'in_review', label: 'Em revisão', description: 'Pronto para alguém aprovar antes de publicar.' },
	{ value: 'published', label: 'Publicado', description: 'No ar a partir da data de publicação.' },
];

export function statusLabel(status: CmsContentStatus) {
	return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

export const STATUS_STYLES: Record<CmsContentStatus, string> = {
	draft: 'bg-slate-100 text-slate-700',
	in_review: 'bg-amber-50 text-amber-700',
	published: 'bg-emerald-50 text-emerald-700',
};

/** Publicado com data futura: fica no ar só quando a data chegar. */
export function isScheduled(status: CmsContentStatus, publishedAt: string | null) {
	return status === 'published' && Boolean(publishedAt) && new Date(publishedAt as string).getTime() > Date.now();
}
