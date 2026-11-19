import { EVENT_PAGE_SECTION_META, type EventPageLayout } from '@events-manager/contracts';
const labels: Record<string, string> = {
	header: 'Cabeçalho',
	footer: 'Rodapé',
	theme: 'Aparência',
	anchor: 'Âncora do link',
	title: 'Título',
	image: 'Imagem',
	logo: 'Logo',
	photo: 'Foto',
	url: 'Site',
	content: 'Conteúdo',
	note: 'Observação',
	label: 'Texto',
	ctaLabel: 'Texto do botão',
	subtitle: 'Subtítulo',
	name: 'Nome',
	question: 'Pergunta',
	answer: 'Resposta',
	time: 'Horário',
	headline: 'Chamada',
	buttonLabel: 'Texto do botão',
	target: 'Destino do botão',
	sections: 'Seções',
	nav: 'Links do menu',
	items: 'Itens',
};
export function describePageFieldIssue(issue: { path: PropertyKey[]; message: string }, layout: EventPageLayout) {
	const { path } = issue;
	const section = path[0] === 'sections' && typeof path[1] === 'number' ? layout.sections[path[1]] : null;
	const scope = section ? EVENT_PAGE_SECTION_META[section.type].label : (labels[String(path[0])] ?? 'Página');
	const itemIndex = path.indexOf('items');
	const item =
		itemIndex >= 0 && typeof path[itemIndex + 1] === 'number' ? `Item ${Number(path[itemIndex + 1]) + 1}` : null;
	const field = String(path.at(-1));
	const label = labels[field] ?? 'Campo';
	const message = ['image', 'logo', 'photo'].includes(field) ? 'Escolha uma imagem para este campo.' : issue.message;

	return `${[scope, item, label].filter(Boolean).join(' · ')}: ${message}`;
}
