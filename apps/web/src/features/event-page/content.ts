import type { Event, EventPageLayout } from '@events-manager/contracts';
import { htmlToPlainText } from '@/components/ui/Text';

export type EventDescriptionLanguage = 'pt' | 'en' | 'es';
export function descriptionLanguage(value: unknown): EventDescriptionLanguage {
	return value === 'en' || value === 'es' ? value : 'pt';
}
export function descriptionForLanguage(event: Event, language: EventDescriptionLanguage) {
	const translation = language === 'en' ? event.description_en : language === 'es' ? event.description_es : null;

	return translation && htmlToPlainText(translation).trim() ? translation : (event.description ?? '');
}
export function localizedLayout(
	layout: EventPageLayout,
	event: Event,
	language: EventDescriptionLanguage,
): EventPageLayout {
	const description = descriptionForLanguage(event, language);
	if (language === 'pt' || description === (event.description ?? '')) return layout;
	let replaced = false;

	return {
		...layout,
		sections: layout.sections.map((section) => {
			if (section.type !== 'about' || replaced) return section;
			replaced = true;

			return { ...section, content: description };
		}),
	};
}
