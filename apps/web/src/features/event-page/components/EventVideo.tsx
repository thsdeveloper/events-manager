import { getYouTubeVideoId, type Event } from '@events-manager/contracts';
import { YouTubeVideo } from '@/components/shared/YouTubeVideo';
import { EventSection } from './EventInformation';

export function EventVideo({ event, id = 'video' }: { event: Event; id?: string }) {
	if (!getYouTubeVideoId(event.video_url)) return null;

	return (
		<EventSection id={id} title="Conheça o evento em vídeo">
			<p className="mb-5 text-sm leading-relaxed text-muted-foreground">
				Uma prévia do que espera por você. Assista e entre no clima do encontro.
			</p>
			<YouTubeVideo url={event.video_url} title={event.title} />
		</EventSection>
	);
}
