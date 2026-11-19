import { describe, expect, it } from 'vitest';
import { notificationCatalog, type NotificationKind } from '@events-manager/contracts';
import { renderNotification } from '../src/application/notifications/notification-template.js';
const branding = {
	siteName: 'Flouvi',
	siteUrl: 'https://flouvi.example',
	logoUrl: null,
	accentColor: '#743BFF',
	supportEmail: null,
	tagline: null,
};
describe('notification emails', () => {
	it.each(Object.keys(notificationCatalog) as NotificationKind[])(
		'renders useful branded content and preferences for %s',
		(kind) => {
			const message = renderNotification(
				kind,
				{ title: 'Meu evento', amount: 100, path: '/perfil/ingressos/purchase' },
				branding,
			);
			expect(message.subject.length).toBeGreaterThan(8);
			expect(message.text).toContain('Flouvi');
			expect(message.html).toContain('https://flouvi.example/perfil/ingressos/purchase');
			expect(message.html).toContain('/perfil?section=preferences');
		},
	);
	it('escapes event content and prevents external action links', () => {
		const message = renderNotification(
			'event_changed',
			{ title: '<script>alert(1)</script>', path: '//attacker.example' },
			branding,
		);
		expect(message.html).not.toContain('<script>');
		expect(message.html).not.toContain('href="https://attacker.example');
		expect(message.text).toMatch(/alteração/i);
	});
	it('explains that a paid Pix installment does not release tickets before full payment', () => {
		const message = renderNotification(
			'installment_paid',
			{ installmentNumber: 1, totalInstallments: 3, amount: 10 },
			branding,
		);
		expect(message.text).toContain('todas as parcelas');
		expect(message.text).toMatch(/R\$\s?10,00/);
	});
	it('distinguishes overdue installments from upcoming ones', () => {
		expect(renderNotification('payment_reminder', { phase: 'overdue' }, branding).subject).toContain('vencida');
		expect(renderNotification('payment_reminder', { phase: 'due' }, branding).subject).toContain('vencer');
	});
});
