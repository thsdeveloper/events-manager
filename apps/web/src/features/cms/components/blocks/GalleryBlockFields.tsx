'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mediaLabel } from '../../lib/media';
import { firstError } from '../../lib/validation';
import type { CmsGalleryItem, CmsMedia } from '../../types';
import { Field, FieldError } from '../FormPrimitives';
import { MediaPickerDialog, MediaThumb } from '../MediaPicker';
import type { BlockFieldsProps, BlockFormDefinition } from './types';

export interface GalleryState {
	tagline: string;
	headline: string;
	items: Array<{ id?: string; file: CmsMedia }>;
}

function GalleryFields({ value, onChange, errors }: BlockFieldsProps<GalleryState>) {
	const id = useId();
	const [pickerOpen, setPickerOpen] = useState(false);
	const update = (patch: Partial<GalleryState>) => onChange({ ...value, ...patch });
	const move = (from: number, to: number) => {
		if (to < 0 || to >= value.items.length) return;
		const items = [...value.items];
		const [item] = items.splice(from, 1);
		items.splice(to, 0, item);
		update({ items });
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
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<Label>Imagens ({value.items.length}/60)</Label>
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={value.items.length >= 60}
						onClick={() => setPickerOpen(true)}
					>
						<Plus className="mr-2 size-4" />
						Adicionar imagem
					</Button>
				</div>
				{value.items.length === 0 ? (
					<p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
						Nenhuma imagem na galeria.
					</p>
				) : (
					<ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
						{value.items.map((item, index) => (
							<li
								key={item.id ?? `${item.file.id}-${index}`}
								className="space-y-1 rounded-lg border border-slate-200 p-1.5"
							>
								<MediaThumb media={item.file} className="aspect-square w-full rounded" />
								<p className="truncate px-1 text-xs text-slate-600">{mediaLabel(item.file)}</p>
								<div className="flex items-center justify-end gap-0.5">
									<Button
										type="button"
										size="icon"
										variant="ghost"
										className="size-7"
										disabled={index === 0}
										onClick={() => move(index, index - 1)}
										aria-label={`Mover imagem ${index + 1} para cima`}
									>
										<ArrowUp className="size-3.5" />
									</Button>
									<Button
										type="button"
										size="icon"
										variant="ghost"
										className="size-7"
										disabled={index === value.items.length - 1}
										onClick={() => move(index, index + 1)}
										aria-label={`Mover imagem ${index + 1} para baixo`}
									>
										<ArrowDown className="size-3.5" />
									</Button>
									<Button
										type="button"
										size="icon"
										variant="ghost"
										className="size-7 text-red-600 hover:bg-red-50 hover:text-red-700"
										onClick={() => update({ items: value.items.filter((_, i) => i !== index) })}
										aria-label={`Remover imagem ${index + 1}`}
									>
										<Trash2 className="size-3.5" />
									</Button>
								</div>
							</li>
						))}
					</ul>
				)}
				<FieldError message={firstError(errors, 'items')} />
			</div>
			<MediaPickerDialog
				open={pickerOpen}
				onOpenChange={setPickerOpen}
				onSelect={(file) => {
					update({ items: [...value.items, { file }] });
					setPickerOpen(false);
				}}
			/>
		</div>
	);
}

export const galleryBlockForm: BlockFormDefinition<CmsGalleryItem, GalleryState> = {
	Fields: GalleryFields,
	fromItem: (item) => ({
		tagline: item?.tagline ?? '',
		headline: item?.headline ?? '',
		items: (item?.items ?? []).map((entry) => ({ id: entry.id, file: entry.file })),
	}),
	toPayload: (state) => ({
		tagline: state.tagline || null,
		headline: state.headline || null,
		items: state.items.map((entry) => ({ ...(entry.id ? { id: entry.id } : {}), file: entry.file.id })),
	}),
};
