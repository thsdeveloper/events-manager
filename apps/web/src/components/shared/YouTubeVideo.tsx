'use client';

import { useState } from 'react';
import { getYouTubeVideoId } from '@events-manager/contracts';
import { ArrowUpRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface YouTubeVideoProps {
	url: string | null | undefined;
	title: string;
}

/** No YouTube request is made until the visitor chooses to play. */
export function YouTubeVideo({ url, title }: YouTubeVideoProps) {
	const id = getYouTubeVideoId(url);

	return id ? <VideoPlayer key={id} id={id} title={title} /> : null;
}

function VideoPlayer({ id, title }: { id: string; title: string }) {
	const [playing, setPlaying] = useState(false);

	return (
		<div className="min-w-0 space-y-3">
			<div className="relative aspect-video overflow-hidden rounded-2xl bg-[#231A33]">
				{playing ? (
					<iframe
						src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
						title={`Vídeo sobre ${title}`}
						className="absolute inset-0 size-full border-0"
						allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
						allowFullScreen
						referrerPolicy="strict-origin-when-cross-origin"
					/>
				) : (
					<Button
						variant="ghost"
						type="button"
						onClick={() => setPlaying(true)}
						aria-label="Assistir ao vídeo"
						className="group absolute inset-0 flex size-full flex-col items-center justify-center gap-3 whitespace-normal rounded-none bg-[radial-gradient(ellipse_at_top_right,#743DF5_0%,transparent_65%)] px-5 py-0 text-center text-white transition-colors hover:bg-[#34244D] hover:text-white focus-visible:outline focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-[#FFD09D] sm:gap-4 [&_svg]:size-5 sm:[&_svg]:size-6"
					>
						<span className="flex size-12 items-center justify-center rounded-full bg-[#FFD09D] text-[#231A33] shadow-lg transition-transform motion-safe:group-hover:scale-110 sm:size-16">
							<Play className="ml-1 size-5 fill-current sm:size-6" aria-hidden />
						</span>
						<span className="text-base font-semibold sm:text-xl">Dê o play no seu próximo encontro</span>
						<span className="text-xs text-white/75 sm:text-sm">Assistir ao vídeo</span>
					</Button>
				)}
			</div>
			<a
				href={`https://www.youtube.com/watch?v=${id}`}
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
			>
				Abrir no YouTube <ArrowUpRight className="size-4" aria-hidden />
			</a>
		</div>
	);
}
