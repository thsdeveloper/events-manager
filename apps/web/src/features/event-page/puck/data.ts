import type { EventPageLayout } from '@events-manager/contracts';
import type { EventPageData } from './types';

/** Puck is an interface adapter: the API continues to own the validated document. */
export function layoutToPuckData(layout: EventPageLayout): EventPageData {
	const { theme, header, footer, sections } = structuredClone(layout);

	return {
		root: { props: { theme, header, footer } },
		content: sections.map(({ type, ...props }) => ({ type, props })),
	} as EventPageData;
}

/** Editing can be incomplete. Validate this value before persistence/publication. */
export function puckDataToLayout(data: EventPageData): EventPageLayout {
	const { theme, header, footer } = data.root.props ?? {};

	return {
		version: 1,
		theme,
		header,
		footer,
		sections: data.content.map(({ type, props }) => ({ ...props, type })),
	} as EventPageLayout;
}
