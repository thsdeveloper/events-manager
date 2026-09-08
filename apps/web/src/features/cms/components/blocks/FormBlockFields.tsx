'use client';

import { useEffect, useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cmsRequest } from '../../api/client';
import { firstError } from '../../lib/validation';
import type { CmsFormBlockItem, CmsFormRow } from '../../types';
import { Field, FieldError } from '../FormPrimitives';
import type { BlockFieldsProps, BlockFormDefinition } from './types';

export interface FormBlockState {
	tagline: string;
	headline: string;
	form: string;
}

function FormBlockFields({ value, onChange, errors }: BlockFieldsProps<FormBlockState>) {
	const id = useId();
	const [forms, setForms] = useState<CmsFormRow[]>([]);
	const update = (patch: Partial<FormBlockState>) => onChange({ ...value, ...patch });

	useEffect(() => {
		const controller = new AbortController();
		cmsRequest<{ data: CmsFormRow[] }>('/forms', { signal: controller.signal })
			.then((body) => setForms(body.data))
			.catch(() => {});

		return () => controller.abort();
	}, []);

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
				<Label htmlFor={`${id}-form`}>Formulário</Label>
				<Select value={value.form} onValueChange={(form) => update({ form })}>
					<SelectTrigger id={`${id}-form`}>
						<SelectValue placeholder="Escolha um formulário" />
					</SelectTrigger>
					<SelectContent>
						{forms.map((form) => (
							<SelectItem key={form.id} value={form.id}>
								{form.title}
								{!form.is_active && ' (inativo)'}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<FieldError message={firstError(errors, 'form')} />
			</div>
		</div>
	);
}

export const formBlockForm: BlockFormDefinition<CmsFormBlockItem, FormBlockState> = {
	Fields: FormBlockFields,
	fromItem: (item) => ({ tagline: item?.tagline ?? '', headline: item?.headline ?? '', form: item?.form ?? '' }),
	toPayload: (state) => ({ tagline: state.tagline || null, headline: state.headline || null, form: state.form }),
};
