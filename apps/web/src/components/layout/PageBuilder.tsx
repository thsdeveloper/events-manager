import { PageBlock } from '@events-manager/contracts';
import BaseBlock from '@/components/blocks/BaseBlock';
import { cn } from '@/lib/utils';

interface PageBuilderProps {
	sections: PageBlock[];
}

const PageBuilder = ({ sections }: PageBuilderProps) => {
	const validBlocks = sections.filter(
		(block): block is PageBlock & { collection: string; item: object } =>
			typeof block.collection === 'string' && !!block.item && typeof block.item === 'object',
	);

	return (
		<div>
			{validBlocks.map((block) => (
				<div
					key={block.id}
					data-background={block.background ?? 'light'}
					className={cn(block.background === 'dark' && 'bg-slate-950 text-white')}
				>
					<BaseBlock
						block={{
							collection: block.collection,
							item: block.item,
							id: block.id,
						}}
					/>
				</div>
			))}
		</div>
	);
};

export default PageBuilder;
