'use client';

import { newEventPageItemId, type EventPageSection } from '@events-manager/contracts';
import ImageUpload from '@/components/admin/ImageUpload';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/features/cms/components/RichTextEditor';
import { ItemListEditor } from './ItemListEditor';

/** Contrato de cada formulário de seção: recebe a seção e devolve a seção alterada. */
export interface SectionFieldsProps<Section extends EventPageSection> {
	value: Section;
	onChange: (value: Section) => void;
}

type Of<Type extends EventPageSection['type']> = Extract<EventPageSection, { type: Type }>;
type ItemOf<Type extends 'schedule' | 'speakers' | 'faq' | 'gallery' | 'sponsors'> = Of<Type>['items'][number];

function Field({ id, label, children, hint }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
	return (
		<div className="space-y-1.5">
			<Label htmlFor={id}>{label}</Label>
			{children}
			{hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
		</div>
	);
}

function Toggle({
	id,
	label,
	checked,
	onChange,
}: {
	id: string;
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm">
			<Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} />
			{label}
		</label>
	);
}

export function HeroFields({ value, onChange }: SectionFieldsProps<Of<'hero'>>) {
	return (
		<>
			<Field id="hero-subtitle" label="Subtítulo">
				<Textarea
					id="hero-subtitle"
					rows={2}
					value={value.subtitle ?? ''}
					onChange={(e) => onChange({ ...value, subtitle: e.target.value })}
				/>
			</Field>
			<ImageUpload
				label="Imagem de fundo"
				value={value.image ?? null}
				onChange={(image) => onChange({ ...value, image })}
				folder="events"
			/>
			<Field id="hero-align" label="Alinhamento">
				<Select
					value={value.align}
					onValueChange={(align) => onChange({ ...value, align: align as Of<'hero'>['align'] })}
				>
					<SelectTrigger id="hero-align">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="left">À esquerda</SelectItem>
						<SelectItem value="center">Centralizado</SelectItem>
					</SelectContent>
				</Select>
			</Field>
			<Field id="hero-cta" label="Texto do botão">
				<Input
					id="hero-cta"
					value={value.ctaLabel}
					onChange={(e) => onChange({ ...value, ctaLabel: e.target.value })}
				/>
			</Field>
			<Toggle
				id="hero-date"
				label="Mostrar data"
				checked={value.showDate}
				onChange={(showDate) => onChange({ ...value, showDate })}
			/>
			<Toggle
				id="hero-location"
				label="Mostrar local"
				checked={value.showLocation}
				onChange={(showLocation) => onChange({ ...value, showLocation })}
			/>
		</>
	);
}

export function AboutFields({ value, onChange }: SectionFieldsProps<Of<'about'>>) {
	return (
		<RichTextEditor
			label="Texto"
			value={value.content}
			onChange={(content) => onChange({ ...value, content })}
			allowImages={false}
		/>
	);
}

export function RichtextFields({ value, onChange }: SectionFieldsProps<Of<'richtext'>>) {
	return (
		<RichTextEditor
			label="Texto"
			value={value.content}
			onChange={(content) => onChange({ ...value, content })}
			allowImages={false}
		/>
	);
}

export function TicketsFields({ value, onChange }: SectionFieldsProps<Of<'tickets'>>) {
	return (
		<>
			<Field
				id="tickets-note"
				label="Observação"
				hint="Aparece acima dos ingressos. Ex.: meia-entrada mediante comprovação."
			>
				<Textarea
					id="tickets-note"
					rows={2}
					value={value.note ?? ''}
					onChange={(e) => onChange({ ...value, note: e.target.value })}
				/>
			</Field>
			<Field id="tickets-cta" label="Texto do botão">
				<Input
					id="tickets-cta"
					value={value.ctaLabel}
					onChange={(e) => onChange({ ...value, ctaLabel: e.target.value })}
				/>
			</Field>
		</>
	);
}

export function ScheduleFields({ value, onChange }: SectionFieldsProps<Of<'schedule'>>) {
	return (
		<ItemListEditor
			items={value.items}
			onChange={(items) => onChange({ ...value, items })}
			create={(): ItemOf<'schedule'> => ({ id: newEventPageItemId(), time: '', title: '' })}
			label={(item, index) => item.title || `Atividade ${index + 1}`}
			addLabel="Adicionar atividade"
			max={60}
		>
			{(item, update) => (
				<>
					<div className="grid gap-3 sm:grid-cols-[120px_1fr]">
						<Field id={`sch-time-${item.id}`} label="Horário">
							<Input
								id={`sch-time-${item.id}`}
								placeholder="09:00"
								value={item.time}
								onChange={(e) => update({ time: e.target.value })}
							/>
						</Field>
						<Field id={`sch-title-${item.id}`} label="Atividade">
							<Input
								id={`sch-title-${item.id}`}
								value={item.title}
								onChange={(e) => update({ title: e.target.value })}
							/>
						</Field>
					</div>
					<Field id={`sch-speaker-${item.id}`} label="Quem conduz">
						<Input
							id={`sch-speaker-${item.id}`}
							value={item.speaker ?? ''}
							onChange={(e) => update({ speaker: e.target.value })}
						/>
					</Field>
					<Field id={`sch-desc-${item.id}`} label="Descrição">
						<Textarea
							id={`sch-desc-${item.id}`}
							rows={2}
							value={item.description ?? ''}
							onChange={(e) => update({ description: e.target.value })}
						/>
					</Field>
				</>
			)}
		</ItemListEditor>
	);
}

export function SpeakersFields({ value, onChange }: SectionFieldsProps<Of<'speakers'>>) {
	return (
		<ItemListEditor
			items={value.items}
			onChange={(items) => onChange({ ...value, items })}
			create={(): ItemOf<'speakers'> => ({ id: newEventPageItemId(), name: '' })}
			label={(item, index) => item.name || `Palestrante ${index + 1}`}
			addLabel="Adicionar palestrante"
			max={40}
		>
			{(item, update) => (
				<>
					<Field id={`spk-name-${item.id}`} label="Nome">
						<Input id={`spk-name-${item.id}`} value={item.name} onChange={(e) => update({ name: e.target.value })} />
					</Field>
					<Field id={`spk-role-${item.id}`} label="Cargo ou papel">
						<Input
							id={`spk-role-${item.id}`}
							value={item.role ?? ''}
							onChange={(e) => update({ role: e.target.value })}
						/>
					</Field>
					<ImageUpload
						label="Foto"
						value={item.photo ?? null}
						onChange={(photo) => update({ photo })}
						folder="events"
						cropAspectRatio={1}
					/>
					<Field id={`spk-bio-${item.id}`} label="Minibio">
						<Textarea
							id={`spk-bio-${item.id}`}
							rows={3}
							value={item.bio ?? ''}
							onChange={(e) => update({ bio: e.target.value })}
						/>
					</Field>
				</>
			)}
		</ItemListEditor>
	);
}

export function LocationFields({ value, onChange }: SectionFieldsProps<Of<'location'>>) {
	return (
		<>
			<Field id="loc-note" label="Como chegar" hint="Referências, estacionamento, transporte público.">
				<Textarea
					id="loc-note"
					rows={3}
					value={value.note ?? ''}
					onChange={(e) => onChange({ ...value, note: e.target.value })}
				/>
			</Field>
			<Toggle
				id="loc-map"
				label="Mostrar mapa"
				checked={value.showMap}
				onChange={(showMap) => onChange({ ...value, showMap })}
			/>
		</>
	);
}

export function FaqFields({ value, onChange }: SectionFieldsProps<Of<'faq'>>) {
	return (
		<ItemListEditor
			items={value.items}
			onChange={(items) => onChange({ ...value, items })}
			create={(): ItemOf<'faq'> => ({ id: newEventPageItemId(), question: '', answer: '' })}
			label={(item, index) => item.question || `Pergunta ${index + 1}`}
			addLabel="Adicionar pergunta"
			max={40}
		>
			{(item, update) => (
				<>
					<Field id={`faq-q-${item.id}`} label="Pergunta">
						<Input
							id={`faq-q-${item.id}`}
							value={item.question}
							onChange={(e) => update({ question: e.target.value })}
						/>
					</Field>
					<Field id={`faq-a-${item.id}`} label="Resposta">
						<Textarea
							id={`faq-a-${item.id}`}
							rows={3}
							value={item.answer}
							onChange={(e) => update({ answer: e.target.value })}
						/>
					</Field>
				</>
			)}
		</ItemListEditor>
	);
}

export function GalleryFields({ value, onChange }: SectionFieldsProps<Of<'gallery'>>) {
	return (
		<ItemListEditor
			items={value.items}
			onChange={(items) => onChange({ ...value, items })}
			create={(): ItemOf<'gallery'> => ({ id: newEventPageItemId(), image: '' })}
			label={(item, index) => item.caption || `Foto ${index + 1}`}
			addLabel="Adicionar foto"
			max={40}
		>
			{(item, update) => (
				<>
					<ImageUpload
						label="Foto"
						value={item.image || null}
						onChange={(image) => update({ image: image ?? '' })}
						folder="events"
						cropAspectRatio={null}
					/>
					<Field id={`gal-cap-${item.id}`} label="Legenda">
						<Input
							id={`gal-cap-${item.id}`}
							value={item.caption ?? ''}
							onChange={(e) => update({ caption: e.target.value })}
						/>
					</Field>
				</>
			)}
		</ItemListEditor>
	);
}

export function SponsorsFields({ value, onChange }: SectionFieldsProps<Of<'sponsors'>>) {
	return (
		<ItemListEditor
			items={value.items}
			onChange={(items) => onChange({ ...value, items })}
			create={(): ItemOf<'sponsors'> => ({ id: newEventPageItemId(), name: '', logo: '' })}
			label={(item, index) => item.name || `Apoiador ${index + 1}`}
			addLabel="Adicionar apoiador"
			max={60}
		>
			{(item, update) => (
				<>
					<Field id={`spo-name-${item.id}`} label="Nome">
						<Input id={`spo-name-${item.id}`} value={item.name} onChange={(e) => update({ name: e.target.value })} />
					</Field>
					<ImageUpload
						label="Logo"
						value={item.logo || null}
						onChange={(logo) => update({ logo: logo ?? '' })}
						folder="events"
						cropAspectRatio={null}
					/>
					<Field id={`spo-url-${item.id}`} label="Site (opcional)">
						<Input
							id={`spo-url-${item.id}`}
							placeholder="https://"
							value={item.url ?? ''}
							onChange={(e) => update({ url: e.target.value || null })}
						/>
					</Field>
				</>
			)}
		</ItemListEditor>
	);
}

export function CtaFields({ value, onChange }: SectionFieldsProps<Of<'cta'>>) {
	const external = value.target !== 'tickets';

	return (
		<>
			<Field id="cta-headline" label="Chamada">
				<Input
					id="cta-headline"
					value={value.headline}
					onChange={(e) => onChange({ ...value, headline: e.target.value })}
				/>
			</Field>
			<Field id="cta-text" label="Texto de apoio">
				<Textarea
					id="cta-text"
					rows={2}
					value={value.text ?? ''}
					onChange={(e) => onChange({ ...value, text: e.target.value })}
				/>
			</Field>
			<Field id="cta-button" label="Texto do botão">
				<Input
					id="cta-button"
					value={value.buttonLabel}
					onChange={(e) => onChange({ ...value, buttonLabel: e.target.value })}
				/>
			</Field>
			<Field id="cta-target" label="Ao clicar">
				<Select
					value={external ? 'url' : 'tickets'}
					onValueChange={(kind) => onChange({ ...value, target: kind === 'tickets' ? 'tickets' : 'https://' })}
				>
					<SelectTrigger id="cta-target">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="tickets">Ir para os ingressos</SelectItem>
						<SelectItem value="url">Abrir um link externo</SelectItem>
					</SelectContent>
				</Select>
			</Field>
			{external ? (
				<Field id="cta-url" label="Link externo">
					<Input id="cta-url" value={value.target} onChange={(e) => onChange({ ...value, target: e.target.value })} />
				</Field>
			) : null}
		</>
	);
}

export function CountdownFields({ value, onChange }: SectionFieldsProps<Of<'countdown'>>) {
	return (
		<Field id="cd-label" label="Legenda" hint="Ex.: Faltam poucos dias para o encontro.">
			<Input id="cd-label" value={value.label ?? ''} onChange={(e) => onChange({ ...value, label: e.target.value })} />
		</Field>
	);
}

/** Formulário de cada tipo de seção, escolhido pela união discriminada. */
export function SectionFields({ value, onChange }: SectionFieldsProps<EventPageSection>) {
	switch (value.type) {
		case 'hero':
			return <HeroFields value={value} onChange={onChange} />;
		case 'about':
			return <AboutFields value={value} onChange={onChange} />;
		case 'tickets':
			return <TicketsFields value={value} onChange={onChange} />;
		case 'schedule':
			return <ScheduleFields value={value} onChange={onChange} />;
		case 'speakers':
			return <SpeakersFields value={value} onChange={onChange} />;
		case 'location':
			return <LocationFields value={value} onChange={onChange} />;
		case 'faq':
			return <FaqFields value={value} onChange={onChange} />;
		case 'gallery':
			return <GalleryFields value={value} onChange={onChange} />;
		case 'sponsors':
			return <SponsorsFields value={value} onChange={onChange} />;
		case 'cta':
			return <CtaFields value={value} onChange={onChange} />;
		case 'countdown':
			return <CountdownFields value={value} onChange={onChange} />;
		case 'richtext':
			return <RichtextFields value={value} onChange={onChange} />;
	}
}
