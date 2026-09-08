import type { CmsBlockCollection, CmsContentStatus, CmsSeo } from '@events-manager/contracts';

/** Arquivo da biblioteca de mídia, como a API devolve nas relações achatadas. */
export interface CmsMedia {
	id: string;
	bucket?: string | null;
	path?: string | null;
	filename?: string | null;
	title?: string | null;
	description?: string | null;
	type?: string | null;
	filesize?: number | null;
	width?: number | null;
	height?: number | null;
	uploaded_by?: string | null;
	date_created?: string | null;
}

export interface CmsPagination {
	page: number;
	limit: number;
	total: number;
	pageCount: number;
}

export interface CmsPaginated<T> {
	data: T[];
	pagination: CmsPagination;
}

export interface CmsOverview {
	pages: Record<CmsContentStatus, number>;
	posts: Record<CmsContentStatus, number>;
	forms: number;
	submissions: number;
	media: number;
	redirects: number;
	navigations: number;
}

export interface CmsPageRow {
	id: string;
	title: string;
	permalink: string;
	status: CmsContentStatus;
	published_at: string | null;
	seo: CmsSeo | null;
	sort: number | null;
	date_created: string;
	date_updated: string | null;
}

export interface CmsButtonRow {
	id?: string;
	label: string;
	type: 'url' | 'page' | 'post';
	url: string | null;
	page: string | null;
	post: string | null;
	variant: 'default' | 'outline' | 'soft' | 'ghost' | 'link';
	sort?: number | null;
}

export interface CmsHeroItem {
	id: string;
	tagline: string | null;
	headline: string;
	description: string | null;
	image: CmsMedia | null;
	button_group?: string | null;
	layout: 'image_left' | 'image_center' | 'image_right';
	buttons: CmsButtonRow[];
}

export interface CmsRichtextItem {
	id: string;
	tagline: string | null;
	headline: string | null;
	content: string;
	alignment: 'left' | 'center';
}

export interface CmsGalleryItem {
	id: string;
	tagline: string | null;
	headline: string | null;
	items: Array<{ id: string; sort: number | null; file: CmsMedia }>;
}

export interface CmsPricingCard {
	id?: string;
	title: string;
	description: string | null;
	price: string | null;
	badge: string | null;
	features: string[];
	is_highlighted: boolean;
	sort?: number | null;
	button: CmsButtonRow | null;
}

export interface CmsPricingItem {
	id: string;
	tagline: string | null;
	headline: string | null;
	cards: CmsPricingCard[];
}

export interface CmsPostsItem {
	id: string;
	tagline: string | null;
	headline: string | null;
	limit: number;
	collection?: 'posts';
}

export interface CmsEventsItem {
	id: string;
	headline: string | null;
	description: string | null;
	filter_by_category: string | null;
	filter_featured: boolean;
	max_items: number;
	show_past_events: boolean;
	category: { id: string; name: string; slug: string } | null;
}

export interface CmsFormBlockItem {
	id: string;
	tagline: string | null;
	headline: string | null;
	form: string | null;
	form_definition: { id: string; title: string; is_active: boolean } | null;
}

export interface CmsBlockItemByCollection {
	block_hero: CmsHeroItem;
	block_richtext: CmsRichtextItem;
	block_gallery: CmsGalleryItem;
	block_pricing: CmsPricingItem;
	block_posts: CmsPostsItem;
	block_events: CmsEventsItem;
	block_form: CmsFormBlockItem;
}

export type CmsBlockRow = {
	[Collection in CmsBlockCollection]: {
		id: string;
		page: string;
		collection: Collection;
		item: CmsBlockItemByCollection[Collection];
		sort: number | null;
		hide_block: boolean;
		background: 'light' | 'dark';
		date_created: string;
	};
}[CmsBlockCollection];

export interface CmsPageDetail extends CmsPageRow {
	blocks: CmsBlockRow[];
}

export interface CmsActivityEntry {
	id: string;
	action: string;
	resource_type: string;
	resource_id: string | null;
	before_data: unknown;
	after_data: unknown;
	metadata: Record<string, unknown> | null;
	date_created: string;
	actor: { id: string; first_name: string | null; last_name: string | null; email: string | null } | null;
}

export interface CmsPreview {
	token: string;
	url: string;
	expiresAt: string;
}

export interface CmsNavigationRow {
	id: string;
	title: string;
	is_active: boolean;
	date_created: string;
	date_updated: string | null;
}

export interface CmsNavigationItemNode {
	id: string;
	navigation: string;
	parent: string | null;
	title: string;
	type: 'page' | 'post' | 'url' | 'group';
	url: string | null;
	sort: number | null;
	page: { id: string; title: string; permalink: string } | null;
	post: { id: string; title: string; slug: string } | null;
	children: CmsNavigationItemNode[];
}

export interface CmsNavigationDetail extends CmsNavigationRow {
	items: CmsNavigationItemNode[];
}

export interface CmsPostListRow {
	id: string;
	title: string;
	slug: string;
	description: string | null;
	status: CmsContentStatus;
	published_at: string | null;
	date_updated: string | null;
	image: CmsMedia | null;
}

export interface CmsPostRow extends CmsPostListRow {
	name?: string | null;
	content: string | null;
	seo: CmsSeo | null;
	author: string | null;
	author_profile: { id: string; first_name: string | null; last_name: string | null } | null;
	date_created: string;
}

export interface CmsRedirectRow {
	id: string;
	url_from: string;
	url_to: string;
	response_code: '301' | '302';
	note: string | null;
	date_created: string;
	date_updated: string | null;
}

export interface CmsFormRow {
	id: string;
	title: string;
	submit_label: string | null;
	success_message: string | null;
	on_success: 'redirect' | 'message';
	success_redirect_url: string | null;
	is_active: boolean;
	emails: Array<{ to: string[]; subject: string; message: string }> | null;
	sort: number | null;
	date_created: string;
	date_updated: string | null;
}

export interface CmsFormFieldRow {
	id: string;
	form?: string;
	name: string;
	type: 'text' | 'textarea' | 'checkbox' | 'checkbox_group' | 'radio' | 'file' | 'select' | 'hidden';
	label: string;
	placeholder: string | null;
	help: string | null;
	validation: string | null;
	width: '100' | '67' | '50' | '33';
	choices: Array<{ text: string; value: string }> | null;
	required: boolean;
	sort?: number | null;
}

export interface CmsFormDetail extends CmsFormRow {
	fields: CmsFormFieldRow[];
}

export interface CmsFormSubmission {
	id: string;
	timestamp: string;
	submitted_by: string | null;
	values: Array<{
		id: string;
		value: string | null;
		sort: number | null;
		file: string | null;
		field: { id: string; name: string; label: string; type: string } | null;
	}>;
}

export interface CmsSiteSettings {
	id: string;
	title: string | null;
	description: string | null;
	tagline: string | null;
	url: string | null;
	social_links: Array<{ service: string; url: string }> | null;
	accent_color: string | null;
	favicon: CmsMedia | null;
	logo: CmsMedia | null;
	logo_dark_mode: CmsMedia | null;
	default_og_image: CmsMedia | null;
	date_updated: string | null;
}

export interface CmsCategoryOption {
	id: string;
	name: string;
	slug: string;
}
