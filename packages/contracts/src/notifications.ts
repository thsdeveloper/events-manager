import { z } from 'zod';

export const userEmailPreferencesSchema = z
	.object({
		welcome: z.boolean().default(true),
		payment_updates: z.boolean().default(true),
		payment_reminders: z.boolean().default(true),
		event_updates: z.boolean().default(true),
		event_reminders: z.boolean().default(true),
		organization_notifications: z.boolean().default(true),
	})
	.strict();
export const organizationEmailPreferencesSchema = z
	.object({
		organization_updates: z.boolean().default(true),
		sales: z.boolean().default(true),
		refunds: z.boolean().default(true),
		payouts: z.boolean().default(true),
		receiving_account: z.boolean().default(true),
		event_publication: z.boolean().default(true),
	})
	.strict();
export const userEmailPreferenceOptions = [
	{ key: 'welcome', label: 'Boas-vindas', description: 'Orientações para começar depois de confirmar seu e-mail.' },
	{
		key: 'payment_updates',
		label: 'Atualizações de pagamento',
		description: 'Pagamento iniciado e confirmação de parcelas do Pix.',
	},
	{
		key: 'payment_reminders',
		label: 'Lembretes de parcelas',
		description: 'Um aviso próximo ao vencimento e outro em caso de atraso.',
	},
	{
		key: 'event_updates',
		label: 'Mudanças no evento',
		description: 'Alterações de data, horário, formato ou local dos eventos que você comprou.',
	},
	{
		key: 'event_reminders',
		label: 'Lembrete do evento',
		description: 'Um lembrete nas 24 horas anteriores ao início do evento.',
	},
	{
		key: 'organization_notifications',
		label: 'Avisos das minhas organizações',
		description: 'Receba os avisos habilitados nas organizações das quais você é proprietário.',
	},
] as const;
export const organizationEmailPreferenceOptions = [
	{
		key: 'organization_updates',
		label: 'Cadastro e situação da organização',
		description: 'Criação, ativação e mudanças na situação da organização.',
	},
	{
		key: 'sales',
		label: 'Novas vendas confirmadas',
		description: 'Um aviso por compra paga. Pix parcelado somente após a quitação.',
	},
	{ key: 'refunds', label: 'Reembolsos', description: 'Confirmação de reembolso de uma compra.' },
	{ key: 'payouts', label: 'Repasses', description: 'Atualizações sobre a solicitação e conclusão dos repasses.' },
	{
		key: 'receiving_account',
		label: 'Conta de recebimento',
		description: 'Resultado da análise dos dados de recebimento.',
	},
	{
		key: 'event_publication',
		label: 'Publicação de eventos',
		description: 'Confirmação de que um evento foi publicado.',
	},
] as const;
export type UserEmailPreference = (typeof userEmailPreferenceOptions)[number]['key'];
export type OrganizationEmailPreference = (typeof organizationEmailPreferenceOptions)[number]['key'];
export const notificationCatalog = {
	welcome: { scope: 'user', preference: 'welcome' },
	purchase_pending: { scope: 'user', preference: 'payment_updates' },
	installment_paid: { scope: 'user', preference: 'payment_updates' },
	payment_reminder: { scope: 'user', preference: 'payment_reminders' },
	purchase_refunded: { scope: 'user', preference: null },
	event_changed: { scope: 'user', preference: 'event_updates' },
	event_cancelled: { scope: 'user', preference: null },
	event_reminder: { scope: 'user', preference: 'event_reminders' },
	organization_created: { scope: 'organization', preference: 'organization_updates' },
	organization_status: { scope: 'organization', preference: 'organization_updates' },
	organization_sale: { scope: 'organization', preference: 'sales' },
	organization_refund: { scope: 'organization', preference: 'refunds' },
	organization_payout: { scope: 'organization', preference: 'payouts' },
	organization_receiving: { scope: 'organization', preference: 'receiving_account' },
	organization_event_published: { scope: 'organization', preference: 'event_publication' },
} as const satisfies Record<
	string,
	{ scope: 'user' | 'organization'; preference: UserEmailPreference | OrganizationEmailPreference | null }
>;
export type NotificationKind = keyof typeof notificationCatalog;
export type UserEmailPreferences = z.infer<typeof userEmailPreferencesSchema>;
export type OrganizationEmailPreferences = z.infer<typeof organizationEmailPreferencesSchema>;
export type EmailPreferencesResponse = { settings: UserEmailPreferences | OrganizationEmailPreferences };
