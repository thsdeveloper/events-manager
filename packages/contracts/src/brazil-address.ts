import { z } from 'zod';
export const BRAZILIAN_STATES = [
	['AC', 'Acre'],
	['AL', 'Alagoas'],
	['AP', 'Amapá'],
	['AM', 'Amazonas'],
	['BA', 'Bahia'],
	['CE', 'Ceará'],
	['DF', 'Brasília'],
	['ES', 'Espírito Santo'],
	['GO', 'Goiás'],
	['MA', 'Maranhão'],
	['MT', 'Mato Grosso'],
	['MS', 'Mato Grosso do Sul'],
	['MG', 'Minas Gerais'],
	['PA', 'Pará'],
	['PB', 'Paraíba'],
	['PR', 'Paraná'],
	['PE', 'Pernambuco'],
	['PI', 'Piauí'],
	['RJ', 'Rio de Janeiro'],
	['RN', 'Rio Grande do Norte'],
	['RS', 'Rio Grande do Sul'],
	['RO', 'Rondônia'],
	['RR', 'Roraima'],
	['SC', 'Santa Catarina'],
	['SP', 'São Paulo'],
	['SE', 'Sergipe'],
	['TO', 'Tocantins'],
] as const;
export const postalCodeSchema = z
	.string()
	.trim()
	.regex(/^\d{5}-?\d{3}$/, 'Informe um CEP com 8 dígitos')
	.transform((value) => value.replace('-', ''));
interface PhysicalLocation {
	event_type?: string | null;
	location_tbd?: boolean;
	location_name?: string | null;
	location_postal_code?: string | null;
	location_number?: string | null;
	location_state?: string | null;
}
export function addPhysicalLocationIssues(data: PhysicalLocation, context: z.RefinementCtx) {
	if (!['in_person', 'hybrid'].includes(data.event_type ?? '') || data.location_tbd) return;
	const issue = (field: string, message: string) => context.addIssue({ code: 'custom', path: [field], message });
	if (!data.location_name?.trim()) issue('location_name', 'Informe o nome do local');
	if (!postalCodeSchema.safeParse(data.location_postal_code).success)
		issue('location_postal_code', 'Informe um CEP com 8 dígitos');
	if (!data.location_number?.trim()) issue('location_number', 'Informe o número ou s/n');
	if (!BRAZILIAN_STATES.some(([uf]) => uf === data.location_state)) issue('location_state', 'Selecione um estado');
}
