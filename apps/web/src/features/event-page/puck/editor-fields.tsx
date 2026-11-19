'use client';
import type { Field } from '@puckeditor/core';
import { newEventPageItemId, type EventPageSectionType } from '@events-manager/contracts';
import ImageUpload from '@/components/admin/ImageUpload';
import MediaImage from '@/components/shared/MediaImage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

const text = (label: string): Field => ({ type: 'text', label });
const textarea = (label: string): Field => ({ type: 'textarea', label });
export const toggle = (label: string): Field => ({
	type: 'custom',
	label,
	render: ({ id, value, onChange, readOnly }) => (
		<div className="flex items-center justify-between gap-3 rounded-lg border p-3">
			<Label htmlFor={id}>{label}</Label>
			<Switch aria-label={label} id={id} checked={Boolean(value)} disabled={readOnly} onCheckedChange={onChange} />
		</div>
	),
});
const media = (label: string): Field => ({
	type: 'custom',
	label,
	render: ({ value, onChange, readOnly }) =>
		readOnly ? (
			<div>
				<p className="text-sm">{label}</p>
				{value && <MediaImage uuid={value} alt={label} width={240} height={135} />}
			</div>
		) : (
			<ImageUpload label={label} value={value ?? null} onChange={onChange} folder="events" cropAspectRatio={null} />
		),
});
const richtext: Field = {
	type: 'richtext',
	label: 'Conteúdo',
	contentEditable: false,
	initialHeight: 220,
	options: { textAlign: false, link: { openOnClick: false } },
};
const list = (
	label: string,
	arrayFields: Record<string, Field>,
	defaults: Record<string, unknown>,
	max: number,
): Field => ({
	type: 'array',
	label,
	arrayFields,
	max,
	defaultItemProps: () => ({ id: newEventPageItemId(), ...defaults }),
	getItemSummary: (item) => item.title || item.name || item.question || item.caption || 'Novo item',
});

export const sectionFields: Record<EventPageSectionType, Record<string, Field>> = {
	hero: {
		subtitle: textarea('Subtítulo'),
		image: media('Capa personalizada'),
		align: {
			type: 'radio',
			label: 'Alinhamento',
			options: [
				{ label: 'À esquerda', value: 'left' },
				{ label: 'Centralizado', value: 'center' },
			],
		},
		showDate: toggle('Mostrar data'),
		showLocation: toggle('Mostrar local'),
		ctaLabel: text('Texto do botão de compra'),
	},
	about: { content: richtext },
	tickets: { note: textarea('Orientação para o comprador'), ctaLabel: text('Texto do botão de compra') },
	schedule: {
		items: list(
			'Atividades',
			{
				time: text('Horário'),
				title: text('Atividade'),
				description: textarea('Descrição'),
				speaker: text('Participante'),
			},
			{ time: '10:00', title: 'Nova atividade', description: '', speaker: '' },
			60,
		),
	},
	speakers: {
		items: list(
			'Palestrantes',
			{ name: text('Nome'), role: text('Cargo ou atuação'), photo: media('Foto'), bio: textarea('Minibio') },
			{ name: 'Novo palestrante', role: '', photo: null, bio: '' },
			40,
		),
	},
	location: { note: textarea('Orientações para chegar'), showMap: toggle('Mostrar mapa') },
	faq: {
		items: list(
			'Perguntas',
			{ question: text('Pergunta'), answer: textarea('Resposta') },
			{ question: 'Nova pergunta', answer: '' },
			40,
		),
	},
	gallery: {
		items: list('Fotos', { image: media('Imagem'), caption: text('Legenda') }, { image: null, caption: '' }, 40),
	},
	sponsors: {
		items: list(
			'Apoiadores',
			{ name: text('Nome'), logo: media('Logo'), url: text('Site (opcional)') },
			{ name: 'Novo apoiador', logo: null, url: null },
			60,
		),
	},
	cta: {
		headline: text('Chamada principal'),
		text: textarea('Texto de apoio'),
		buttonLabel: text('Texto do botão'),
		target: text('Destino: tickets ou URL completa'),
	},
	countdown: { label: text('Texto da contagem') },
	richtext: { content: richtext },
};
export const commonFields = {
	title: text('Título da seção'),
	anchor: text('Âncora do link'),
	hidden: toggle('Ocultar seção'),
};

export function rootFields(anchors: Array<{ label: string; value: string }>): Record<string, Field> {
	return {
		header: {
			type: 'object',
			label: 'Cabeçalho e navegação',
			defaultExpanded: true,
			objectFields: {
				title: text('Título no cabeçalho'),
				show: toggle('Mostrar cabeçalho'),
				sticky: toggle('Fixo no topo ao rolar'),
				useOrganizerLogo: toggle('Usar logo da organização'),
				logo: media('Logo personalizada (opcional)'),
				ctaLabel: text('Texto do botão de compra'),
				nav: {
					type: 'array',
					label: 'Links do menu',
					max: 8,
					defaultItemProps: () => ({ label: 'Novo link', anchor: anchors[0]?.value ?? '' }),
					getItemSummary: (item) => item.label || 'Novo link',
					arrayFields: {
						label: text('Texto do link'),
						anchor: { type: 'select', label: 'Seção de destino', options: anchors },
					},
				},
			},
		},
		theme: {
			type: 'object',
			label: 'Cores e aparência',
			objectFields: {
				mode: {
					type: 'radio',
					label: 'Tema',
					options: [
						{ label: 'Claro', value: 'light' },
						{ label: 'Escuro', value: 'dark' },
					],
				},
				accent: {
					type: 'custom',
					label: 'Cor de destaque',
					render: ({ id, value, onChange, readOnly }) => (
						<div className="space-y-2">
							<Label htmlFor={id}>Cor de destaque</Label>
							<Input
								id={id}
								type="color"
								value={value ?? '#743DF5'}
								onChange={(e) => onChange(e.target.value)}
								disabled={readOnly}
							/>
							<Button size="sm" variant="outline" disabled={readOnly} onClick={() => onChange(null)}>
								Usar cor da marca
							</Button>
						</div>
					),
				},
			},
		},
		footer: {
			type: 'object',
			label: 'Rodapé',
			objectFields: { showOrganizer: toggle('Mostrar organizador no rodapé'), note: textarea('Observação do rodapé') },
		},
	};
}
