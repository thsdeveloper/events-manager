import { hasPermission, type IamAccess } from '@events-manager/contracts';
const moneyFields = new Set([
	'unit_price',
	'service_fee',
	'discount',
	'total_amount',
	'payment_amount',
	'platform_fee',
	'provider_fee',
	'organizer_net',
	'receipt_url',
	'payment_method',
	'provider_checkout_id',
	'provider_product_id',
	'provider_payload',
	'metadata',
]);
const personalFields = new Set([
	'attendee_document',
	'participant_document',
	'participant_phone',
	'participant_email',
	'user_id',
	'user',
]);
function redact(value: unknown, financial: boolean, personal: boolean): unknown {
	if (Array.isArray(value)) return value.map((item) => redact(item, financial, personal));
	if (!value || typeof value !== 'object') return value;
	return Object.fromEntries(
		Object.entries(value)
			.filter(([key]) => (financial || !moneyFields.has(key)) && (personal || !personalFields.has(key)))
			.map(([key, child]) => [key, redact(child, financial, personal)]),
	);
}
function mapEnvelope(value: unknown, mapper: (row: Record<string, unknown>) => unknown): unknown {
	if (Array.isArray(value)) return value.map((row) => mapEnvelope(row, mapper));
	if (!value || typeof value !== 'object') return value;
	const row = value as Record<string, unknown>;
	if ('data' in row) return { ...row, data: mapEnvelope(row.data, mapper) };
	return mapper(row);
}
export function presentIamResponse(route: string, value: unknown, access: IamAccess): unknown {
	if (access.isOwner) return value;
	if (['/api/organizer/profile', '/api/organizer/logo'].includes(route) && value && typeof value === 'object') {
		const envelope = value as Record<string, unknown>;
		const org = envelope.organizer as Record<string, unknown> | undefined;
		if (!org) return value;
		const visible = ['id', 'name', 'email', 'phone', 'description', 'website', 'logo', 'status'];
		return { ...envelope, organizer: Object.fromEntries(Object.entries(org).filter(([key]) => visible.includes(key))) };
	}
	if (route.startsWith('/api/admin/participantes'))
		return mapEnvelope(value, (row) => {
			const eventId = (row.event as { id?: string } | undefined)?.id;
			return redact(
				row,
				hasPermission(access, 'finance.read', eventId),
				hasPermission(access, 'participants.update', eventId),
			);
		});
	if (route === '/api/events' || route === '/api/events/:id')
		return mapEnvelope(value, (row) => {
			const eventId = typeof row.id === 'string' ? row.id : undefined;
			return {
				...row,
				tickets: hasPermission(access, 'tickets.read', eventId) ? row.tickets : [],
				registrations:
					hasPermission(access, 'participants.read', eventId) || hasPermission(access, 'finance.read', eventId)
						? redact(row.registrations, hasPermission(access, 'finance.read', eventId), false)
						: [],
			};
		});
	return value;
}
