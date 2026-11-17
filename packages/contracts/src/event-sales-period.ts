/** Compatibility for saved drafts from before sales periods moved to tickets. */
export function migrateEventSalesPeriod<T extends Record<string, unknown>>(input: T): T {
	const values = { ...input };
	delete values.registration_start;
	delete values.registration_end;
	const validDate = (value: unknown) =>
		typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
	const eventStart = validDate(input.registration_start);
	const eventEnd = validDate(input.registration_end);
	if ((!eventStart && !eventEnd) || !Array.isArray(input.tickets)) return values;
	const tickets = input.tickets.map((value: unknown) => {
		if (!value || typeof value !== 'object') return value;
		const ticket = value as Record<string, unknown>;
		const starts = [eventStart, validDate(ticket.sale_start_date)].filter((date): date is string => Boolean(date));
		const ends = [eventEnd, validDate(ticket.sale_end_date)].filter((date): date is string => Boolean(date));
		const start = starts.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
		const end = ends.sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null;
		// Previously the intersection was empty, so the ticket must remain unavailable.
		if (start && end && Date.parse(end) <= Date.parse(start)) return { ...ticket, status: 'inactive' };
		return { ...ticket, sale_start_date: start, sale_end_date: end };
	});
	return { ...values, tickets };
}
