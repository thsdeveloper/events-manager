import { History } from 'lucide-react';
import { formatRelativeDate } from '../lib/dates';
import type { CmsActivityEntry } from '../types';

const ACTION_LABELS: Record<string, string> = {
	create: 'criou',
	update: 'atualizou',
	delete: 'excluiu',
	publish: 'publicou',
	unpublish: 'despublicou',
	reorder: 'reordenou',
	preview: 'gerou uma pré-visualização',
};

const RESOURCE_LABELS: Record<string, string> = {
	page: 'a página',
	page_block: 'um bloco',
	block: 'um bloco',
	post: 'o post',
	navigation: 'o menu',
	navigation_item: 'um item de menu',
	form: 'o formulário',
	redirect: 'o redirecionamento',
	media: 'um arquivo',
	site: 'as configurações do site',
};

export function describeActivity(entry: CmsActivityEntry) {
	const [verb, ...rest] = entry.action.split(/[._:]/);
	const action = ACTION_LABELS[verb] ?? entry.action.replace(/[._:]/g, ' ');
	const resource = RESOURCE_LABELS[entry.resource_type] ?? RESOURCE_LABELS[rest.join('_')] ?? entry.resource_type;

	return `${action} ${resource}`.trim();
}

export function actorName(entry: CmsActivityEntry) {
	if (!entry.actor) return 'Sistema';
	const name = [entry.actor.first_name, entry.actor.last_name].filter(Boolean).join(' ');

	return name || entry.actor.email || 'Alguém';
}

export function ActivityPanel({ entries }: { entries: CmsActivityEntry[] }) {
	if (entries.length === 0) {
		return <p className="text-sm text-slate-500">Nenhuma atividade registrada ainda.</p>;
	}

	return (
		<ol className="space-y-3" aria-label="Atividade recente">
			{entries.map((entry) => (
				<li key={entry.id} className="flex gap-3 text-sm">
					<span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
						<History className="size-3.5" />
					</span>
					<div className="min-w-0">
						<p className="text-slate-800">
							<span className="font-medium text-slate-950">{actorName(entry)}</span> {describeActivity(entry)}
						</p>
						<p className="text-xs text-slate-500">
							<time dateTime={entry.date_created} title={new Date(entry.date_created).toLocaleString('pt-BR')}>
								{formatRelativeDate(entry.date_created)}
							</time>
						</p>
					</div>
				</li>
			))}
		</ol>
	);
}
