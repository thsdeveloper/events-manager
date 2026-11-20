import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Feather from '@expo/vector-icons/Feather';
import type { NominalTicket } from '@events-manager/contracts';
import { Badge, Button, Card, Heading, Label, s } from '../../shared/ui';
import { colors as c, fonts, dateLabel } from '../../shared/theme';
import { canShowQr, isPaid } from './model';
export function TicketAdmission({
	ticket,
	onEditParticipant,
}: {
	ticket: NominalTicket;
	onEditParticipant?: () => void;
}) {
	return (
		<Card style={{ padding: 0, overflow: 'hidden' }}>
			<View style={[s.between, { backgroundColor: c.plum, padding: 18 }]}>
				<Label style={{ color: c.white, fontFamily: fonts.bold, fontSize: 12 }}>
					FLOUVI · INGRESSO {String(ticket.sequence).padStart(2, '0')}
				</Label>
				<Feather name="tag" size={20} color={c.apricot} />
			</View>
			<View style={{ padding: 22, gap: 16 }}>
				<Badge label={ticket.is_buyer ? 'Seu ingresso' : 'Convidado'} />
				<Heading small>{ticket.attendee_name || 'Participante a definir'}</Heading>
				<Label muted>{ticket.ticket_type?.title || ticket.event.title}</Label>
				<View style={s.row}>
					<Feather name="calendar" color={c.violet} size={16} />
					<Label>{dateLabel(ticket.event.start_date)}</Label>
				</View>
				<View style={s.row}>
					<Feather name="map-pin" color={c.violet} size={16} />
					<Label>{ticket.event.location_name || 'Evento online'}</Label>
				</View>
			</View>
			<View
				style={{
					borderTopWidth: 1,
					borderStyle: 'dashed',
					borderColor: c.line,
					padding: 24,
					alignItems: 'center',
					gap: 14,
				}}
			>
				{ticket.check_in_date ? (
					<>
						<Feather name="check-circle" size={44} color={c.success} />
						<Badge label="Entrada registrada" tone="success" />
						<Label muted>{dateLabel(ticket.check_in_date)}</Label>
					</>
				) : canShowQr(ticket) ? (
					<>
						<View
							accessible
							accessibilityLabel={`QR Code do ingresso ${ticket.sequence}`}
							style={{ padding: 12, backgroundColor: c.white }}
						>
							<QRCode value={ticket.ticket_code} size={190} color={c.plum} />
						</View>
						<Label style={{ fontFamily: fonts.bold, letterSpacing: 1, fontSize: 12 }}>{ticket.ticket_code}</Label>
						<Label muted style={{ textAlign: 'center', fontSize: 13 }}>
							Apresente este QR Code à equipe do evento junto com um documento com foto.
						</Label>
					</>
				) : (
					<>
						<Feather name="lock" size={30} color={c.violet} />
						<Label style={{ textAlign: 'center' }}>
							{!isPaid(ticket)
								? 'Seu QR Code será liberado após a confirmação de todo o pagamento.'
								: 'Informe o participante para liberar este ingresso.'}
						</Label>
					</>
				)}
			</View>
			{onEditParticipant && ticket.can_edit_attendee && !ticket.is_buyer && !ticket.check_in_date ? (
				<View style={{ padding: 20, paddingTop: 0 }}>
					<Button
						label={ticket.attendee_name ? 'Alterar participante' : 'Informar participante'}
						icon="user-plus"
						onPress={onEditParticipant}
					/>
				</View>
			) : null}
		</Card>
	);
}
