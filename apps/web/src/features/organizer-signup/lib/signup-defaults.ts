import type { OrganizerAccountType } from '@events-manager/contracts';
import { maskCPF, onlyDigits } from '@/lib/br-documents';

export interface SignupProfile {
	document?: string | null;
	email: string;
	first_name?: string | null;
	last_name?: string | null;
	phone?: string | null;
}

export interface SignupDefaults {
	document: string;
	email: string;
	name: string;
	phone: string;
}

export const ACCOUNT_TYPE_OPTIONS: Array<{
	value: OrganizerAccountType;
	title: string;
	description: string;
}> = [
	{
		value: 'individual',
		title: 'Pessoa física',
		description: 'Venda no seu nome, com o CPF já validado no seu perfil. Pronto em um minuto.',
	},
	{
		value: 'company',
		title: 'Empresa ou organização',
		description: 'Venda em nome de uma empresa, produtora ou coletivo, informando o CNPJ.',
	},
];

/**
 * O que já sabemos da pessoa vira o ponto de partida do formulário. Pessoa
 * física vende com o próprio nome e CPF; empresa mantém só o contato, porque
 * a marca e o CNPJ são da organização, não da pessoa.
 */
export function signupDefaults(user: SignupProfile, accountType: OrganizerAccountType): SignupDefaults {
	const shared = { email: user.email, phone: onlyDigits(user.phone ?? '') };
	if (accountType === 'individual') {
		return {
			...shared,
			name: [user.first_name, user.last_name].filter(Boolean).join(' '),
			document: onlyDigits(user.document ?? ''),
		};
	}

	return { ...shared, name: '', document: '' };
}

export function formatCpf(document: string) {
	return maskCPF(document);
}
