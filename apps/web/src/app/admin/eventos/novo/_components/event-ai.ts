import type { EventAIContext } from '@events-manager/contracts';
import { htmlToPlainText } from '@/components/ui/Text';
import type { EventWizardFormValues } from './types';

export function eventAIContext(values: EventWizardFormValues, brief?: string): EventAIContext {
	return {
		title: values.title.trim(),
		categoryId: values.category_id,
		short_description: values.short_description?.slice(0, 160),
		description: htmlToPlainText(values.description ?? '').slice(0, 8000),
		tags: values.tags,
		event_type: values.event_type,
		start_date: values.start_date || undefined,
		end_date: values.end_date || undefined,
		location_name: values.location_name?.slice(0, 240),
		location_city: values.location_city?.slice(0, 120),
		brief,
	};
}

export async function generateEventContent<T>(action: 'cover' | 'description', input: EventAIContext): Promise<T> {
	const response = await fetch('/api/ai/generate-' + action, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
	});
	const result = await response.json().catch(() => null);
	if (!response.ok)
		throw new Error(result?.detail || result?.title || 'Não foi possível gerar o conteúdo. Tente novamente.');
	if (!result) throw new Error('A geração retornou uma resposta inválida. Tente novamente.');

	return result as T;
}

export function descriptionToHtml(text: string) {
	const escaped = text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');

	return escaped
		.split(/\n\s*\n/)
		.map((paragraph) => `<p>${paragraph.trim().replaceAll('\n', '<br>')}</p>`)
		.join('');
}
