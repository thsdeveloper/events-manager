import { hasPlatformPermission, type PlatformAccess } from '@events-manager/contracts';
const financial = new Set([
	'grossRevenue',
	'availableBalance',
	'reservedPayouts',
	'completedPayouts',
	'ticketsSold',
	'failedPayments',
	'amount',
	'net_amount',
	'provider_fee',
	'platform_fee',
	'organizer_net',
	'receipt_url',
	'receipt_document_id',
	'provider_payout_id',
	'provider_object_id',
	'bank_reference',
]);
const receiving = new Set([
	'account_snapshot',
	'account',
	'holder_name',
	'holder_document',
	'account_number',
	'account_digit',
	'branch',
	'branch_digit',
	'documents',
]);
/** Remove restricted fields even from nested organizer audit snapshots. */
export function presentPlatformData(access: PlatformAccess, data: unknown): unknown {
	const finance = hasPlatformPermission(access, 'platform_finance.read');
	const accounts =
		hasPlatformPermission(access, 'platform_receiving.read') ||
		hasPlatformPermission(access, 'platform_payouts.execute');
	function visit(value: unknown): unknown {
		if (Array.isArray(value)) return value.map(visit);
		if (!value || typeof value !== 'object') return value;
		return Object.fromEntries(
			Object.entries(value)
				.filter(
					([key]) =>
						!(!finance && financial.has(key)) &&
						!(!accounts && (receiving.has(key) || /^(?:payout_pix_|pix_key|bank_)/.test(key))),
				)
				.map(([key, item]) => [key, visit(item)]),
		);
	}
	return visit(data);
}
