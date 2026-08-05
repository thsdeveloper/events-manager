import { PageBlock } from '@events-manager/contracts';
import BaseBlock from '@/components/blocks/BaseBlock';

interface PageBuilderProps {
	sections: PageBlock[];
}

const PageBuilder = ({ sections }: PageBuilderProps) => {
	const validBlocks = sections.filter(
		(block): block is PageBlock & { collection: string; item: object } =>
			typeof block.collection === 'string' && !!block.item && typeof block.item === 'object',
	);

	return (
		<main>
			{validBlocks.map((block) => (
				<div key={block.id} data-background={block.background}>
						<BaseBlock
							block={{
								collection: block.collection,
								item: block.item,
								id: block.id,
							}}
						/>
				</div>
			))}
		</main>
	);
};

export default PageBuilder;
