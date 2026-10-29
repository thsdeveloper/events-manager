'use client';

import { useCoupons } from '../api/useCoupons';
import { CouponManager } from './CouponManager';

/** Liga a gestão de cupons à API, para a aba do evento no painel do organizador. */
export function EventCoupons({ eventId }: { eventId: string }) {
	const { coupons, create, error, isSaving, remove, setStatus } = useCoupons(eventId);

	return (
		<CouponManager
			coupons={coupons}
			create={create}
			error={error}
			isSaving={isSaving}
			remove={remove}
			setStatus={setStatus}
		/>
	);
}
