'use client';
import { createUsePuck, type FieldTransforms } from '@puckeditor/core';
import {
	buildEventPageSection,
	EVENT_PAGE_SECTION_META,
	EVENT_PAGE_SECTION_TYPES,
	nextEventPageAnchor,
	newEventPageItemId,
	type Event,
	type EventPageSection,
} from '@events-manager/contracts';
import { EventLandingPage, LandingSection } from '../components/EventLandingPage';
import { puckDataToLayout } from './data';
import { commonFields, rootFields, sectionFields } from './editor-fields';
import type { EventPageConfig, EventPageData, EventPageRoot } from './types';
import type { ReactNode } from 'react';
const uniqueTypes = new Set(['hero', 'tickets', 'countdown', 'location']);
const useEventPuck = createUsePuck<EventPageConfig>();

/** HTML remains a string for our sanitized renderer, also in the live editor canvas. */
export const eventFieldTransforms: FieldTransforms<EventPageConfig> = { richtext: ({ value }) => value };

function EditorRoot({ event, children, ...root }: { event: Event; children: ReactNode } & EventPageRoot) {
	const content = useEventPuck((state) => state.appState.data.content);

	return (
		<EventLandingPage event={event} layout={puckDataToLayout({ root: { props: root }, content })} mode="preview">
			{children}
		</EventLandingPage>
	);
}

export function createEditorConfig(
	event: Event,
	initialData: EventPageData,
	getData: () => EventPageData,
): EventPageConfig {
	const knownIds = new Set(initialData.content.map((item) => item.props.id));
	const context = {
		event,
		mode: 'preview' as const,
		checkoutHref: `/eventos/${event.slug}/checkout`,
		ticketsAnchor: null,
	};
	const components = Object.fromEntries(
		EVENT_PAGE_SECTION_TYPES.map((type) => {
			const { type: _type, id: _id, ...defaults } = buildEventPageSection(type);

			return [
				type,
				{
					label: EVENT_PAGE_SECTION_META[type].label,
					defaultProps: defaults,
					fields: {
						...Object.fromEntries(
							Object.entries(commonFields).filter(([key]) => type !== 'tickets' || key !== 'hidden'),
						),
						...sectionFields[type],
					},
					resolvePermissions: (
						_data: unknown,
						{ permissions, appState }: { permissions: Record<string, boolean>; appState: { data: EventPageData } },
					) => ({
						...permissions,
						delete: permissions.delete && type !== 'tickets',
						duplicate: permissions.duplicate && !uniqueTypes.has(type) && appState.data.content.length < 30,
						insert:
							permissions.insert &&
							appState.data.content.length < 30 &&
							(!uniqueTypes.has(type) || !appState.data.content.some((item) => item.type === type)),
					}),
					resolveData: ({ props }: { props: EventPageData['content'][number]['props'] }) => {
						const first = !knownIds.has(props.id);
						knownIds.add(props.id);
						const existing = getData().content.filter((item) => item.props.id !== props.id);
						const anchor = first
							? nextEventPageAnchor(
									type,
									existing.map((item) => item.props.anchor),
								)
							: props.anchor;
						const items = 'items' in props ? props.items : undefined;
						const seen = new Set<string>();
						const normalizedItems = items?.map((item) => {
							const id = first || !item.id || seen.has(item.id) ? newEventPageItemId() : item.id;
							seen.add(id);

							return {
								...item,
								id,
								...(type === 'sponsors' && 'url' in item ? { url: item.url?.trim() || null } : {}),
							};
						});

						return {
							props: {
								...props,
								anchor,
								...(type === 'tickets' ? { hidden: false } : {}),
								...(normalizedItems ? { items: normalizedItems } : {}),
							},
						};
					},
					render: ({ puck: _puck, editMode: _editMode, ...props }: Record<string, unknown>) =>
						props.hidden ? (
							<div className="border-y border-dashed bg-muted p-6 text-center text-sm text-muted-foreground">
								Seção oculta: {EVENT_PAGE_SECTION_META[type].label}
							</div>
						) : (
							<LandingSection context={context} section={{ ...props, type } as EventPageSection} />
						),
				},
			];
		}),
	) as unknown as EventPageConfig['components'];
	const anchors = () =>
		getData().content.map((item) => ({
			label: item.props.title || EVENT_PAGE_SECTION_META[item.type].label,
			value: item.props.anchor,
		}));

	return {
		components,
		categories: {
			essentials: { title: 'Essenciais', components: ['hero', 'about', 'tickets', 'location'] },
			program: { title: 'Programação e pessoas', components: ['schedule', 'speakers', 'countdown'] },
			content: { title: 'Conteúdo e divulgação', components: ['richtext', 'gallery', 'faq', 'sponsors', 'cta'] },
		},
		root: {
			label: 'Configurações da página',
			fields: rootFields(anchors()) as NonNullable<NonNullable<EventPageConfig['root']>['fields']>,
			resolveFields: () => rootFields(anchors()) as NonNullable<NonNullable<EventPageConfig['root']>['fields']>,
			render: ({ puck: _puck, ...props }) => <EditorRoot {...props} event={event} />,
		},
	};
}
