import Tagline from '@/components/ui/Tagline';
import Headline from '@/components/ui/Headline';
import MediaImage from '@/components/shared/MediaImage';
import ButtonGroup from '@/components/blocks/ButtonGroup';
import { cn } from '@/lib/utils';

interface HeroProps {
	data: {
		id: string;
		tagline: string;
		headline: string;
		description: string;
		layout: 'image_left' | 'image_center' | 'image_right';
		image: string;
		button_group?: {
			id: string;
			buttons: Array<{
				id: string;
				label: string | null;
				variant: string | null;
				url: string | null;
				type: 'url' | 'page' | 'post';
				pagePermalink?: string | null;
				postSlug?: string | null;
			}>;
		};
	};
}

/** The page renderer owns the container and surface, including the local theme. */
export default function Hero({ data }: HeroProps) {
	const { layout, tagline, headline, description, image, button_group } = data;
	const centered = layout === 'image_center';

	return (
		<div
			className={cn(
				'flex min-w-0 flex-col gap-10 md:gap-16',
				centered
					? 'items-center text-center'
					: layout === 'image_left'
						? 'md:flex-row-reverse md:items-center'
						: 'md:flex-row md:items-center',
			)}
		>
			<div className={cn('w-full min-w-0 space-y-4', image && !centered && 'md:w-1/2')}>
				{tagline && <Tagline as="p" tagline={tagline} />}
				<Headline as="h1" headline={headline} />
				{description && (
					<p className={cn('max-w-3xl text-base leading-7 text-muted-foreground', centered && 'mx-auto')}>
						{description}
					</p>
				)}
				{button_group && button_group.buttons.length > 0 && (
					<div className={cn('pt-2', centered && 'flex justify-center')}>
						<ButtonGroup buttons={button_group.buttons} />
					</div>
				)}
			</div>
			{image && (
				<div
					className={cn('relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted', !centered && 'md:w-1/2')}
				>
					<MediaImage
						uuid={image}
						alt={tagline || headline || 'Imagem de capa'}
						fill
						sizes={centered ? '(max-width: 1280px) 100vw, 1216px' : '(max-width: 768px) 100vw, 50vw'}
						className="object-cover"
					/>
				</div>
			)}
		</div>
	);
}
