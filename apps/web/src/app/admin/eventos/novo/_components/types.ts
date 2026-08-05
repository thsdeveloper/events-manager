'use client';

export type EventWizardStepId =
	| 'basic'
	| 'visual'
	| 'details'
	| 'schedule'
	| 'location'
	| 'tickets'
	| 'review';

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
	description: string;
	tags?: string[];
	start_date: string;
	end_date: string;
	registration_start?: string;
	registration_end?: string;
	event_type: 'in_person' | 'online' | 'hybrid';
	location_name?: string;
	location_address?: string;
	online_url?: string;
	is_free: boolean;
	max_attendees?: number | null;
	status: 'draft' | 'published' | 'cancelled' | 'archived';
	featured: boolean;
	publish_after_create: boolean;
}
