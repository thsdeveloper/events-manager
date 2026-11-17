import Link from 'next/link';
import type { Event } from '@events-manager/contracts';
import { htmlToPlainText } from '@/components/ui/Text';
import type { EventDescriptionLanguage } from '../content';

export function EventLanguageLinks({ event, language = 'pt' }: { event: Event; language?: EventDescriptionLanguage }) {
	const languages: [EventDescriptionLanguage, string, boolean][] = [
		['pt', 'Português', true],
		['en', 'English', Boolean(htmlToPlainText(event.description_en ?? '').trim())],
		['es', 'Español', Boolean(htmlToPlainText(event.description_es ?? '').trim())],
	];
	if (!languages.some(([id, , available]) => id !== 'pt' && available)) return null;

	return (
		<nav aria-label="Idioma da descrição" className="flex flex-wrap gap-3 py-3 text-sm">
			{languages
				.filter(([, , available]) => available)
				.map(([id, label]) => (
					<Link
						key={id}
						href={'/eventos/' + encodeURIComponent(event.slug) + '?lang=' + id}
						lang={id}
						aria-current={language === id ? 'page' : undefined}
						className="underline underline-offset-4"
					>
						{label}
					</Link>
				))}
		</nav>
	);
}
