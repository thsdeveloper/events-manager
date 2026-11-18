import RichText from '@/components/blocks/RichText';
import Hero from '@/components/blocks/Hero';
import Gallery from '@/components/blocks/Gallery';
import Pricing from '@/components/blocks/Pricing';
import Posts from '@/components/blocks/Posts';
import Form from '@/components/blocks/Form';
import Events from '@/components/blocks/Events';
import EventHighlight from '@/components/blocks/EventHighlight';

interface BaseBlockProps {
	block: {
		collection: string;
		item: any;
		id: string;
	};
}

const components: Record<string, React.ElementType> = {
	block_hero: Hero,
	block_richtext: RichText,
	block_gallery: Gallery,
	block_pricing: Pricing,
	block_posts: Posts,
	block_form: Form,
	block_events: Events,
	block_event_highlight: EventHighlight,
};

export function hasBlockRenderer(collection: string) {
	return Object.prototype.hasOwnProperty.call(components, collection);
}

const BaseBlock = ({ block }: BaseBlockProps) => {
	const Component = hasBlockRenderer(block.collection) ? components[block.collection] : undefined;

	if (!Component) {
		return null;
	}
	const itemId = block.item?.id;

	return <Component data={block.item} blockId={block.id} itemId={itemId} />;
};

export default BaseBlock;
