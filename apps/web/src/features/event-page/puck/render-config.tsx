import { EVENT_PAGE_SECTION_TYPES, type EventPageSection } from '@events-manager/contracts';
import { LandingSection } from '../components/EventLandingPage';
import type { LandingContext } from '../components/landing-context';
import type { EventPageConfig } from './types';

/** Render-only config: no field editors, uploads, state store or editor CSS. */
export function createRenderConfig(context: LandingContext): EventPageConfig {
	const components = Object.fromEntries(
		EVENT_PAGE_SECTION_TYPES.map((type) => [
			type,
			{
				render: ({ puck: _puck, editMode: _editMode, ...props }: Record<string, unknown>) =>
					props.hidden ? null : <LandingSection context={context} section={{ ...props, type } as EventPageSection} />,
			},
		]),
	) as unknown as EventPageConfig['components'];

	return { components, root: { render: ({ children }) => <>{children}</> } };
}
