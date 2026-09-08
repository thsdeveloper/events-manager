'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { errorsUnder, firstError } from '../../lib/validation';
import type { CmsPricingItem } from '../../types';
import { ButtonFields, buttonFromRow, buttonToPayload, emptyButton, type ButtonState } from '../ButtonEditor';
import { Field, FieldError } from '../FormPrimitives';
import type { BlockFieldsProps, BlockFormDefinition } from './types';

export interface PricingCardState {
	id?: string;
	title: string;
	description: string;
	price: string;
	badge: string;
	/** Uma feature por linha. */
	features: string;
	is_highlighted: boolean;
	button: ButtonState | null;
}

export interface PricingState {
	tagline: string;
	headline: string;
	cards: PricingCardState[];
}

function emptyCard(): PricingCardState {
	return { title: '', description: '', price: '', badge: '', features: '', is_highlighted: false, button: null };
}

function CardFields({
	card,
	index,
	total,
	onChange,
	onRemove,
	onMove,
	errors,
}: {
	card: PricingCardState;
	index: number;
	total: number;
	onChange: (card: PricingCardState) => void;
	onRemove: () => void;
	onMove: (to: number) => void;
	errors?: BlockFieldsProps<PricingState>['errors'];
}) {
	const id = useId();
	const prefix = `cards.${index}`;
	const update = (patch: Partial<PricingCardState>) => onChange({ ...card, ...patch });
	const name = `Plano ${index + 1}`;

	return (
		<fieldset aria-label={name} className="space-y-3 rounded-lg border border-slate-200 p-4">
			<div className="flex items-center justify-between gap-2">
				<legend className="text-sm font-semibold">{name}</legend>
				<div className="flex items-center gap-1">
					<Button
						type="button"
						size="icon"
						variant="ghost"
						disabled={index === 0}
						onClick={() => onMove(index - 1)}
						aria-label={`Mover ${name} para cima`}
					>
						<ArrowUp className="size-4" />
					</Button>
					<Button
						type="button"
						size="icon"
						variant="ghost"
						disabled={index === total - 1}
						onClick={() => onMove(index + 1)}
						aria-label={`Mover ${name} para baixo`}
					>
						<ArrowDown className="size-4" />
					</Button>
					<Button
						type="button"
						size="icon"
						variant="ghost"
						onClick={onRemove}
						aria-label={`Remover ${name}`}
						className="text-red-600 hover:bg-red-50 hover:text-red-700"
					>
						<Trash2 className="size-4" />
					</Button>
				</div>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				<Field id={`${id}-title`} label="Nome do plano" error={firstError(errors, `${prefix}.title`)}>
					<Input
						id={`${id}-title`}
						value={card.title}
						maxLength={60}
						onChange={(event) => update({ title: event.target.value })}
					/>
				</Field>
				<Field
					id={`${id}-price`}
					label="Preço"
					error={firstError(errors, `${prefix}.price`)}
					hint="Texto livre, ex.: R$ 49/mês"
				>
					<Input
						id={`${id}-price`}
						value={card.price}
						maxLength={40}
						onChange={(event) => update({ price: event.target.value })}
					/>
				</Field>
				<Field id={`${id}-badge`} label="Selo" error={firstError(errors, `${prefix}.badge`)} hint='Ex.: "Mais popular"'>
					<Input
						id={`${id}-badge`}
						value={card.badge}
						maxLength={30}
						onChange={(event) => update({ badge: event.target.value })}
					/>
				</Field>
				<label className="flex items-center gap-2 self-end pb-2 text-sm">
					<Checkbox
						checked={card.is_highlighted}
						onCheckedChange={(checked) => update({ is_highlighted: checked === true })}
					/>
					Destacar este plano
				</label>
			</div>
			<Field id={`${id}-description`} label="Descrição" error={firstError(errors, `${prefix}.description`)}>
				<Textarea
					id={`${id}-description`}
					rows={2}
					value={card.description}
					maxLength={200}
					onChange={(event) => update({ description: event.target.value })}
				/>
			</Field>
			<Field id={`${id}-features`} label="Recursos (um por linha)" error={errorsUnder(errors, `${prefix}.features`)[0]}>
				<Textarea
					id={`${id}-features`}
					rows={4}
					value={card.features}
					onChange={(event) => update({ features: event.target.value })}
				/>
			</Field>
			{card.button ? (
				<ButtonFields
					name={`Botão do ${name.toLowerCase()}`}
					value={card.button}
					onChange={(button) => update({ button })}
					onRemove={() => update({ button: null })}
					errors={errors}
					errorPrefix={`${prefix}.button`}
				/>
			) : (
				<Button type="button" size="sm" variant="outline" onClick={() => update({ button: emptyButton() })}>
					<Plus className="mr-2 size-4" />
					Adicionar botão
				</Button>
			)}
		</fieldset>
	);
}

function PricingFields({ value, onChange, errors }: BlockFieldsProps<PricingState>) {
	const id = useId();
	const update = (patch: Partial<PricingState>) => onChange({ ...value, ...patch });
	const move = (from: number, to: number) => {
		if (to < 0 || to >= value.cards.length) return;
		const cards = [...value.cards];
		const [card] = cards.splice(from, 1);
		cards.splice(to, 0, card);
		update({ cards });
	};

	return (
		<div className="space-y-5">
			<Field
				id={`${id}-tagline`}
				label="Tagline"
				counter={{ value: value.tagline, max: 80 }}
				error={firstError(errors, 'tagline')}
			>
				<Input
					id={`${id}-tagline`}
					value={value.tagline}
					maxLength={80}
					onChange={(event) => update({ tagline: event.target.value })}
				/>
			</Field>
			<Field
				id={`${id}-headline`}
				label="Título"
				counter={{ value: value.headline, max: 150 }}
				error={firstError(errors, 'headline')}
			>
				<Input
					id={`${id}-headline`}
					value={value.headline}
					maxLength={150}
					onChange={(event) => update({ headline: event.target.value })}
				/>
			</Field>
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<Label>Planos ({value.cards.length}/6)</Label>
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={value.cards.length >= 6}
						onClick={() => update({ cards: [...value.cards, emptyCard()] })}
					>
						<Plus className="mr-2 size-4" />
						Adicionar plano
					</Button>
				</div>
				{value.cards.map((card, index) => (
					<CardFields
						key={card.id ?? index}
						card={card}
						index={index}
						total={value.cards.length}
						errors={errors}
						onChange={(next) => update({ cards: value.cards.map((current, i) => (i === index ? next : current)) })}
						onRemove={() => update({ cards: value.cards.filter((_, i) => i !== index) })}
						onMove={(to) => move(index, to)}
					/>
				))}
				<FieldError message={firstError(errors, 'cards')} />
			</div>
		</div>
	);
}

export const pricingBlockForm: BlockFormDefinition<CmsPricingItem, PricingState> = {
	Fields: PricingFields,
	fromItem: (item) => ({
		tagline: item?.tagline ?? '',
		headline: item?.headline ?? '',
		cards: (item?.cards ?? []).map((card) => ({
			id: card.id,
			title: card.title,
			description: card.description ?? '',
			price: card.price ?? '',
			badge: card.badge ?? '',
			features: (card.features ?? []).join('\n'),
			is_highlighted: card.is_highlighted,
			button: buttonFromRow(card.button),
		})),
	}),
	toPayload: (state) => ({
		tagline: state.tagline || null,
		headline: state.headline || null,
		cards: state.cards.map((card) => ({
			...(card.id ? { id: card.id } : {}),
			title: card.title,
			description: card.description || null,
			price: card.price || null,
			badge: card.badge || null,
			features: card.features
				.split('\n')
				.map((line) => line.trim())
				.filter(Boolean),
			is_highlighted: card.is_highlighted,
			button: card.button ? buttonToPayload(card.button) : null,
		})),
	}),
};
