'use client';

import Tagline from '../ui/Tagline';
import Headline from '@/components/ui/Headline';
import MediaImage from '@/components/shared/MediaImage';
import ButtonGroup from '@/components/blocks/ButtonGroup';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

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

export default function Hero({ data }: HeroProps) {
	const { id, layout, tagline, headline, description, image, button_group } = data;

	return (
		<section className="relative w-full overflow-hidden">
			{/* Gradient Background */}
			<div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-slate-900 dark:via-purple-900/20 dark:to-indigo-900/20 -z-10" />

			{/* Animated Background Elements */}
			<div className="absolute inset-0 -z-10 overflow-hidden">
				<div className="absolute -top-40 -right-40 size-80 bg-purple-300/30 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
				<div
					className="absolute -bottom-40 -left-40 size-80 bg-indigo-300/30 dark:bg-indigo-500/10 rounded-full blur-3xl animate-pulse"
					style={{ animationDelay: '1s' }}
				/>
			</div>

			<div
				className={cn(
					'relative max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24 lg:py-32 flex flex-col gap-8 md:gap-16',
					layout === 'image_center'
						? 'items-center text-center'
						: layout === 'image_left'
							? 'md:flex-row-reverse items-center'
							: 'md:flex-row items-center',
				)}
			>
				<div
					className={cn(
						'flex flex-col gap-6 w-full z-10',
						layout === 'image_center' ? 'md:w-3/4 xl:w-2/3 items-center' : 'md:w-1/2 items-start',
					)}
				>
					{tagline && (
						<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 backdrop-blur-sm">
							<Sparkles className="size-4 text-purple-600 dark:text-purple-400" />
							<span className="text-sm font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
								{tagline}
							</span>
						</div>
					)}

					<div>
						<h1
							className={cn(
								'font-bold leading-tight tracking-tight',
								layout === 'image_center'
									? 'text-4xl md:text-5xl lg:text-6xl xl:text-7xl'
									: 'text-3xl md:text-4xl lg:text-5xl xl:text-6xl',
							)}
						>
							<span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent dark:from-purple-400 dark:via-indigo-400 dark:to-blue-400">
								{headline}
							</span>
						</h1>
					</div>

					{description && (
						<p
							className={cn(
								'text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl',
								layout === 'image_center' ? 'text-center' : 'text-left',
							)}
						>
							{description}
						</p>
					)}

					{button_group && button_group.buttons.length > 0 && (
						<div className={cn(layout === 'image_center' && 'flex justify-center', 'mt-4')}>
							<ButtonGroup buttons={button_group.buttons} />
						</div>
					)}
				</div>

				{image && (
					<div
						className={cn(
							'relative w-full group',
							layout === 'image_center'
								? 'md:w-3/4 xl:w-2/3 h-[400px] md:h-[500px]'
								: 'md:w-1/2 h-[400px] md:h-[600px]',
						)}
					>
						{/* Image Glow Effect */}
						<div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-3xl blur-3xl group-hover:blur-2xl transition-all duration-500" />

						{/* Image Container */}
						<div className="relative h-full rounded-3xl overflow-hidden shadow-2xl transform group-hover:scale-[1.02] transition-transform duration-500">
							<MediaImage
								uuid={image}
								alt={tagline || headline || 'Imagem Hero'}
								fill
								sizes={layout === 'image_center' ? '100vw' : '(max-width: 768px) 100vw, 50vw'}
								className="object-cover"
							/>
						</div>

						{/* Decorative Elements */}
						<div className="absolute -top-4 -right-4 size-24 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full blur-2xl opacity-50 animate-pulse" />
						<div
							className="absolute -bottom-4 -left-4 size-32 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full blur-2xl opacity-50 animate-pulse"
							style={{ animationDelay: '1.5s' }}
						/>
					</div>
				)}
			</div>
		</section>
	);
}
