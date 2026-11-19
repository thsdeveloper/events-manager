import { getCheckoutProfileMissingFields } from '@events-manager/contracts';
import type { SerializedUser } from '../auth/auth-service.js';
import type { CheckoutInput } from './payment-service.js';
import { ApiError } from '../../shared/errors.js';

/** O comprador é a conta autenticada; participantes pertencem aos ingressos. */
export function checkoutBuyerFromProfile(profile: SerializedUser, submitted: CheckoutInput['participantInfo']) {
	const missingFields = getCheckoutProfileMissingFields(profile);
	if (missingFields.length)
		throw new ApiError(
			'Complete seus dados e confirme seu telefone nesta tela para continuar a compra.',
			422,
			'CHECKOUT_PROFILE_INCOMPLETE',
			{ missingFields },
		);
	const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
	const buyer = {
		name: [text(profile.first_name), text(profile.last_name)].filter(Boolean).join(' '),
		email: text(profile.email),
		...(text(profile.phone) ? { phone: text(profile.phone) } : {}),
		...(text(profile.document) ? { document: text(profile.document) } : {}),
	};

	if (
		submitted.name.trim() !== buyer.name ||
		submitted.email.trim().toLowerCase() !== buyer.email.toLowerCase() ||
		(submitted.phone && submitted.phone !== buyer.phone) ||
		(submitted.document && submitted.document !== buyer.document)
	)
		throw new ApiError(
			'Os dados do comprador devem ser os do seu perfil. Atualize os dados no checkout para continuar.',
			422,
			'CHECKOUT_BUYER_MISMATCH',
		);

	return buyer;
}
