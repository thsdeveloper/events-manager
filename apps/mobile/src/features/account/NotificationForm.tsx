import type { UserEmailPreferences } from '@events-manager/contracts';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Button, Card, Label, Notice, s } from '../../shared/ui';
import { colors, fonts } from '../../shared/theme';
const options: [keyof UserEmailPreferences, string, string][] = [
	['welcome', 'Boas-vindas', 'Orientações para aproveitar sua conta.'],
	['payment_updates', 'Atualizações de pagamento', 'Acompanhe pagamentos e parcelas confirmadas.'],
	['payment_reminders', 'Lembretes de parcelas', 'Receba avisos de vencimento e atraso.'],
	['event_updates', 'Mudanças no evento', 'Saiba sobre alterações de data, horário e local.'],
	['event_reminders', 'Lembrete do evento', 'Um aviso antes do seu próximo encontro.'],
];
export function NotificationForm({
	settings,
	onSave,
}: {
	settings: UserEmailPreferences;
	onSave: (value: UserEmailPreferences) => Promise<void>;
}) {
	const [value, setValue] = useState(settings);
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('');
	async function save() {
		setBusy(true);
		setMessage('');
		try {
			await onSave(value);
			setMessage('Preferências salvas.');
		} catch (e) {
			setMessage(e instanceof Error ? e.message : 'Não foi possível salvar.');
		} finally {
			setBusy(false);
		}
	}
	return (
		<View style={s.section}>
			{options.map(([key, title, description]) => (
				<Card key={key}>
					<View style={s.between}>
						<View style={{ flex: 1, gap: 6 }}>
							<Label style={{ fontFamily: fonts.bold }}>{title}</Label>
							<Label muted style={{ fontSize: 13 }}>
								{description}
							</Label>
						</View>
						<Switch
							accessibilityLabel={title}
							accessibilityRole="switch"
							disabled={busy}
							value={value[key]}
							onValueChange={(enabled) => {
								setValue({ ...value, [key]: enabled });
								setMessage('');
							}}
							trackColor={{ false: colors.line, true: colors.violet }}
							thumbColor={colors.white}
						/>
					</View>
				</Card>
			))}
			<Label muted style={{ fontSize: 13 }}>
				Mensagens essenciais de segurança, entrega de ingressos, reembolso e cancelamento continuam sendo enviadas.
			</Label>
			<Notice message={message} />
			<Button label="Salvar preferências" loading={busy} onPress={() => void save()} />
		</View>
	);
}
