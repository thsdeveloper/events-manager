import type { CmsBlockCollection } from '@events-manager/contracts';
import { eventsBlockForm } from './EventsBlockFields';
import { formBlockForm } from './FormBlockFields';
import { galleryBlockForm } from './GalleryBlockFields';
import { heroBlockForm } from './HeroBlockFields';
import { postsBlockForm } from './PostsBlockFields';
import { pricingBlockForm } from './PricingBlockFields';
import { richtextBlockForm } from './RichtextBlockFields';
import type { BlockFormDefinition } from './types';

export const blockForms: Record<CmsBlockCollection, BlockFormDefinition<any, any>> = {
	block_hero: heroBlockForm,
	block_richtext: richtextBlockForm,
	block_gallery: galleryBlockForm,
	block_pricing: pricingBlockForm,
	block_posts: postsBlockForm,
	block_events: eventsBlockForm,
	block_form: formBlockForm,
};

export type { BlockFieldsProps, BlockFormDefinition } from './types';
