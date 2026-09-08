'use client';

import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { firstError } from '../../lib/validation';
import type { CmsRichtextItem } from '../../types';
import { Field, FieldError } from '../FormPrimitives';
import { RichTextEditor } from '../RichTextEditor';
import type { BlockFieldsProps, BlockFormDefinition } from './types';

export interface RichtextState {
	tagline: string;
	headline: string;
	content: string;
	alignment: 'left' | 'center';
}

function RichtextFields({ value, onChange, errors }: BlockFieldsProps<RichtextState>) {
	const id = useId();
	const update = (patch: Partial<RichtextState>) => onChange({ ...value, ...patch });

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
			<div className="space-y-1.5">
				<Label htmlFor={`${id}-alignment`}>Alinhamento</Label>
				<Select
					value={value.alignment}
					onValueChange={(alignment) => update({ alignment: alignment as RichtextState['alignment'] })}
				>
					<SelectTrigger id={`${id}-alignment`}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="left">À esquerda</SelectItem>
						<SelectItem value="center">Centralizado</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-1.5">
				<Label>Conteúdo</Label>
				<RichTextEditor value={value.content} onChange={(content) => update({ content })} />
				<FieldError message={firstError(errors, 'content')} />
			</div>
		</div>
	);
}

export const richtextBlockForm: BlockFormDefinition<CmsRichtextItem, RichtextState> = {
	Fields: RichtextFields,
	fromItem: (item) => ({
		tagline: item?.tagline ?? '',
		headline: item?.headline ?? '',
		content: item?.content ?? '',
		alignment: item?.alignment ?? 'left',
	}),
	toPayload: (state) => ({
		tagline: state.tagline || null,
		headline: state.headline || null,
		// Um editor "vazio" ainda devolve <p></p>; o contrato exige conteúdo de verdade.
		content: /^(<p>\s*<\/p>)*$/.test(state.content.trim()) ? '' : state.content,
		alignment: state.alignment,
	}),
};
