'use client';

import { EventCreationWizard } from './_components/EventCreationWizard';

export default function NovoEventoPage() {
	// The sticky progress bar should sit close under the header, so most of the
	// admin layout's top padding is cancelled here instead of shrinking it for
	// every admin page. The offsets leave a consistent 8px at each breakpoint.
	return (
		<div className="mx-auto -mt-2 space-y-6 pb-24 sm:-mt-4 lg:-mt-6">
			<EventCreationWizard />
		</div>
	);
}
