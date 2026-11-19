import { Render } from '@puckeditor/core/rsc';
import { EventLandingPage, type EventLandingPageProps } from '../components/EventLandingPage';
import { layoutToPuckData } from './data';
import { createRenderConfig } from './render-config';

/** Explicit RSC entry keeps the interactive Puck runtime out of public pages. */
export function EventPageRenderer(props: EventLandingPageProps) {
	return (
		<EventLandingPage
			{...props}
			renderSections={(context, sections) => (
				<Render config={createRenderConfig(context)} data={layoutToPuckData({ ...props.layout, sections })} />
			)}
		/>
	);
}
