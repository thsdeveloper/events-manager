export interface MediaFile {
	id: string;
	bucket?: string;
	path?: string;
	filename?: string;
	title?: string | null;
	type?: string | null;
	filesize?: number | null;
	width?: number | null;
	height?: number | null;
	description?: string | null;
	metadata?: Record<string, unknown> | null;
	created_at?: string | null;
}

export interface AppUser {
	id: string;
	email?: string | null;
	first_name?: string | null;
	last_name?: string | null;
	avatar?: MediaFile | string | null;
	location?: string | null;
	title?: string | null;
	description?: string | null;
	role?: 'attendee' | 'organizer' | 'admin' | 'super_admin' | null;
	status?: 'active' | 'suspended' | 'archived';
	created_at?: string | null;
	posts?: Post[] | string[];
}

export interface ExtensionSeoMetadata {
	title?: string;
	meta_description?: string;
	og_image?: string;
	additional_fields?: Record<string, unknown>;
	sitemap?: {
		change_frequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
		priority: string;
	};
	no_index?: boolean;
	no_follow?: boolean;
}

export interface AiPrompt {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	/** @description Unique name for the prompt. Use names like "create-article" or "generate-product-description". @required */
	name: string;
	/** @description Is this prompt published and available to use? */
	status?: 'draft' | 'in_review' | 'published';
	/** @description Briefly explain what this prompt does in 1-2 sentences. */
	description?: string | null;
	/** @description Optional: Define the conversation structure between users and AI. Used to add context and improve outputs. */
	messages?: Array<{ role: 'user' | 'assistant'; text: string }> | null;
	/** @description Instructions that shape how the AI responds. */
	system_prompt?: string | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
}

export interface BlockButton {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	/** @description What type of link is this? Page and Post allow you to link to internal content. URL is for external content. Group can contain other menu items. */
	type?: 'page' | 'post' | 'url' | null;
	/** @description The internal page to link to. */
	page?: Page | string | null;
	/** @description The internal post to link to. */
	post?: Post | string | null;
	/** @description Text to include on the button. */
	label?: string | null;
	/** @description What type of button */
	variant?: 'default' | 'outline' | 'soft' | 'ghost' | 'link' | null;
	/** @description The id of the Button Group this button belongs to. */
	button_group?: BlockButtonGroup | string | null;
	/** @description The URL to link to. Could be relative (ie `/my-page`) or a full external URL (ie `https://supabase.com/docs`) */
	url?: string | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
}

export interface BlockButtonGroup {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
	/** @description Add individual buttons to the button group. */
	buttons?: BlockButton[] | string[];
}

export interface BlockEvent {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	/** @description Título do bloco (ex: Próximos Eventos) */
	headline?: string | null;
	/** @description Descrição opcional do bloco */
	description?: string | null;
	/** @description Filtrar eventos por categoria específica */
	filter_by_category?: EventCategory | string | null;
	/** @description Mostrar apenas eventos em destaque? */
	filter_featured?: boolean | null;
	/** @description Máximo de eventos a exibir (padrão: 10) */
	max_items?: number | null;
	/** @description Incluir eventos passados? */
	show_past_events?: boolean | null;
}

export interface BlockForm {
	/** @primaryKey */
	id: string;
	/** @description Form to show within block */
	form?: Form | string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
}

export interface BlockGallery {
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @primaryKey */
	id: string;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
	/** @description Images to include in the image gallery. */
	items?: BlockGalleryItem[] | string[];
}

export interface BlockGalleryItem {
	/** @primaryKey */
	id: string;
	/** @description The id of the gallery block this item belongs to. */
	block_gallery?: BlockGallery | string | null;
	/** @description The id of the file included in the gallery. */
	file?: MediaFile | string | null;
	sort?: number | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
}

export interface BlockHero {
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @primaryKey */
	id: string;
	/** @description Featured image in the hero. */
	image?: MediaFile | string | null;
	/** @description Action buttons that show below headline and description. */
	button_group?: BlockButtonGroup | string | null;
	/** @description Supporting copy that shows below the headline. */
	description?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	/** @description The layout for the component. You can set the image to display left, right, or in the center of page.. */
	layout?: 'image_left' | 'image_center' | 'image_right' | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
}

export interface BlockHeroSlide {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	/** @description Texto pequeno acima do headline (ex: 'Lançamento', 'Novidade') */
	tagline?: string | null;
	/** @description Título principal do slide @required */
	headline: string;
	/** @description Descrição do slide */
	description?: string | null;
	/** @description Imagem de fundo ou destaque do slide */
	image?: MediaFile | string | null;
	/** @description Grupo de botões de ação */
	button_group?: BlockButtonGroup | string | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	block_hero_id?: BlockHero | string | null;
}

export interface BlockPost {
	/** @primaryKey */
	id: string;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @description The collection of content to fetch and display on the page within this block. @required */
	collection: 'posts';
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	limit?: number | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
}

export interface BlockPricing {
	/** @primaryKey */
	id: string;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
	/** @description The individual pricing cards to display. */
	pricing_cards?: BlockPricingCard[] | string[];
}

export interface BlockPricingCard {
	/** @primaryKey */
	id: string;
	/** @description Name of the pricing plan. Shown at the top of the card. */
	title?: string | null;
	/** @description Short, one sentence description of the pricing plan and who it is for. */
	description?: string | null;
	/** @description Price and term for the pricing plan. (ie `$199/mo`) */
	price?: string | null;
	/** @description Badge that displays at the top of the pricing plan card to add helpful context. */
	badge?: string | null;
	/** @description Short list of features included in this plan. Press `Enter` to add another item to the list. */
	features?: 'json' | null;
	/** @description The action button / link shown at the bottom of the pricing card. */
	button?: BlockButton | string | null;
	/** @description The id of the pricing block this card belongs to. */
	pricing?: BlockPricing | string | null;
	/** @description Add highlighted border around the pricing plan to make it stand out. */
	is_highlighted?: boolean | null;
	sort?: number | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
}

export interface BlockRichtext {
	/** @description Rich text content for this block. */
	content?: string | null;
	/** @description Larger main headline for this page section. */
	headline?: string | null;
	/** @primaryKey */
	id: string;
	/** @description Controls how the content block is positioned on the page. Choose "Left" to align the block against the left margin or "Center" to position the block in the middle of the page. This setting affects the entire content block's placement, not the text alignment within it. */
	alignment?: 'left' | 'center' | null;
	/** @description Smaller copy shown above the headline to label a section or add extra context. */
	tagline?: string | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
}

export interface EventCategory {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	/** @required */
	name: string;
	/** @description URL amigável (gerado automaticamente) @required */
	slug: string;
	description?: string | null;
	icon?: string | null;
	color?: string | null;
	events?: Event[] | string[];
}

export interface EventConfigurations {
	/** @primaryKey */
	id: number;
	/** @description Permitir que organizadores criem eventos gratuitos */
	allow_free_events?: boolean | null;
	/** @description Limite máximo de tipos de ingressos por evento (deixe vazio para ilimitado) */
	max_tickets_per_event?: number | null;
	/** @description Prefixo para códigos de ingresso (ex: EVT, TKT) */
	ticket_code_prefix?: string | null;
	/** @description Enviar email de confirmação automático após compra */
	registration_confirmation_email?: boolean | null;
	/** @description Taxa da plataforma em percentual sobre o valor base do ingresso (ex: 5 para 5%) @required */
	platform_fee_percentage: number;
	/** @description Gateway utilizado pela plataforma. */
	payment_gateway: 'abacatepay';
	card_fee_percentage: number;
	card_fee_fixed: number;
	card_installment_2_6_percentage: number;
	card_installment_7_12_percentage: number;
	pix_fee_fixed: number;
	boleto_fee_fixed: number;
	payout_fee_fixed: number;
	minimum_payout: number;
	payouts_enabled: boolean;
	/** @description Método de cálculo da taxa de conveniência @required */
	convenience_fee_calculation_method: 'buyer_pays' | 'organizer_absorbs';
}

export interface EventRegistration {
	/** @primaryKey */
	id: string;
	status?: 'confirmed' | 'pending' | 'partial_payment' | 'payment_overdue' | 'cancelled' | 'checked_in';
	sort?: number | null;
	date_created?: string | null;
	date_updated?: string | null;
	/** @description Evento relacionado @required */
	event_id: Event | string;
	/** @description Nome completo do participante @required */
	participant_name: string;
	/** @required */
	participant_email: string;
	participant_phone?: string | null;
	/** @description CPF ou outro documento */
	participant_document?: string | null;
	/** @description Usuário cadastrado (se aplicável) */
	user_id?: AppUser | string | null;
	/** @description Código único do ingresso */
	ticket_code?: string | null;
	payment_status?: 'free' | 'paid' | 'pending' | 'refunded' | null;
	/** @description Valor pago */
	payment_amount?: number | null;
	/** @description Data/hora do check-in */
	check_in_date?: string | null;
	/** @description Informações adicionais em JSON */
	additional_info?: Record<string, any> | null;
	/** @description Tipo de ingresso adquirido */
	ticket_type_id?: EventTicket | string | null;
	/** @description Quantidade de ingressos @required */
	quantity: number;
	/** @description Preço unitário no momento da compra */
	unit_price?: number | null;
	/** @description Taxa de serviço aplicada */
	service_fee?: number | null;
	/** @description Valor total pago */
	total_amount?: number | null;
	payment_provider?: 'mock' | 'abacatepay';
	provider_transaction_id?: string | null;
	provider_checkout_id?: string | null;
	provider_refund_id?: string | null;
	provider_fee?: number | null;
	platform_fee?: number | null;
	/** @description Método de pagamento usado */
	payment_method?: 'card' | 'pix' | 'boleto' | 'free' | null;
	/** @description Data e hora do cancelamento da inscrição */
	cancelled_at?: string | null;
	/** @description Motivo do cancelamento da inscrição */
	cancelled_reason?: string | null;
	/** @description Observações internas sobre o participante */
	notes?: string | null;
	/** @description Esta inscrição é um pagamento parcelado? */
	is_installment_payment?: boolean | null;
	/** @description Total de parcelas (ex: 4) */
	total_installments?: number | null;
	/** @description Status do plano de parcelamento */
	installment_plan_status?: 'active' | 'completed' | 'defaulted' | null;
	/** @description Razão do bloqueio (ex: overdue_installments) */
	blocked_reason?: string | null;
	/** @description Indica que a quantidade desta inscrição já está contabilizada no estoque. */
	inventory_reserved?: boolean;
	/** @description Última consulta do estado do checkout no provedor. */
	reconciliation_checked_at?: string | null;
	/** @description Parcelas de pagamento relacionadas */
	installments?: PaymentInstallment[] | string[];
}

export interface Event {
	/** @primaryKey */
	id: string;
	status?: 'published' | 'draft' | 'cancelled' | 'archived';
	sort?: number | null;
	user_created?: AppUser | string | null;
	date_created?: string | null;
	user_updated?: AppUser | string | null;
	date_updated?: string | null;
	/** @description Título do evento @required */
	title: string;
	/** @description URL amigável (gerado automaticamente) @required */
	slug: string;
	/** @description Descrição completa do evento */
	description?: string | null;
	/** @description Descrição resumida para listagens */
	short_description?: string | null;
	/** @description Imagem de capa do evento */
	cover_image?: MediaFile | string | null;
	/** @description Organizador responsável pelo evento @required */
	organizer_id: Organizer | string;
	/** @description Categoria do evento */
	category_id?: EventCategory | string | null;
	event_type?: 'in_person' | 'online' | 'hybrid' | null;
	/** @description Data e hora de início @required */
	start_date: string;
	/** @description Data e hora de término @required */
	end_date: string;
	/** @description Nome do local (ex: Teatro Municipal) */
	location_name?: string | null;
	/** @description Endereço completo do evento */
	location_address?: string | null;
	/** @description Link para evento online */
	online_url?: string | null;
	/** @description Capacidade máxima de participantes (deixe vazio para ilimitado) */
	max_attendees?: number | null;
	/** @description Data de início das inscrições */
	registration_start?: string | null;
	/** @description Data de encerramento das inscrições */
	registration_end?: string | null;
	/** @description Evento gratuito? */
	is_free?: boolean | null;
	/** @description Tags para facilitar busca */
	tags?: string[] | null;
	/** @description Destacar evento? */
	featured?: boolean | null;
	registrations?: EventRegistration[] | string[];
	/** @description Tipos de ingressos disponíveis */
	tickets?: EventTicket[] | string[];
}

export interface EventTicket {
	/** @primaryKey */
	id: string;
	status?: 'active' | 'sold_out' | 'inactive';
	sort?: number | null;
	user_created?: AppUser | string | null;
	date_created?: string | null;
	user_updated?: AppUser | string | null;
	date_updated?: string | null;
	/** @description Evento relacionado @required */
	event_id: Event | string;
	/** @description Nome do tipo de ingresso (ex: Ingresso Único, Meia-Entrada, VIP) @required */
	title: string;
	/** @description Informações adicionais sobre o ingresso */
	description?: string | null;
	/** @description Quantidade total disponível para venda @required */
	quantity: number;
	/** @description Quantidade já vendida (calculado automaticamente) */
	quantity_sold?: number | null;
	/** @description Valor a receber pelo organizador (sem taxa de serviço) @required */
	price: number;
	/** @description Como a taxa de serviço será cobrada @required */
	service_fee_type: 'absorbed' | 'passed_to_buyer';
	/** @description Preço final para o comprador (calculado automaticamente) */
	buyer_price?: number | null;
	/** @description Data de início das vendas deste ingresso */
	sale_start_date?: string | null;
	/** @description Data de encerramento das vendas */
	sale_end_date?: string | null;
	/** @description Mínimo de ingressos por compra */
	min_quantity_per_purchase?: number | null;
	/** @description Máximo de ingressos por compra */
	max_quantity_per_purchase?: number | null;
	/** @description Visibilidade do ingresso */
	visibility?: 'public' | 'invited_only' | 'manual' | null;
	/** @description Permitir parcelamento via Pix para este ingresso? */
	allow_installments?: boolean | null;
	/** @description Máximo de parcelas permitidas (ex: 4) */
	max_installments?: number | null;
	/** @description Valor mínimo do ingresso para permitir parcelamento */
	min_amount_for_installments?: number | null;
}

export interface FormField {
	/** @primaryKey */
	id: string;
	/** @description Unique field identifier, not shown to users (lowercase, hyphenated) */
	name?: string | null;
	/** @description Input type for the field */
	type?: 'text' | 'textarea' | 'checkbox' | 'checkbox_group' | 'radio' | 'file' | 'select' | 'hidden' | null;
	/** @description Text label shown to form users. */
	label?: string | null;
	/** @description Default text shown in empty input. */
	placeholder?: string | null;
	/** @description Additional instructions shown below the input */
	help?: string | null;
	/** @description Available rules: `email`, `url`, `min:5`, `max:20`, `length:10`. Combine with pipes example: `email|max:255` */
	validation?: string | null;
	/** @description Field width on the form */
	width?: '100' | '67' | '50' | '33' | null;
	/** @description Options for radio or select inputs */
	choices?: Array<{ text: string; value: string }> | null;
	/** @description Parent form this field belongs to. */
	form?: Form | string | null;
	sort?: number | null;
	/** @description Make this field mandatory to complete. */
	required?: boolean | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
}

export interface Form {
	/** @primaryKey */
	id: string;
	/** @description Action after successful submission. */
	on_success?: 'redirect' | 'message' | null;
	sort?: number | null;
	/** @description Text shown on submit button. */
	submit_label?: string | null;
	/** @description Message shown after successful submission. */
	success_message?: string | null;
	/** @description Form name (for internal reference). */
	title?: string | null;
	/** @description Destination URL after successful submission. */
	success_redirect_url?: string | null;
	/** @description Show or hide this form from the site. */
	is_active?: boolean | null;
	/** @description Setup email notifications when forms are submitted. */
	emails?: Array<{ to: string[]; subject: string; message: string }> | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
	/** @description Form structure and input fields */
	fields?: FormField[] | string[];
	/** @description Received form responses. */
	submissions?: FormSubmission[] | string[];
}

export interface FormSubmission {
	/** @description Unique ID for this specific form submission @primaryKey */
	id: string;
	/** @description Form submission date and time. */
	timestamp?: string | null;
	/** @description Associated form for this submission. */
	form?: Form | string | null;
	/** @description Submitted field responses */
	values?: FormSubmissionValue[] | string[];
}

export interface FormSubmissionValue {
	/** @primaryKey */
	id: string;
	/** @description Parent form submission for this value. */
	form_submission?: FormSubmission | string | null;
	field?: FormField | string | null;
	/** @description The data entered by the user for this specific field in the form submission. */
	value?: string | null;
	sort?: number | null;
	file?: MediaFile | string | null;
	/** @description Form submission date and time. */
	timestamp?: string | null;
}

export interface Globals {
	/** @description Site summary for search results. */
	description?: string | null;
	/** @primaryKey */
	id: string;
	/** @description Social media profile URLs */
	social_links?: Array<{
		url: string;
		service: 'facebook' | 'instagram' | 'linkedin' | 'x' | 'vimeo' | 'youtube' | 'github' | 'discord' | 'docker';
	}> | null;
	/** @description Short phrase describing the site. */
	tagline?: string | null;
	/** @description Main site title */
	title?: string | null;
	/** @description Public URL for the website */
	url?: string | null;
	/** @description Small icon for browser tabs. 1:1 ratio. No larger than 512px × 512px. */
	favicon?: MediaFile | string | null;
	/** @description Main logo shown on the site (for light mode). */
	logo?: MediaFile | string | null;
	/** @description Main logo shown on the site (for dark mode). */
	logo_dark_mode?: MediaFile | string | null;
	/** @description Accent color for the website (used on buttons, links, etc). */
	accent_color?: string | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
}

export interface Navigation {
	/** @description Unique identifier for this menu. Can't be edited after creation. @primaryKey */
	id: string;
	/** @description What is the name of this menu? Only used internally. */
	title?: string | null;
	/** @description Show or hide this menu from the site. */
	is_active?: boolean | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
	/** @description Links within the menu. */
	items?: NavigationItem[] | string[];
}

export interface NavigationItem {
	/** @primaryKey */
	id: string;
	/** @description Navigation menu that the individual links belong to. */
	navigation?: Navigation | string | null;
	/** @description The internal page to link to. */
	page?: Page | string | null;
	/** @description The parent navigation item. */
	parent?: NavigationItem | string | null;
	sort?: number | null;
	/** @description Label shown to the user for the menu item. @required */
	title: string;
	/** @description What type of link is this? Page and Post allow you to link to internal content. URL is for external content. Group can contain other menu items. */
	type?: 'page' | 'post' | 'url' | 'group' | null;
	/** @description The URL to link to. Could be relative (ie `/my-page`) or a full external URL (ie `https://supabase.com/docs`) */
	url?: string | null;
	/** @description The internal post to link to. */
	post?: Post | string | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
	/** @description Add child menu items within the group. */
	children?: NavigationItem[] | string[];
}

export interface Organizer {
	/** @primaryKey */
	id: string;
	status?: 'active' | 'pending' | 'archived';
	sort?: number | null;
	user_created?: AppUser | string | null;
	date_created?: string | null;
	user_updated?: AppUser | string | null;
	date_updated?: string | null;
	/** @required */
	email: string;
	phone?: string | null;
	/** @description Descrição sobre o organizador */
	description?: string | null;
	logo?: MediaFile | string | null;
	website?: string | null;
	/** @description CPF ou CNPJ */
	document?: string | null;
	/** @description Usuário responsável pelo organizador @required */
	user_id: AppUser | string;
	/** @required */
	name: string;
	/** @description Chave PIX usada para os repasses controlados pela plataforma. */
	payout_pix_key?: string | null;
	payout_pix_key_type?: 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM' | null;
	payout_status?: 'not_configured' | 'pending_review' | 'enabled' | 'blocked';
	events?: Event[] | string[];
}

export interface PageBlock {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	/** @description The id of the page that this block belongs to. */
	page?: Page | string | null;
	/** @description The data for the block. */
	item?: BlockHero | BlockRichtext | BlockForm | BlockPost | BlockGallery | BlockPricing | BlockEvent | string | null;
	/** @description The collection (type of block). */
	collection?: string | null;
	/** @description Temporarily hide this block on the website without having to remove it from your page. */
	hide_block?: boolean | null;
	/** @description Background color for the block to create contrast. Does not control dark or light mode for the entire site. */
	background?: 'light' | 'dark' | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
}

export interface Page {
	/** @primaryKey */
	id: string;
	sort?: number | null;
	/** @description The title of this page. @required */
	title: string;
	/** @description Unique URL for this page (start with `/`, can have multiple segments `/about/me`)). @required */
	permalink: string;
	/** @description Is this page published? */
	status?: 'draft' | 'in_review' | 'published';
	/** @description Publish now or schedule for later. */
	published_at?: string | null;
	seo?: ExtensionSeoMetadata | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
	/** @description Create and arrange different content blocks (like text, images, or videos) to build your page. */
	blocks?: PageBlock[] | string[];
}

export interface PaymentInstallment {
	/** @primaryKey */
	id: string;
	date_created?: string | null;
	date_updated?: string | null;
	/** @description Inscrição/registro relacionado @required */
	registration_id: EventRegistration | string;
	/** @description Número da parcela (1, 2, 3, 4) @required */
	installment_number: number;
	/** @description Total de parcelas (ex: 4) @required */
	total_installments: number;
	/** @description Valor desta parcela em reais @required */
	amount: number;
	/** @description Data de vencimento da parcela @required */
	due_date: string;
	/** @description Status do pagamento desta parcela @required */
	status: 'pending' | 'paid' | 'overdue' | 'cancelled';
	provider_transaction_id?: string | null;
	/** @description QR Code Pix em base64 para exibição */
	pix_qr_code_base64?: string | null;
	/** @description Código Pix copia e cola */
	pix_copy_paste?: string | null;
	/** @description Data e hora em que a parcela foi paga */
	paid_at?: string | null;
	/** @description Data e hora da confirmação do pagamento */
	payment_confirmed_at?: string | null;
}

export interface PaymentTransaction {
	/** @primaryKey */
	id: string;
	/** @description Inscrição relacionada */
	registration_id?: EventRegistration | string | null;
	provider?: 'mock' | 'abacatepay';
	provider_event_id?: string | null;
	provider_object_id?: string | null;
	event_type?: string | null;
	/** @description Valor da transação em reais */
	amount?: number | null;
	/** @description Status da transação */
	status?: 'succeeded' | 'failed' | 'pending' | 'refunded' | null;
	provider_fee?: number | null;
	platform_fee?: number | null;
	organizer_net?: number | null;
	/** @description Payload original do provedor, preservado para auditoria. */
	metadata?: Record<string, any> | null;
	date_created?: string | null;
}

export interface Post {
	/** @description Rich text content of your blog post. */
	content?: string | null;
	/** @primaryKey */
	id: string;
	/** @description Featured image for this post. Used in cards linking to the post and in the post detail page. */
	image?: MediaFile | string | null;
	/** @description Unique URL for this post (e.g., `yoursite.com/posts/{{your-slug}}`) */
	slug?: string | null;
	sort?: number | null;
	/** @description Is this post published? */
	status?: 'draft' | 'in_review' | 'published';
	/** @description Title of the blog post (used in page title and meta tags) @required */
	title: string;
	/** @description Short summary of the blog post to entice readers. */
	description?: string | null;
	/** @description Select the team member who wrote this post */
	author?: AppUser | string | null;
	/** @description Publish now or schedule for later. */
	published_at?: string | null;
	seo?: ExtensionSeoMetadata | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
	/** @required */
	name: string;
	system_prompt?: string | null;
	messages?: Array<{ role: 'user' | 'assistant'; text: string }> | null;
}

export interface Redirect {
	/** @primaryKey */
	id: string;
	response_code?: '301' | '302' | null;
	/** @description Old URL has to be relative to the site (ie `/blog` or `/news`). It cannot be a full url like (https://example.com/blog) */
	url_from?: string | null;
	/** @description The URL you're redirecting to. This can be a relative url (/resources/matt-is-cool) or a full url (https://example.com/blog). */
	url_to?: string | null;
	/** @description Short explanation of why the redirect was created. */
	note?: string | null;
	date_created?: string | null;
	user_created?: AppUser | string | null;
	date_updated?: string | null;
	user_updated?: AppUser | string | null;
}
