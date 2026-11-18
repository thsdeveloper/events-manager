import { hasPermission } from '@events-manager/contracts';
import { getServerPermissions } from '@/lib/auth/server-permissions';
import { canVisitAdminPath } from '@/lib/auth/permission-policy';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { getEventSelection } from '@/features/event-scope/api/getEventSelection';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { requireOrganizer } from '@/lib/auth/server-auth';
import {
	fetchFinanceEvents,
	fetchFinanceOverview,
	fetchTransactions,
	fetchPayouts,
	type AppliedFilters,
} from '@/lib/finance/server-fetchers';
import FinanceiroDashboard from './_components/FinanceiroDashboard';
import Loading from './loading';

// Default filters for initial load
const defaultFilters: AppliedFilters = {
	range: '30d',
	status: 'all',
	eventId: 'all',
	search: '',
	customFrom: null,
	customTo: null,
};

export default async function FinanceiroPage() {
	const [{ organizer }, { selectedEventId }, access] = await Promise.all([
		requireOrganizer(),
		getEventSelection(),
		getServerPermissions(),
	]);
	if (!canVisitAdminPath(access, '/admin/financeiro')) return <AccessDenied />;

	// Get access token from cookies
	const cookieStore = await cookies();
	const accessToken = cookieStore.get('access_token')?.value;

	if (!accessToken) {
		throw new Error('Access token not found');
	}

	// Fetch all data in parallel on the server
	const [events, overview, transactions, payouts] = await Promise.all([
		fetchFinanceEvents(organizer, accessToken),
		fetchFinanceOverview(organizer, accessToken, defaultFilters),
		fetchTransactions(organizer, accessToken, defaultFilters, 1, 20, 'date', 'desc'),
		selectedEventId || !hasPermission(access, 'payouts.read') ? Promise.resolve(null) : fetchPayouts(organizer),
	]);

	return (
		<Suspense fallback={<Loading />}>
			<FinanceiroDashboard
				organizer={organizer}
				initialEvents={events}
				initialOverview={overview}
				initialTransactions={transactions}
				initialPayouts={payouts}
			/>
		</Suspense>
	);
}
