'use client';

import { useEffect, useId, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { firstError } from '../../lib/validation';
import type { CmsCategoryOption, CmsEventsItem } from '../../types';
import { Field } from '../FormPrimitives';
import type { BlockFieldsProps, BlockFormDefinition } from './types';

export interface EventsState {
	headline: string;
	description: string;
	filter_by_category: string;
	filter_featured: boolean;
	max_items: string;
	show_past_events: boolean;
}

const ANY_CATEGORY = '__all__';

function EventsFields({ value, onChange, errors }: BlockFieldsProps<EventsState>) {
	const id = useId();
	const [categories, setCategories] = useState<CmsCategoryOption[]>([]);
	const update = (patch: Partial<EventsState>) => onChange({ ...value, ...patch });

	useEffect(() => {
		const controller = new AbortController();
		fetch('/api/super-admin/categories', { credentials: 'include', signal: controller.signal })
			.then((response) => (response.ok ? response.json() : { data: [] }))
			.then((body) => setCategories(body.data ?? []))
			.catch(() => {});

		return () => controller.abort();
	}, []);

	return (
		<div className="space-y-5">
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
			<Field
				id={`${id}-description`}
				label="Descrição"
				counter={{ value: value.description, max: 500 }}
				error={firstError(errors, 'description')}
			>
				<Textarea
					id={`${id}-description`}
					rows={2}
					value={value.description}
					maxLength={500}
					onChange={(event) => update({ description: event.target.value })}
				/>
			</Field>
			<div className="space-y-1.5">
				<Label htmlFor={`${id}-category`}>Categoria</Label>
				<Select
					value={value.filter_by_category || ANY_CATEGORY}
					onValueChange={(category) => update({ filter_by_category: category === ANY_CATEGORY ? '' : category })}
				>
					<SelectTrigger id={`${id}-category`}>
						<SelectValue placeholder="Todas as categorias" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ANY_CATEGORY}>Todas as categorias</SelectItem>
						{categories.map((category) => (
							<SelectItem key={category.id} value={category.id}>
								{category.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<Field id={`${id}-max`} label="Máximo de eventos" hint="Entre 1 e 24." error={firstError(errors, 'max_items')}>
				<Input
					id={`${id}-max`}
					type="number"
					min={1}
					max={24}
					value={value.max_items}
					onChange={(event) => update({ max_items: event.target.value })}
				/>
			</Field>
			<div className="grid gap-3 sm:grid-cols-2">
				<label className="flex items-center gap-2 text-sm">
					<Checkbox
						checked={value.filter_featured}
						onCheckedChange={(checked) => update({ filter_featured: checked === true })}
					/>
					Somente eventos em destaque
				</label>
				<label className="flex items-center gap-2 text-sm">
					<Checkbox
						checked={value.show_past_events}
						onCheckedChange={(checked) => update({ show_past_events: checked === true })}
					/>
					Mostrar eventos passados
				</label>
			</div>
		</div>
	);
}

export const eventsBlockForm: BlockFormDefinition<CmsEventsItem, EventsState> = {
	Fields: EventsFields,
	fromItem: (item) => ({
		headline: item?.headline ?? '',
		description: item?.description ?? '',
		filter_by_category: item?.filter_by_category ?? '',
		filter_featured: item?.filter_featured ?? false,
		max_items: String(item?.max_items ?? 10),
		show_past_events: item?.show_past_events ?? false,
	}),
	toPayload: (state) => ({
		headline: state.headline || null,
		description: state.description || null,
		filter_by_category: state.filter_by_category || null,
		filter_featured: state.filter_featured,
		max_items: state.max_items,
		show_past_events: state.show_past_events,
	}),
};
