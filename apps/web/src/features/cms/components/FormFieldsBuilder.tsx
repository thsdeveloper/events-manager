'use client';

import { CMS_FORM_FIELD_TYPES, slugify } from '@events-manager/contracts';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { FieldErrors } from '../api/client';
import { errorsUnder, firstError } from '../lib/validation';
import type { CmsFormFieldRow } from '../types';
import { Field, FieldError } from './FormPrimitives';

export type FormFieldType = (typeof CMS_FORM_FIELD_TYPES)[number];

export interface FormFieldState {
	/** Preservado para manter as respostas antigas ligadas ao campo. */
	id?: string;
	/** Chave local estável para o React enquanto o campo ainda não tem id. */
	key: string;
	name: string;
	nameTouched: boolean;
	type: FormFieldType;
	label: string;
	placeholder: string;
	help: string;
	validation: string;
	width: CmsFormFieldRow['width'];
	/** Uma opção por linha: "Texto" ou "Texto | valor". */
	choices: string;
	required: boolean;
}

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
	text: 'Texto curto',
	textarea: 'Texto longo',
	checkbox: 'Caixa de seleção',
	checkbox_group: 'Múltipla escolha',
	radio: 'Escolha única',
	select: 'Lista suspensa',
	file: 'Arquivo',
	hidden: 'Oculto',
};

const CHOICE_TYPES = new Set<FormFieldType>(['checkbox_group', 'radio', 'select']);

const WIDTHS: Array<{ value: CmsFormFieldRow['width']; label: string }> = [
	{ value: '100', label: 'Largura total' },
	{ value: '67', label: 'Dois terços' },
	{ value: '50', label: 'Metade' },
	{ value: '33', label: 'Um terço' },
];

let keyCounter = 0;
const nextKey = () => `field-${Date.now()}-${keyCounter++}`;

export function emptyFormField(): FormFieldState {
	return {
		key: nextKey(),
		name: '',
		nameTouched: false,
		type: 'text',
		label: '',
		placeholder: '',
		help: '',
		validation: '',
		width: '100',
		choices: '',
		required: false,
	};
}

export function formFieldFromRow(row: CmsFormFieldRow): FormFieldState {
	return {
		id: row.id,
		key: row.id,
		name: row.name,
		nameTouched: true,
		type: row.type,
		label: row.label,
		placeholder: row.placeholder ?? '',
		help: row.help ?? '',
		validation: row.validation ?? '',
		width: row.width,
		choices: (row.choices ?? [])
			.map((choice) => (choice.value === slugify(choice.text) ? choice.text : `${choice.text} | ${choice.value}`))
			.join('\n'),
		required: row.required,
	};
}

export function parseChoices(lines: string) {
	return lines
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const [text, value] = line.split('|').map((part) => part.trim());

			return { text, value: value || slugify(text) };
		});
}

export function formFieldsToPayload(fields: FormFieldState[]) {
	return fields.map((field) => ({
		...(field.id ? { id: field.id } : {}),
		name: field.name,
		type: field.type,
		label: field.label,
		placeholder: field.placeholder || null,
		help: field.help || null,
		validation: field.validation || null,
		width: field.width,
		choices: CHOICE_TYPES.has(field.type) ? parseChoices(field.choices) : null,
		required: field.required,
	}));
}

function FieldCard({
	field,
	index,
	total,
	errors,
	onChange,
	onRemove,
	onMove,
}: {
	field: FormFieldState;
	index: number;
	total: number;
	errors: FieldErrors | null;
	onChange: (field: FormFieldState) => void;
	onRemove: () => void;
	onMove: (to: number) => void;
}) {
	const id = useId();
	const prefix = `fields.${index}`;
	const name = `Campo ${index + 1}`;
	const update = (patch: Partial<FormFieldState>) => onChange({ ...field, ...patch });

	return (
		<fieldset aria-label={name} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
			<div className="flex items-center justify-between gap-2">
				<legend className="text-sm font-semibold text-slate-700">
					{name}
					{field.label && <span className="ml-2 font-normal text-slate-500">— {field.label}</span>}
				</legend>
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
			<div className="grid gap-4 sm:grid-cols-2">
				<Field id={`${id}-label`} label="Rótulo" error={firstError(errors, `${prefix}.label`)}>
					<Input
						id={`${id}-label`}
						value={field.label}
						maxLength={120}
						onChange={(event) =>
							update({ label: event.target.value, name: field.nameTouched ? field.name : slugify(event.target.value) })
						}
					/>
				</Field>
				<Field
					id={`${id}-name`}
					label="Nome máquina"
					hint="Chave usada nas respostas; letras minúsculas e hífens."
					error={firstError(errors, `${prefix}.name`)}
				>
					<Input
						id={`${id}-name`}
						value={field.name}
						maxLength={60}
						onChange={(event) => update({ name: event.target.value, nameTouched: true })}
					/>
				</Field>
				<div className="space-y-1.5">
					<Label htmlFor={`${id}-type`}>Tipo</Label>
					<Select value={field.type} onValueChange={(type) => update({ type: type as FormFieldType })}>
						<SelectTrigger id={`${id}-type`}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{CMS_FORM_FIELD_TYPES.map((type) => (
								<SelectItem key={type} value={type}>
									{FIELD_TYPE_LABELS[type]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor={`${id}-width`}>Largura</Label>
					<Select value={field.width} onValueChange={(width) => update({ width: width as CmsFormFieldRow['width'] })}>
						<SelectTrigger id={`${id}-width`}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{WIDTHS.map((width) => (
								<SelectItem key={width.value} value={width.value}>
									{width.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<Field id={`${id}-placeholder`} label="Placeholder" error={firstError(errors, `${prefix}.placeholder`)}>
					<Input
						id={`${id}-placeholder`}
						value={field.placeholder}
						maxLength={120}
						onChange={(event) => update({ placeholder: event.target.value })}
					/>
				</Field>
				<Field id={`${id}-help`} label="Texto de ajuda" error={firstError(errors, `${prefix}.help`)}>
					<Input
						id={`${id}-help`}
						value={field.help}
						maxLength={200}
						onChange={(event) => update({ help: event.target.value })}
					/>
				</Field>
				<Field
					id={`${id}-validation`}
					label="Validação"
					hint='Regras separadas por "|", ex.: email|max:255'
					error={firstError(errors, `${prefix}.validation`)}
				>
					<Input
						id={`${id}-validation`}
						value={field.validation}
						maxLength={120}
						onChange={(event) => update({ validation: event.target.value })}
					/>
				</Field>
				<label className="flex items-center gap-2 self-end pb-2 text-sm">
					<Checkbox checked={field.required} onCheckedChange={(checked) => update({ required: checked === true })} />
					Obrigatório
				</label>
			</div>
			{CHOICE_TYPES.has(field.type) && (
				<Field
					id={`${id}-choices`}
					label="Opções (uma por linha)"
					hint='Use "Texto | valor" para definir o valor gravado; sem "|", o valor vem do texto.'
					error={errorsUnder(errors, `${prefix}.choices`)[0]}
				>
					<Textarea
						id={`${id}-choices`}
						rows={4}
						value={field.choices}
						onChange={(event) => update({ choices: event.target.value })}
					/>
				</Field>
			)}
		</fieldset>
	);
}

interface FormFieldsBuilderProps {
	value: FormFieldState[];
	onChange: (fields: FormFieldState[]) => void;
	errors: FieldErrors | null;
}

export function FormFieldsBuilder({ value, onChange, errors }: FormFieldsBuilderProps) {
	const move = (from: number, to: number) => {
		if (to < 0 || to >= value.length) return;
		const next = [...value];
		const [field] = next.splice(from, 1);
		next.splice(to, 0, field);
		onChange(next);
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-slate-600">
					{value.length} {value.length === 1 ? 'campo' : 'campos'} (máximo 40)
				</p>
				<Button
					type="button"
					variant="outline"
					disabled={value.length >= 40}
					onClick={() => onChange([...value, emptyFormField()])}
				>
					<Plus className="mr-2 size-4" />
					Adicionar campo
				</Button>
			</div>
			<FieldError message={firstError(errors, 'fields')} />
			{value.length === 0 && (
				<p className="rounded-lg border border-dashed bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
					Sem campos, o formulário não tem o que enviar.
				</p>
			)}
			{value.map((field, index) => (
				<FieldCard
					key={field.key}
					field={field}
					index={index}
					total={value.length}
					errors={errors}
					onChange={(next) => onChange(value.map((current, i) => (i === index ? next : current)))}
					onRemove={() => onChange(value.filter((_, i) => i !== index))}
					onMove={(to) => move(index, to)}
				/>
			))}
		</div>
	);
}
