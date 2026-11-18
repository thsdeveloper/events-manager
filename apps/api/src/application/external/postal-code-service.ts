import { ApiError } from '../../shared/errors.js';
export interface PostalAddress {
	postal_code: string;
	street: string;
	neighborhood: string;
	city: string;
	state: string;
}
export interface PostalCodeGateway {
	find(code: string): Promise<PostalAddress | null>;
}
export class PostalCodeService {
	constructor(private readonly gateway: PostalCodeGateway) {}
	async find(code: string) {
		let address: PostalAddress | null;
		try {
			address = await this.gateway.find(code);
		} catch {
			throw new ApiError(
				'Não foi possível consultar o CEP. Preencha o endereço manualmente.',
				503,
				'POSTAL_CODE_UNAVAILABLE',
				undefined,
				{ exposeDetail: true },
			);
		}
		if (!address)
			throw new ApiError(
				'CEP não encontrado. Confira o número ou preencha o endereço manualmente.',
				404,
				'POSTAL_CODE_NOT_FOUND',
			);
		return address;
	}
}
