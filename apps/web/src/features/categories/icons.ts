import {
	Baby,
	Bike,
	Book,
	Briefcase,
	Camera,
	Church,
	Clapperboard,
	Code,
	Drama,
	Dumbbell,
	GraduationCap,
	HeartPulse,
	Laptop,
	Leaf,
	type LucideIcon,
	Mic,
	Music,
	Palette,
	PartyPopper,
	Plane,
	Trophy,
	Users,
	UtensilsCrossed,
} from 'lucide-react';

/**
 * The icons a category may use. This is the single source of truth: the super
 * admin picker offers exactly these, and the event wizard renders from the same
 * map — so a category can never be saved with an icon the front cannot draw.
 *
 * Keys are stored in the database, so renaming one orphans existing categories.
 */
export const CATEGORY_ICONS = {
	'party-popper': { label: 'Festa', Icon: PartyPopper },
	music: { label: 'Música', Icon: Music },
	mic: { label: 'Palestra', Icon: Mic },
	laptop: { label: 'Tecnologia', Icon: Laptop },
	code: { label: 'Programação', Icon: Code },
	briefcase: { label: 'Negócios', Icon: Briefcase },
	'graduation-cap': { label: 'Educação', Icon: GraduationCap },
	book: { label: 'Literatura', Icon: Book },
	palette: { label: 'Arte', Icon: Palette },
	drama: { label: 'Teatro', Icon: Drama },
	clapperboard: { label: 'Cinema', Icon: Clapperboard },
	camera: { label: 'Fotografia', Icon: Camera },
	dumbbell: { label: 'Fitness', Icon: Dumbbell },
	trophy: { label: 'Esporte', Icon: Trophy },
	bike: { label: 'Ciclismo', Icon: Bike },
	'heart-pulse': { label: 'Saúde', Icon: HeartPulse },
	'utensils-crossed': { label: 'Gastronomia', Icon: UtensilsCrossed },
	leaf: { label: 'Natureza', Icon: Leaf },
	plane: { label: 'Viagem', Icon: Plane },
	church: { label: 'Religioso', Icon: Church },
	baby: { label: 'Infantil', Icon: Baby },
	users: { label: 'Comunidade', Icon: Users },
} satisfies Record<string, { label: string; Icon: LucideIcon }>;

export type CategoryIconName = keyof typeof CATEGORY_ICONS;

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS) as CategoryIconName[];

/** Shown when a category has no icon or carries one no longer in the catalog. */
export const FALLBACK_CATEGORY_ICON = Users;

export function resolveCategoryIcon(iconName?: string | null): LucideIcon {
	if (!iconName) return FALLBACK_CATEGORY_ICON;
	const entry = CATEGORY_ICONS[iconName.toLowerCase() as CategoryIconName];

	return entry?.Icon ?? FALLBACK_CATEGORY_ICON;
}

/** Palette offered by the picker; any hex value is still accepted. */
export const CATEGORY_COLORS = [
	'#6644ff',
	'#ec4899',
	'#ef4444',
	'#f97316',
	'#eab308',
	'#22c55e',
	'#14b8a6',
	'#0ea5e9',
	'#6366f1',
	'#8b5cf6',
	'#64748b',
	'#0f172a',
] as const;
