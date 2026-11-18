export const organizerStatusLabels = { active: 'Ativo', pending: 'Em análise', archived: 'Arquivado' };
export const payoutStatusLabels = {
	not_configured: 'Não cadastrado',
	pending_review: 'Aguardando revisão',
	enabled: 'Recebimento aprovado',
	blocked: 'Repasses bloqueados',
};
export const supportFieldLabels: Record<string, string> = {
	name: 'Nome',
	email: 'E-mail',
	phone: 'Telefone',
	website: 'Site',
	description: 'Descrição',
	status: 'Status da conta',
	payout_status: 'Situação do recebimento',
	payout_pix_key: 'Chave PIX',
	payout_pix_key_type: 'Tipo da chave PIX',
};
export function supportValue(value: unknown): string {
	if (value === null || value === undefined || value === '') return 'Não informado';
	const labels: Record<string, string> = {
		...organizerStatusLabels,
		...payoutStatusLabels,
		published: 'Publicado',
		draft: 'Rascunho',
		cancelled: 'Cancelado',
		succeeded: 'Pago',
		failed: 'Falhou',
		refunded: 'Reembolsado',
		processing: 'Processando',
		completed: 'Concluído',
	};

	return typeof value === 'string' ? (labels[value] ?? value) : String(value);
}
export function supportDate(value: unknown) {
	if (!value || typeof value !== 'string' || Number.isNaN(Date.parse(value))) return '—';

	return new Intl.DateTimeFormat('pt-BR', {
		dateStyle: 'short',
		timeStyle: 'short',
		timeZone: 'America/Sao_Paulo',
	}).format(new Date(value));
}
