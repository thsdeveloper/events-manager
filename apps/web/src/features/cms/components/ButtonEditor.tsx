'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FieldErrors } from '../api/client';
import { firstError } from '../lib/validation';
import type { CmsButtonRow } from '../types';
import { ContentPicker, type ContentReference } from './ContentPicker';
import { FieldError } from './FormPrimitives';

/** Estado de edição de um botão: guarda a referência escolhida para exibir o título. */
export interface ButtonState {
	id?: string;
	label: string;
	type: 'url' | 'page' | 'post';
	url: string;
	page: ContentReference | null;
	post: ContentReference | null;
	variant: CmsButtonRow['variant'];
}

export const BUTTON_VARIANTS: Array<{ value: CmsButtonRow['variant']; label: string }> = [
	{ value: 'default', label: 'Principal' },
	{ value: 'outline', label: 'Contorno' },
	{ value: 'soft', label: 'Suave' },
	{ value: 'ghost', label: 'Discreto' },
	{ value: 'link', label: 'Link' },
];

export function emptyButton(): ButtonState {
	return { label: '', type: 'url', url: '', page: null, post: null, variant: 'default' };
}

export function buttonFromRow(row: CmsButtonRow | null | undefined): ButtonState | null {
	if (!row) return null;

	return {
		id: row.id,
		label: row.label,
		type: row.type,
		url: row.url ?? '',
		page: row.page ? { id: row.page, title: 'Página selecionada' } : null,
		post: row.post ? { id: row.post, title: 'Post selecionado' } : null,
		variant: row.variant,
	};
}

export function buttonToPayload(button: ButtonState) {
	return {
		...(button.id ? { id: button.id } : {}),
		label: button.label,
		type: button.type,
		url: button.type === 'url' ? button.url || null : null,
		page: button.type === 'page' ? (button.page?.id ?? null) : null,
		post: button.type === 'post' ? (button.post?.id ?? null) : null,
		variant: button.variant,
	};
}

interface ButtonFieldsProps {
	value: ButtonState;
	onChange: (value: ButtonState) => void;
	errors?: FieldErrors | null;
	/** Prefixo dos erros deste botão (ex.: `buttons.0`). */
	errorPrefix: string;
	name: string;
	onRemove?: () => void;
	onMoveUp?: () => void;
	onMoveDown?: () => void;
}

export function ButtonFields({
	value,
	onChange,
	errors,
	errorPrefix,
	name,
	onRemove,
	onMoveUp,
	onMoveDown,
}: ButtonFieldsProps) {
	const id = useId();
	const update = (patch: Partial<ButtonState>) => onChange({ ...value, ...patch });

	return (
		<fieldset aria-label={name} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
			<div className="flex items-center justify-between gap-2">
				<legend className="text-sm font-semibold text-slate-700">{name}</legend>
				<div className="flex items-center gap-1">
					{onMoveUp && (
						<Button type="button" size="icon" variant="ghost" onClick={onMoveUp} aria-label={`Mover ${name} para cima`}>
							<ArrowUp className="size-4" />
						</Button>
					)}
					{onMoveDown && (
						<Button
							type="button"
							size="icon"
							variant="ghost"
							onClick={onMoveDown}
							aria-label={`Mover ${name} para baixo`}
						>
							<ArrowDown className="size-4" />
						</Button>
					)}
					{onRemove && (
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
					)}
				</div>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="space-y-1.5">
					<Label htmlFor={`${id}-label`}>Texto</Label>
					<Input
						id={`${id}-label`}
						value={value.label}
						maxLength={60}
						onChange={(event) => update({ label: event.target.value })}
					/>
					<FieldError message={firstError(errors, `${errorPrefix}.label`)} />
				</div>
				<div className="space-y-1.5">
					<Label htmlFor={`${id}-variant`}>Estilo</Label>
					<Select
						value={value.variant}
						onValueChange={(variant) => update({ variant: variant as ButtonState['variant'] })}
					>
						<SelectTrigger id={`${id}-variant`}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{BUTTON_VARIANTS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor={`${id}-type`}>Destino</Label>
					<Select value={value.type} onValueChange={(type) => update({ type: type as ButtonState['type'] })}>
						<SelectTrigger id={`${id}-type`}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="url">Endereço (URL)</SelectItem>
							<SelectItem value="page">Página do site</SelectItem>
							<SelectItem value="post">Post do blog</SelectItem>
						</SelectContent>
					</Select>
				</div>
				{value.type === 'url' && (
					<div className="space-y-1.5">
						<Label htmlFor={`${id}-url`}>Endereço</Label>
						<Input
							id={`${id}-url`}
							value={value.url}
							placeholder="/eventos ou https://…"
							onChange={(event) => update({ url: event.target.value })}
						/>
						<FieldError message={firstError(errors, `${errorPrefix}.url`)} />
					</div>
				)}
				{value.type === 'page' && (
					<ContentPicker
						kind="page"
						value={value.page}
						onChange={(page) => update({ page })}
						error={firstError(errors, `${errorPrefix}.page`)}
					/>
				)}
				{value.type === 'post' && (
					<ContentPicker
						kind="post"
						value={value.post}
						onChange={(post) => update({ post })}
						error={firstError(errors, `${errorPrefix}.post`)}
					/>
				)}
			</div>
		</fieldset>
	);
}

interface ButtonListEditorProps {
	value: ButtonState[];
	onChange: (value: ButtonState[]) => void;
	errors?: FieldErrors | null;
	max?: number;
}

export function ButtonListEditor({ value, onChange, errors, max = 4 }: ButtonListEditorProps) {
	const move = (from: number, to: number) => {
		if (to < 0 || to >= value.length) return;
		const next = [...value];
		const [item] = next.splice(from, 1);
		next.splice(to, 0, item);
		onChange(next);
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<p className="text-sm font-medium">Botões</p>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={value.length >= max}
					onClick={() => onChange([...value, emptyButton()])}
				>
					<Plus className="mr-2 size-4" />
					Adicionar botão
				</Button>
			</div>
			{value.length === 0 && <p className="text-xs text-slate-500">Nenhum botão. Até {max} por bloco.</p>}
			{value.map((button, index) => (
				<ButtonFields
					key={button.id ?? index}
					name={`Botão ${index + 1}`}
					value={button}
					errors={errors}
					errorPrefix={`buttons.${index}`}
					onChange={(next) => onChange(value.map((current, i) => (i === index ? next : current)))}
					onRemove={() => onChange(value.filter((_, i) => i !== index))}
					onMoveUp={index > 0 ? () => move(index, index - 1) : undefined}
					onMoveDown={index < value.length - 1 ? () => move(index, index + 1) : undefined}
				/>
			))}
		</div>
	);
}
