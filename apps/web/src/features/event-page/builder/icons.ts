import type { EventPageSectionType } from '@events-manager/contracts';
import {
	CalendarClock,
	FileText,
	Handshake,
	HelpCircle,
	Images,
	MapPin,
	Megaphone,
	Sparkles,
	Ticket,
	Timer,
	Type,
	Users,
	type LucideIcon,
} from 'lucide-react';

export const SECTION_ICONS: Record<EventPageSectionType, LucideIcon> = {
	hero: Sparkles,
	about: FileText,
	tickets: Ticket,
	schedule: CalendarClock,
	speakers: Users,
	location: MapPin,
	faq: HelpCircle,
	gallery: Images,
	sponsors: Handshake,
	cta: Megaphone,
	countdown: Timer,
	richtext: Type,
};
