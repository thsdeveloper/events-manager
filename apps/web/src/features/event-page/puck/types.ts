import type { Config, Data } from '@puckeditor/core';
import type { EventPageLayout, EventPageSection, EventPageSectionType } from '@events-manager/contracts';

export type EventPageComponents = {
	[T in EventPageSectionType]: Omit<Extract<EventPageSection, { type: T }>, 'type' | 'id'>;
};
export type EventPageRoot = Pick<EventPageLayout, 'header' | 'footer' | 'theme'>;
export type EventPageConfig = Config<EventPageComponents, EventPageRoot>;
export type EventPageData = Data<EventPageComponents, EventPageRoot>;
