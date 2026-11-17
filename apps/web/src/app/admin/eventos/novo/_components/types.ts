'use client';

import type { EventTicketGroupDraft, EventVisibility } from '@events-manager/contracts';
import type { TicketDraft } from '@/features/tickets/types';

export type EventWizardStepId = 'basic' | 'visual' | 'details' | 'schedule' | 'location' | 'tickets' | 'review';

export interface EventWizardStepMeta {
	id: EventWizardStepId;
	title: string;
	description: string;
	estimatedMinutes?: number;
}

export interface EventWizardFormValues {
	title: string;
	category_id: string;
	short_description?: string;
	cover_image?: string;
	cover_image_alt?: string;
	description_en?: string;
	description_es?: string;
	location_tbd?: boolean;
	show_map?: boolean;
	location_street?: string;
	location_number?: string;
	location_complement?: string;
	location_neighborhood?: string;
	location_city?: string;
	location_state?: string;
	location_postal_code?: string;
	online_platform?: 'custom' | 'youtube' | 'zoom' | 'google_meet' | 'microsoft_teams' | 'vimeo';
	description: string;
	tags?: string[];
	start_date: string;
	end_date: string;
	event_type: 'in_person' | 'online' | 'hybrid';
	location_name?: string;
	location_address?: string;
	latitude?: number | null;
	longitude?: number | null;
	online_url?: string;
	is_free: boolean;
	/** Held in the form until the event is created; sent with it in one call. */
	tickets: TicketDraft[];
	ticket_groups?: EventTicketGroupDraft[];
	max_attendees?: number | null;
	status: 'draft' | 'published' | 'cancelled' | 'archived';
	visibility?: EventVisibility;
	featured: boolean;
	publish_after_create: boolean;
}

export interface EventWizardSnapshot {
	id: string;
	values: Record<string, unknown>;
	current_step: number;
	date_updated?: string;
	event_id?: string | null;
}
