'use client';
import { usePermissions } from '@/components/auth/PermissionsProvider';

import { useCoupons } from '../api/useCoupons';
import { CouponManager } from './CouponManager';

/** Liga a gestão de cupons à API, para a aba do evento no painel do organizador. */
export function EventCoupons({ eventId }: { eventId: string }) {
	const { can } = usePermissions();
	const { coupons, create, error, isSaving, remove, setStatus } = useCoupons(eventId);

	return (
		<CouponManager
			permissions={{
				create: can('coupons.create', eventId),
				update: can('coupons.update', eventId),
				remove: can('coupons.delete', eventId),
			}}
			coupons={coupons}
			create={create}
			error={error}
			isSaving={isSaving}
			remove={remove}
			setStatus={setStatus}
		/>
	);
}
