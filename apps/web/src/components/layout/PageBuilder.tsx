import { PageBlock } from '@events-manager/contracts';
import BaseBlock, { hasBlockRenderer } from '@/components/blocks/BaseBlock';
import Container from '@/components/ui/container';
import { cn } from '@/lib/utils';

interface PageBuilderProps {
	sections: PageBlock[];
}

const PageBuilder = ({ sections }: PageBuilderProps) => {
	const validBlocks = sections.filter(
		(block): block is PageBlock & { collection: string; item: object } =>
			typeof block.collection === 'string' &&
			hasBlockRenderer(block.collection) &&
			!!block.item &&
			typeof block.item === 'object' &&
			(block.collection !== 'block_event_highlight' ||
				('events' in block.item && Array.isArray(block.item.events) && block.item.events.length > 0)),
	);

	return (
		<div data-cms-page>
			{validBlocks.map((block) => (
				<section
					key={block.id}
					aria-label={
						block.collection === 'block_event_highlight'
							? 'Eventos recentes'
							: 'headline' in block.item
								? String(block.item.headline || '') || undefined
								: undefined
					}
					data-background={block.background ?? 'light'}
					className={cn('bg-background text-foreground', block.background === 'dark' && 'dark')}
				>
					{block.collection === 'block_event_highlight' ? (
						<BaseBlock block={{ collection: block.collection, item: block.item, id: block.id }} />
					) : (
						<Container className="py-8 sm:py-10">
							<BaseBlock
								block={{
									collection: block.collection,
									item: block.item,
									id: block.id,
								}}
							/>
						</Container>
					)}
				</section>
			))}
		</div>
	);
};

export default PageBuilder;
