import { createElement } from 'react';
import { Label } from '../../shared/ui';
import { config } from '../../shared/config';
import { colors, fonts } from '../../shared/theme';
import type { BrowserFrameProps } from './BrowserFrame';
export function BrowserFrame({ accessToken, destination }: BrowserFrameProps) {
	return createElement(
		'div',
		{ style: { padding: 24, display: 'grid', gap: 20 } },
		<Label>A página segura abrirá em outra aba. Ao concluir, volte ao aplicativo para atualizar seus ingressos.</Label>,
		createElement(
			'form',
			{ method: 'POST', action: `${config.webUrl}/api/auth/mobile/web-session`, target: '_blank', rel: 'noreferrer' },
			createElement('input', { type: 'hidden', name: 'access_token', value: accessToken }),
			createElement('input', { type: 'hidden', name: 'destination', value: destination }),
			createElement(
				'button',
				{
					type: 'submit',
					style: {
						background: colors.violet,
						color: colors.white,
						border: 0,
						borderRadius: 16,
						padding: 18,
						fontFamily: fonts.bold,
						fontSize: 16,
						cursor: 'pointer',
					},
				},
				'Abrir página segura',
			),
		),
	);
}
