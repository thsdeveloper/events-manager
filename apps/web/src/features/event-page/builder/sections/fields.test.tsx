/**
 * Formulários de cada tipo de seção da página do evento. Cada campo editado
 * devolve a seção inteira atualizada; listas (programação, palestrantes,
 * perguntas, fotos, apoiadores) adicionam, editam, reordenam e removem itens.
 */
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { buildEventPageSection, type EventPageSection, type EventPageSectionType } from '@events-manager/contracts';
import { renderWithProviders } from '@/test';
import { SectionFields } from './fields';

const MEDIA = '00000000-0000-4000-8000-000000000051';

vi.mock('@/components/admin/ImageUpload', () => ({
	default: ({
		label,
		value,
		onChange,
	}: {
		label: string;
		value: string | null;
		onChange: (id: string | null) => void;
	}) => (
		<div>
			<span>{`${label}: ${value ?? 'vazio'}`}</span>
			<button type="button" onClick={() => onChange('00000000-0000-4000-8000-000000000051')}>
				{`Enviar ${label}`}
			</button>
		</div>
	),
}));
vi.mock('@/features/cms/components/RichTextEditor', () => ({
	RichTextEditor: ({ label, value, onChange }: { label: string; value: string; onChange: (html: string) => void }) => (
		<textarea aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
	),
}));

/** Só os tipos com lista têm `items`; para os demais devolve vazio. */
function itemsOf(section: EventPageSection): Array<Record<string, unknown>> {
	return 'items' in section ? (section.items as Array<Record<string, unknown>>) : [];
}

function Harness({ initial, onChange }: { initial: EventPageSection; onChange: (value: EventPageSection) => void }) {
	const [value, setValue] = useState(initial);

	return (
		<SectionFields
			value={value}
			onChange={(next) => {
				setValue(next);
				onChange(next);
			}}
		/>
	);
}

function setup(type: EventPageSectionType, patch: Partial<EventPageSection> = {}) {
	const onChange = vi.fn<(value: EventPageSection) => void>();
	const initial = { ...buildEventPageSection(type), ...patch } as EventPageSection;
	const view = renderWithProviders(<Harness initial={initial} onChange={onChange} />);
	const latest = () => onChange.mock.calls.at(-1)?.[0] as EventPageSection;

	return { ...view, latest, onChange };
}

describe('SectionFields', () => {
	it('edits the hero: subtitle, background image, button label and the date and place toggles', async () => {
		const { latest, user } = setup('hero');

		await user.type(screen.getByLabelText('Subtítulo'), 'Três dias');
		await user.click(screen.getByRole('button', { name: 'Enviar Imagem de fundo' }));
		await user.clear(screen.getByLabelText('Texto do botão'));
		await user.type(screen.getByLabelText('Texto do botão'), 'Garanta');
		await user.click(screen.getByRole('checkbox', { name: 'Mostrar data' }));

		expect(latest()).toMatchObject({ subtitle: 'Três dias', image: MEDIA, ctaLabel: 'Garanta', showDate: false });
	});

	it('edits the free text of "about" and "richtext" through the rich editor', async () => {
		const about = setup('about');
		await about.user.type(screen.getByLabelText('Texto'), '<p>Oi</p>');
		expect(about.latest()).toMatchObject({ type: 'about', content: '<p>Oi</p>' });
		about.unmount();

		const richtext = setup('richtext');
		await richtext.user.type(screen.getByLabelText('Texto'), 'x');
		expect(richtext.latest()).toMatchObject({ type: 'richtext', content: 'x' });
	});

	it('edits the tickets note and button, the location note and map toggle, and the countdown caption', async () => {
		const tickets = setup('tickets');
		await tickets.user.type(screen.getByLabelText('Observação'), 'Meia com carteirinha');
		expect(tickets.latest()).toMatchObject({ note: 'Meia com carteirinha' });
		tickets.unmount();

		const location = setup('location');
		await location.user.type(screen.getByLabelText('Como chegar'), 'Metrô');
		await location.user.click(screen.getByRole('checkbox', { name: 'Mostrar mapa' }));
		expect(location.latest()).toMatchObject({ note: 'Metrô', showMap: false });
		location.unmount();

		const countdown = setup('countdown');
		await countdown.user.type(screen.getByLabelText('Legenda'), 'Falta pouco');
		expect(countdown.latest()).toMatchObject({ label: 'Falta pouco' });
	});

	it('edits the call to action and lets it point to an external link', async () => {
		const { latest, user } = setup('cta');

		await user.clear(screen.getByLabelText('Chamada'));
		await user.type(screen.getByLabelText('Chamada'), 'Vem');
		await user.type(screen.getByLabelText('Texto de apoio'), 'Vagas limitadas');
		expect(latest()).toMatchObject({ headline: 'Vem', text: 'Vagas limitadas', target: 'tickets' });
		expect(screen.queryByLabelText('Link externo')).not.toBeInTheDocument();
	});

	it('builds the schedule: adds an activity, fills it in, reorders and removes', async () => {
		const { latest, user } = setup('schedule');

		await user.click(screen.getByRole('button', { name: 'Adicionar atividade' }));
		await user.click(screen.getByRole('button', { name: 'Adicionar atividade' }));
		const [first] = screen.getAllByRole('listitem');
		await user.type(within(first).getByLabelText('Horário'), '09:00');
		await user.type(within(first).getByLabelText('Atividade'), 'Abertura');
		await user.type(within(first).getByLabelText('Quem conduz'), 'Ana');
		await user.type(within(first).getByLabelText('Descrição'), 'Boas-vindas');
		expect(itemsOf(latest())[0]).toMatchObject({
			time: '09:00',
			title: 'Abertura',
			speaker: 'Ana',
			description: 'Boas-vindas',
		});

		await user.click(screen.getByRole('button', { name: 'Mover Abertura para baixo' }));
		expect(itemsOf(latest())[1]).toMatchObject({ title: 'Abertura' });

		await user.click(screen.getByRole('button', { name: 'Remover Abertura' }));
		expect(itemsOf(latest())).toHaveLength(1);
	});

	it('builds the speakers list with photo, role and bio', async () => {
		const { latest, user } = setup('speakers');

		await user.click(screen.getByRole('button', { name: 'Adicionar palestrante' }));
		await user.type(screen.getByLabelText('Nome'), 'Ana Lima');
		await user.type(screen.getByLabelText('Cargo ou papel'), 'CTO');
		await user.type(screen.getByLabelText('Minibio'), 'Programa há 20 anos.');
		await user.click(screen.getByRole('button', { name: 'Enviar Foto' }));

		expect(itemsOf(latest())[0]).toMatchObject({
			name: 'Ana Lima',
			role: 'CTO',
			bio: 'Programa há 20 anos.',
			photo: MEDIA,
		});
	});

	it('builds the FAQ, the gallery and the sponsors', async () => {
		const faq = setup('faq');
		await faq.user.click(screen.getByRole('button', { name: 'Adicionar pergunta' }));
		await faq.user.type(screen.getByLabelText('Pergunta'), 'Tem estacionamento?');
		await faq.user.type(screen.getByLabelText('Resposta'), 'Sim.');
		expect(itemsOf(faq.latest())[0]).toMatchObject({
			question: 'Tem estacionamento?',
			answer: 'Sim.',
		});
		faq.unmount();

		const gallery = setup('gallery');
		await gallery.user.click(screen.getByRole('button', { name: 'Adicionar foto' }));
		await gallery.user.click(screen.getByRole('button', { name: 'Enviar Foto' }));
		await gallery.user.type(screen.getByLabelText('Legenda'), 'Palco');
		expect(itemsOf(gallery.latest())[0]).toMatchObject({
			image: MEDIA,
			caption: 'Palco',
		});
		gallery.unmount();

		const sponsors = setup('sponsors');
		await sponsors.user.click(screen.getByRole('button', { name: 'Adicionar apoiador' }));
		await sponsors.user.type(screen.getByLabelText('Nome'), 'ACME');
		await sponsors.user.click(screen.getByRole('button', { name: 'Enviar Logo' }));
		await sponsors.user.type(screen.getByLabelText('Site (opcional)'), 'https://acme.dev');
		expect(itemsOf(sponsors.latest())[0]).toMatchObject({
			name: 'ACME',
			logo: MEDIA,
			url: 'https://acme.dev',
		});
	});

	it('stops adding items at the limit of the section', async () => {
		const items = Array.from({ length: 40 }, (_, index) => ({ id: `q-${index}`, question: `P${index}`, answer: 'r' }));
		setup('faq', { items } as Partial<EventPageSection>);

		expect(screen.getByRole('button', { name: 'Adicionar pergunta' })).toBeDisabled();
	});
});
