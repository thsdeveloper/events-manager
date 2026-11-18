/** Keep the current section, but never a detail or filter tied to the previous event. */
export function selectionDestination(pathname: string, search: string, eventId: string | null) {
	let path = pathname;
	const eventDetail = pathname.match(/^\/admin\/eventos\/([^/]+)(\/.*)?$/);
	if (eventDetail && eventDetail[1] !== 'novo') {
		path = eventId ? `/admin/eventos/${eventId}${eventDetail[2] ?? ''}` : '/admin/eventos';
	}
	if (/^\/admin\/participantes\/[^/]+/.test(pathname)) path = '/admin/participantes';
	const query = new URLSearchParams(search);
	for (const key of ['eventId', 'eventIds', 'event_id', 'ticketTypeIds', 'page']) query.delete(key);
	const suffix = query.toString();

	return suffix ? `${path}?${suffix}` : path;
}
