'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import DynamicForm from './DynamicForm';
import { submitForm } from '@/lib/content/forms';
import { FormField } from '@events-manager/contracts';
import { cn } from '@/lib/utils';

interface FormBuilderProps {
	className?: string;
	itemId?: string;
	form: {
		id: string;
		on_success?: 'redirect' | 'message' | null;
		sort?: number | null;
		submit_label?: string;
		success_message?: string | null;
		title?: string | null;
		success_redirect_url?: string | null;
		is_active?: boolean | null;
		fields: FormField[];
	};
}

const FormBuilder = ({ form, className }: FormBuilderProps) => {
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!form.is_active) return null;

	const handleSubmit = async (data: Record<string, unknown>) => {
		setError(null);
		try {
			const fieldsWithNames = form.fields.map((field) => ({
				id: field.id,
				name: field.name || '',
				type: field.type || '',
			}));

			await submitForm(form.id, fieldsWithNames, data);

			if (form.on_success === 'redirect' && form.success_redirect_url) {
				window.location.href = form.success_redirect_url;
			} else {
				setIsSubmitted(true);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Não foi possível enviar o formulário. Tente novamente.');
		}
	};

	if (isSubmitted) {
		return (
			<div className="flex flex-col items-center justify-center space-y-4 p-6 text-center">
				<CheckCircle className="size-12 text-green-500" />
				<p className="text-gray-600">{form.success_message || 'Formulário enviado com sucesso.'}</p>
			</div>
		);
	}

	return (
		<div className={cn('space-y-6 border border-input p-8 rounded-lg', className)}>
			{form.title && <h3 className="text-xl font-semibold mb-4">{form.title}</h3>}

			{error && (
				<div className="p-4 text-red-700 bg-red-50 rounded-md" role="alert">
					<strong>Erro:</strong> {error}
				</div>
			)}

			<DynamicForm
				fields={form.fields}
				onSubmit={handleSubmit}
				submitLabel={form.submit_label || 'Enviar'}
				id={form.id}
			/>
		</div>
	);
};

export default FormBuilder;
