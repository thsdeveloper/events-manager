import { notificationCatalog, type NotificationKind } from '@events-manager/contracts';
import type { EmailBranding } from '../email/email-branding.js';
import { renderEmail, type EmailBlock } from '../email/email-template.js';
const messages: Record<NotificationKind, [string, string]> = {
	welcome: [
		'Sua conta está pronta',
		'Boas-vindas à Flouvi! Seu e-mail foi confirmado. Complete seu perfil para agilizar a compra de ingressos e acompanhe seus eventos em um só lugar.',
	],
	purchase_pending: [
		'Seu pagamento aguarda confirmação',
		'Sua compra foi iniciada. Acompanhe o pagamento na sua área de ingressos. O ingresso só será liberado após a confirmação do pagamento; no Pix parcelado, após a quitação de todas as parcelas.',
	],
	installment_paid: [
		'Recebemos uma parcela do seu Pix',
		'O pagamento desta parcela foi confirmado. O ingresso será liberado depois do pagamento de todas as parcelas. Confira o que ainda falta na sua compra.',
	],
	payment_reminder: [
		'Sua parcela está próxima de vencer',
		'Confira a parcela e as opções de pagamento na sua compra. Se você acabou de pagar, aguarde a confirmação antes de tentar novamente.',
	],
	purchase_refunded: [
		'Reembolso confirmado',
		'Recebemos uma confirmação de reembolso para esta compra. Consulte os detalhes para conferir o valor e a situação de cada pagamento.',
	],
	event_changed: [
		'O evento teve uma alteração',
		'A organização alterou a data, o horário, o formato ou o local do evento. Confira as informações atualizadas antes de se programar.',
	],
	event_cancelled: [
		'O evento foi cancelado',
		'A organização cancelou o evento abaixo. Consulte sua compra e entre em contato com a organização para acompanhar as orientações e a situação do pagamento.',
	],
	event_reminder: [
		'Seu evento está chegando',
		'O evento começa nas próximas 24 horas. Separe seu ingresso e um documento com foto. Confira a data e o local antes de sair.',
	],
	organization_created: [
		'Sua organização foi cadastrada',
		'O cadastro da sua organização foi recebido. Você pode acompanhar sua situação e configurar os dados da organização na Flouvi.',
	],
	organization_status: [
		'A situação da sua organização mudou',
		'Confira a situação atual da organização abaixo. Acesse suas configurações para consultar os próximos passos.',
	],
	organization_sale: [
		'Nova compra confirmada',
		'Uma compra de ingressos foi confirmada para seu evento. Consulte os detalhes e os valores no financeiro da organização.',
	],
	organization_refund: [
		'Reembolso de compra confirmado',
		'Um reembolso foi confirmado para uma compra do seu evento. Consulte o financeiro para conferir a transação.',
	],
	organization_payout: [
		'Atualização do seu repasse',
		'A situação de um repasse da organização foi atualizada. Confira os detalhes no financeiro.',
	],
	organization_receiving: [
		'Análise da conta de recebimento concluída',
		'A análise dos dados de recebimento da organização foi concluída. Acesse a área de recebimento para consultar o resultado e eventuais orientações.',
	],
	organization_event_published: [
		'Seu evento está publicado',
		'O evento já está publicado na Flouvi. Confira a página antes de compartilhar com seu público.',
	],
};
const statuses: Record<string, string> = {
	pending: 'Pendente',
	active: 'Ativa',
	archived: 'Arquivada',
	approved: 'Aprovada',
	rejected: 'Rejeitada',
	completed: 'Concluído',
	failed: 'Falhou',
	cancelled: 'Cancelado',
	paid: 'Pago',
	free: 'Gratuito',
};
function text(value: unknown) {
	return typeof value === 'string' ? value.slice(0, 500) : '';
}
function date(value: unknown) {
	const parsed = new Date(text(value));
	return Number.isNaN(parsed.getTime())
		? ''
		: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(
				parsed,
			) + ' (Brasília)';
}
export function renderNotification(kind: NotificationKind, payload: Record<string, unknown>, branding: EmailBranding) {
	const [heading, description] = messages[kind];
	const subject = kind === 'payment_reminder' && payload.phase === 'overdue' ? 'Sua parcela está vencida' : heading;
	const rows: Array<{ label: string; value: string }> = [];
	if (payload.title)
		rows.push({
			label:
				kind.startsWith('organization_') &&
				['organization_created', 'organization_status', 'organization_receiving', 'organization_payout'].includes(kind)
					? 'Organização'
					: 'Evento',
			value: text(payload.title),
		});
	if (typeof payload.amount === 'number' && Number.isFinite(payload.amount))
		rows.push({
			label: 'Valor',
			value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload.amount),
		});
	if (payload.installmentNumber)
		rows.push({
			label: 'Parcela',
			value: `${Number(payload.installmentNumber)} de ${Number(payload.totalInstallments)}`,
		});
	if (payload.quantity) rows.push({ label: 'Ingressos', value: String(Number(payload.quantity)) });
	if (payload.status && statuses[text(payload.status)])
		rows.push({ label: 'Situação', value: statuses[text(payload.status)] });
	if (date(payload.eventDate)) rows.push({ label: 'Quando', value: date(payload.eventDate) });
	if (date(payload.dueDate)) rows.push({ label: 'Vencimento', value: date(payload.dueDate) });
	if (payload.locationName) rows.push({ label: 'Local', value: text(payload.locationName) });
	let actionUrl = `${branding.siteUrl}/perfil`;
	try {
		const candidate = new URL(text(payload.path), branding.siteUrl);
		if (candidate.origin === new URL(branding.siteUrl).origin) actionUrl = candidate.href;
	} catch {
		/* Invalid paths use the account page. */
	}
	const blocks: EmailBlock[] = [
		{ type: 'heading', text: subject },
		{ type: 'paragraph', text: description },
		...(rows.length ? [{ type: 'details' as const, rows }] : []),
		{ type: 'button', label: kind === 'welcome' ? 'Acessar minha conta' : 'Ver detalhes', url: actionUrl },
	];
	const optional = notificationCatalog[kind].preference !== null;
	return {
		subject,
		...renderEmail({
			branding,
			blocks,
			preheader: subject,
			footerNote: optional
				? 'Você recebe este aviso conforme suas preferências de e-mail.'
				: 'Este é um aviso essencial sobre uma ação que afeta sua compra.',
			footerLinks: [
				{ label: 'Preferências de e-mail', url: `${branding.siteUrl}/perfil?section=preferences` },
				...(notificationCatalog[kind].scope === 'organization'
					? [{ label: 'Notificações da organização', url: `${branding.siteUrl}/admin/configuracoes` }]
					: []),
			],
		}),
	};
}
