import { z } from 'zod';
import type { PostalCodeGateway } from '../../application/external/postal-code-service.js';
const addressSchema = z.object({
	logradouro: z.string(),
	bairro: z.string(),
	localidade: z.string(),
	uf: z.string().length(2),
});
export class ViaCepGateway implements PostalCodeGateway {
	async find(code: string) {
		const response = await fetch(`https://viacep.com.br/ws/${code}/json/`, {
			signal: AbortSignal.timeout(8000),
			headers: { Accept: 'application/json' },
		});
		if (!response.ok) throw new Error('ViaCEP unavailable');
		const data = await response.json();
		if (data.erro === true || data.erro === 'true') return null;
		const address = addressSchema.parse(data);
		return {
			postal_code: code,
			street: address.logradouro,
			neighborhood: address.bairro,
			city: address.localidade,
			state: address.uf,
		};
	}
}
