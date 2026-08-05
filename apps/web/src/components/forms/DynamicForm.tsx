'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '@/components/blocks/Button';
import { Form } from '@/components/ui/form';
import Field from './FormField';
import { buildZodSchema } from '@/lib/zodSchemaBuilder';
import type { FormField as FormFieldType } from '@events-manager/contracts';

interface DynamicFormProps {
	fields: FormFieldType[];
	onSubmit: (data: Record<string, any>) => void;
	submitLabel: string;
	id: string;
}

const DynamicForm = ({ fields, onSubmit, submitLabel, id }: DynamicFormProps) => {
	const sortedFields = [...fields].sort((a, b) => (a.sort || 0) - (b.sort || 0));
	const formSchema = buildZodSchema(fields);

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: fields.reduce<Record<string, any>>((defaults, field) => {
			if (!field.name) return defaults;
			switch (field.type) {
				case 'checkbox':
					defaults[field.name] = false;
					break;
				case 'checkbox_group':
					defaults[field.name] = [];
					break;
				case 'radio':
					defaults[field.name] = '';
					break;
				default:
					defaults[field.name] = '';
					break;
			}

			return defaults;
		}, {}),
	});

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-wrap gap-4">
				{sortedFields.map((field) => (
					<div key={field.id} className="w-full">
						<Field key={field.id} field={field} form={form} />
					</div>
				))}
				<div className="w-full">
					<div>
						<Button type="submit" label={submitLabel} icon="arrow" iconPosition="right" id={`submit-${id}`} />
					</div>
				</div>
			</form>
		</Form>
	);
};

export default DynamicForm;
