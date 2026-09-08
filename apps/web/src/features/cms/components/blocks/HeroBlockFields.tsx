'use client';

import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { firstError } from '../../lib/validation';
import type { CmsHeroItem, CmsMedia } from '../../types';
import { ButtonListEditor, buttonFromRow, buttonToPayload, type ButtonState } from '../ButtonEditor';
import { Field } from '../FormPrimitives';
import { MediaPicker } from '../MediaPicker';
import type { BlockFieldsProps, BlockFormDefinition } from './types';

export interface HeroState {
	tagline: string;
	headline: string;
	description: string;
	layout: CmsHeroItem['layout'];
	image: CmsMedia | null;
	buttons: ButtonState[];
}

const layouts: Array<{ value: HeroState['layout']; label: string }> = [
	{ value: 'image_right', label: 'Imagem à direita' },
	{ value: 'image_left', label: 'Imagem à esquerda' },
	{ value: 'image_center', label: 'Imagem centralizada' },
];

function HeroFields({ value, onChange, errors }: BlockFieldsProps<HeroState>) {
	const id = useId();
	const update = (patch: Partial<HeroState>) => onChange({ ...value, ...patch });

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
				label="Título principal"
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
			<Field
				id={`${id}-description`}
				label="Descrição"
				counter={{ value: value.description, max: 500 }}
				error={firstError(errors, 'description')}
			>
				<Textarea
					id={`${id}-description`}
					rows={3}
					value={value.description}
					maxLength={500}
					onChange={(event) => update({ description: event.target.value })}
				/>
			</Field>
			<div className="space-y-1.5">
				<Label htmlFor={`${id}-layout`}>Layout</Label>
				<Select value={value.layout} onValueChange={(layout) => update({ layout: layout as HeroState['layout'] })}>
					<SelectTrigger id={`${id}-layout`}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{layouts.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-1.5">
				<Label>Imagem</Label>
				<MediaPicker value={value.image} onChange={(image) => update({ image })} label="imagem do hero" compact />
			</div>
			<ButtonListEditor value={value.buttons} onChange={(buttons) => update({ buttons })} errors={errors} />
		</div>
	);
}

export const heroBlockForm: BlockFormDefinition<CmsHeroItem, HeroState> = {
	Fields: HeroFields,
	fromItem: (item) => ({
		tagline: item?.tagline ?? '',
		headline: item?.headline ?? '',
		description: item?.description ?? '',
		layout: item?.layout ?? 'image_right',
		image: item?.image ?? null,
		buttons: (item?.buttons ?? [])
			.map((button) => buttonFromRow(button))
			.filter((button): button is ButtonState => Boolean(button)),
	}),
	toPayload: (state) => ({
		tagline: state.tagline || null,
		headline: state.headline,
		description: state.description || null,
		layout: state.layout,
		image: state.image?.id ?? null,
		buttons: state.buttons.map(buttonToPayload),
	}),
};
