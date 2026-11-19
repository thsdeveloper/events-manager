import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchEventBySlug, fetchOrganizationEvents, fetchSiteData } from '@/lib/content/fetchers';
import SiteLayout from '@/components/layout/SiteLayout';
import { EventPageRenderer } from '@/features/event-page/puck/EventPageRenderer';
import { DefaultEventPage } from '@/features/event-page/components/DefaultEventPage';
import { htmlToPlainText } from '@/components/ui/Text';
import { descriptionLanguage, descriptionForLanguage } from '@/features/event-page/content';

interface EventPageProps {
	searchParams?: Promise<{ lang?: string | string[] }>;
	params: Promise<{
		slug: string;
	}>;
}

export async function generateMetadata({ params, searchParams }: EventPageProps): Promise<Metadata> {
	const { slug } = await params;
	try {
		const event = await fetchEventBySlug(slug);
		const language = descriptionLanguage(searchParams ? (await searchParams).lang : undefined);
		const description = descriptionForLanguage(event, language);

		return {
			title: event.title,
			...(event.visibility === 'unlisted' ? { robots: { index: false, follow: false } } : {}),
			description:
				language === 'pt'
					? event.short_description || htmlToPlainText(description).substring(0, 160)
					: htmlToPlainText(description).substring(0, 160),
		};
	} catch (error) {
		return {
			title: 'Evento não encontrado',
		};
	}
}

export default async function EventPage({ params, searchParams }: EventPageProps) {
	const { slug } = await params;
	let event;
	try {
		event = await fetchEventBySlug(slug);
	} catch {
		notFound();
	}
	const language = descriptionLanguage(searchParams ? (await searchParams).lang : undefined);
	const organizerId = typeof event.organizer_id === 'string' ? event.organizer_id : event.organizer_id.id;
	const relatedPromise = fetchOrganizationEvents(organizerId, event.id);
	// A página personalizada continua respeitando as seções publicadas pela organização.
	if (event.page) {
		return (
			<EventPageRenderer event={event} layout={event.page} language={language} relatedEvents={await relatedPromise} />
		);
	}
	const [{ globals, headerNavigation, footerNavigation }, relatedEvents] = await Promise.all([
		fetchSiteData(),
		relatedPromise,
	]);

	return (
		<div className="bg-[#FBF9FF] pb-24 dark:bg-background lg:pb-0">
			<SiteLayout headerNavigation={headerNavigation} footerNavigation={footerNavigation} globals={globals}>
				<DefaultEventPage event={event} relatedEvents={relatedEvents} language={language} />
			</SiteLayout>
		</div>
	);
}
