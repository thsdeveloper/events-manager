'use client';

import { useId } from 'react';
import type { CmsSeo } from '@events-manager/contracts';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { FieldErrors } from '../api/client';
import { firstError } from '../lib/validation';
import type { CmsMedia } from '../types';
import { Field } from './FormPrimitives';
import { MediaPicker } from './MediaPicker';

export const SEO_TITLE_MAX = 70;
export const SEO_DESCRIPTION_MAX = 160;

const frequencies: Array<{ value: NonNullable<CmsSeo['sitemap']>['change_frequency']; label: string }> = [
	{ value: 'always', label: 'Sempre' },
	{ value: 'hourly', label: 'A cada hora' },
	{ value: 'daily', label: 'Diária' },
	{ value: 'weekly', label: 'Semanal' },
	{ value: 'monthly', label: 'Mensal' },
	{ value: 'yearly', label: 'Anual' },
	{ value: 'never', label: 'Nunca' },
];

interface SeoFieldsProps {
	value: CmsSeo | null;
	onChange: (seo: CmsSeo) => void;
	/** URL pública usada no preview. */
	url: string;
	/** Título usado no preview quando o título SEO está vazio. */
	fallbackTitle: string;
	/** Mídia da imagem OG já carregada (para mostrar a miniatura). */
	ogImage?: CmsMedia | null;
	onOgImageChange?: (media: CmsMedia | null) => void;
	errors?: FieldErrors | null;
}

const emptySeo: CmsSeo = { no_index: false, no_follow: false };

export function SeoFields({ value, onChange, url, fallbackTitle, ogImage, onOgImageChange, errors }: SeoFieldsProps) {
	const id = useId();
	const seo = value ?? emptySeo;
	const update = (patch: Partial<CmsSeo>) => onChange({ ...seo, ...patch });
	const previewTitle = seo.title?.trim() || fallbackTitle || 'Sem título';
	const previewDescription =
		seo.meta_description?.trim() ||
		'Adicione uma meta description para controlar o texto exibido nos resultados de busca.';
	const currentOg: CmsMedia | null = ogImage ?? (seo.og_image ? { id: seo.og_image } : null);

	return (
		<div className="space-y-5">
			<section aria-label="Pré-visualização na busca" className="rounded-lg border border-slate-200 bg-slate-50 p-4">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Como aparece no Google</p>
				<div className="mt-3 rounded-lg bg-white p-4 shadow-sm">
					<p className="truncate text-xs text-emerald-700">{url}</p>
					<p className="mt-1 truncate text-lg text-blue-700">{previewTitle}</p>
					<p className="mt-1 line-clamp-2 text-sm text-slate-600">{previewDescription}</p>
				</div>
			</section>

			<Field
				id={`${id}-title`}
				label="Título SEO"
				counter={{ value: seo.title, max: SEO_TITLE_MAX }}
				error={firstError(errors, 'seo.title')}
				hint="Vazio usa o título do conteúdo."
			>
				<Input
					id={`${id}-title`}
					value={seo.title ?? ''}
					maxLength={SEO_TITLE_MAX}
					onChange={(event) => update({ title: event.target.value })}
				/>
			</Field>

			<Field
				id={`${id}-description`}
				label="Meta description"
				counter={{ value: seo.meta_description, max: SEO_DESCRIPTION_MAX }}
				error={firstError(errors, 'seo.meta_description')}
			>
				<Textarea
					id={`${id}-description`}
					rows={3}
					value={seo.meta_description ?? ''}
					maxLength={SEO_DESCRIPTION_MAX}
					onChange={(event) => update({ meta_description: event.target.value })}
					className="resize-none"
				/>
			</Field>

			<div className="space-y-1.5">
				<Label>Imagem para redes sociais (Open Graph)</Label>
				<MediaPicker
					value={currentOg}
					label="imagem OG"
					compact
					onChange={(media) => {
						update({ og_image: media?.id ?? null });
						onOgImageChange?.(media);
					}}
				/>
			</div>

			<Field
				id={`${id}-canonical`}
				label="URL canônica"
				hint="Só preencha se este conteúdo for uma cópia de outra URL."
				error={firstError(errors, 'seo.canonical_url')}
			>
				<Input
					id={`${id}-canonical`}
					type="url"
					placeholder="https://"
					value={seo.canonical_url ?? ''}
					onChange={(event) => update({ canonical_url: event.target.value || null })}
				/>
			</Field>

			<div className="grid gap-3 sm:grid-cols-2">
				<label className="flex items-center gap-2 text-sm">
					<Checkbox
						checked={seo.no_index}
						onCheckedChange={(checked) => update({ no_index: checked === true })}
						aria-label="Não indexar (noindex)"
					/>
					Não indexar (noindex)
				</label>
				<label className="flex items-center gap-2 text-sm">
					<Checkbox
						checked={seo.no_follow}
						onCheckedChange={(checked) => update({ no_follow: checked === true })}
						aria-label="Não seguir links (nofollow)"
					/>
					Não seguir links (nofollow)
				</label>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor={`${id}-frequency`}>Frequência no sitemap</Label>
					<Select
						value={seo.sitemap?.change_frequency ?? 'weekly'}
						onValueChange={(frequency) =>
							update({
								sitemap: {
									change_frequency: frequency as NonNullable<CmsSeo['sitemap']>['change_frequency'],
									priority: seo.sitemap?.priority ?? 0.5,
								},
							})
						}
					>
						<SelectTrigger id={`${id}-frequency`}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{frequencies.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<Field
					id={`${id}-priority`}
					label="Prioridade no sitemap (0 a 1)"
					error={firstError(errors, 'seo.sitemap.priority')}
				>
					<Input
						id={`${id}-priority`}
						type="number"
						min={0}
						max={1}
						step={0.1}
						value={seo.sitemap?.priority ?? 0.5}
						onChange={(event) =>
							update({
								sitemap: {
									change_frequency: seo.sitemap?.change_frequency ?? 'weekly',
									priority: Number(event.target.value),
								},
							})
						}
					/>
				</Field>
			</div>
		</div>
	);
}
