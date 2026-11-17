export interface TicketStockRegistration {
	status?: string | null;
	payment_status?: string | null;
	quantity?: number | null;
	payment_amount?: number | null;
	total_amount?: number | null;
	inventory_reserved?: boolean | null;
	ticket_type_id?: string | null;
}
export function ticketMetrics(rows: TicketStockRegistration[]) {
	const result = { sold: 0, reserved: 0, cancelled: 0, revenue: 0 };
	for (const row of rows) {
		const quantity = Math.max(0, Number(row.quantity ?? 1));
		if (row.status === 'cancelled' || row.payment_status === 'refunded') {
			result.cancelled += quantity;
			continue;
		}
		if (row.payment_status === 'paid' || row.payment_status === 'free') result.sold += quantity;
		else if (row.inventory_reserved === true) result.reserved += quantity;
		if (row.payment_status === 'paid')
			result.revenue += Math.max(0, Number(row.total_amount ?? row.payment_amount ?? 0));
		else if (row.status === 'partial_payment') result.revenue += Math.max(0, Number(row.payment_amount ?? 0));
	}
	result.revenue = Math.round(result.revenue * 100) / 100;

	return result;
}
