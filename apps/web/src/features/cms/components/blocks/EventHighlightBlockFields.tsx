'use client';

import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { firstError } from '../../lib/validation';
import type { CmsBlockItemByCollection } from '../../types';
import { Field } from '../FormPrimitives';
import type { BlockFieldsProps, BlockFormDefinition } from './types';

type HighlightItem = CmsBlockItemByCollection['block_event_highlight'];
type HighlightState = Omit<HighlightItem, 'id' | 'max_items'> & { max_items: string };

function EventHighlightFields({ value, onChange, errors }: BlockFieldsProps<HighlightState>) {
	const id = useId();
	const update = (patch: Partial<HighlightState>) => onChange({ ...value, ...patch });

	return (
		<div className="space-y-5">
			<p className="text-sm text-muted-foreground">
				Os eventos públicos publicados são exibidos automaticamente, dos cadastros mais recentes para os mais antigos.
			</p>
			<div className="space-y-1.5">
				<Label htmlFor={`${id}-mode`}>Exibição</Label>
				<Select
					value={value.display_mode}
					onValueChange={(display_mode: HighlightState['display_mode']) => update({ display_mode })}
				>
					<SelectTrigger id={`${id}-mode`}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="slider">Slider</SelectItem>
						<SelectItem value="single">Destaque único</SelectItem>
					</SelectContent>
				</Select>
			</div>
			{value.display_mode === 'slider' && (
				<Field
					id={`${id}-limit`}
					label="Quantidade de eventos"
					hint="Entre 1 e 12. A navegação usa os botões anterior e próximo."
					error={firstError(errors, 'max_items')}
				>
					<Input
						id={`${id}-limit`}
						type="number"
						min={1}
						max={12}
						value={value.max_items}
						onChange={(event) => update({ max_items: event.target.value })}
					/>
				</Field>
			)}
			<Field
				id={`${id}-label`}
				label="Texto do botão"
				counter={{ value: value.button_label, max: 60 }}
				error={firstError(errors, 'button_label')}
			>
				<Input
					id={`${id}-label`}
					value={value.button_label}
					maxLength={60}
					onChange={(event) => update({ button_label: event.target.value })}
				/>
			</Field>
			<div className="space-y-1.5">
				<Label htmlFor={`${id}-position`}>Foco da imagem</Label>
				<Select
					value={value.image_position}
					onValueChange={(image_position: HighlightState['image_position']) => update({ image_position })}
				>
					<SelectTrigger id={`${id}-position`}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="left">Esquerda</SelectItem>
						<SelectItem value="center">Centro</SelectItem>
						<SelectItem value="right">Direita</SelectItem>
					</SelectContent>
				</Select>
				<p className="text-xs text-muted-foreground">
					Escolha a parte da capa do evento que deve ficar visível no recorte.
				</p>
			</div>
		</div>
	);
}

export const eventHighlightBlockForm: BlockFormDefinition<HighlightItem, HighlightState> = {
	Fields: EventHighlightFields,
	fromItem: (item) => ({
		display_mode: item?.display_mode ?? 'slider',
		max_items: String(item?.max_items ?? 5),
		image_position: item?.image_position ?? 'right',
		button_label: item?.button_label ?? 'Comprar ingressos',
	}),
	toPayload: (state) => ({ ...state, max_items: state.display_mode === 'single' ? 1 : state.max_items }),
};
