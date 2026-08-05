'use client';

import { FormField } from '@events-manager/contracts';
import Tagline from '@/components/ui/Tagline';
import FormBuilder from '../forms/FormBuilder';
import Headline from '@/components/ui/Headline';

interface FormBlockProps {
	data: {
		id: string;
		tagline: string | null;
		headline: string | null;
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
	};
	itemId?: string;
	blockId?: string;
}

const FormBlock = ({ data }: FormBlockProps) => {
	const { tagline, headline, form } = data;

	if (!form) {
		return null;
	}

	return (
		<section className="mx-auto">
			{tagline && (
				<Tagline
					tagline={tagline}
				/>
			)}

			{headline && (
				<Headline
					headline={headline}
				/>
			)}

			<div
			>
				<FormBuilder form={form} className="mt-8" />
			</div>
		</section>
	);
};

export default FormBlock;
