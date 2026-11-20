import { render, screen, userEvent } from '@testing-library/react-native';
import type { NominalTicket } from '@events-manager/contracts';
import { TicketAdmission } from './TicketAdmission';
const value = {
	id: 'one',
	sequence: 1,
	ticket_code: 'EVT-ONE',
	attendee_name: 'Ana Silva',
	attendee_email: 'ana@example.test',
	check_in_date: null,
	is_buyer: true,
	registration: { status: 'confirmed', payment_status: 'paid' },
	event: { title: 'Congresso', start_date: '2027-12-01T10:00:00Z', location_name: 'Pavilhão' },
} as NominalTicket;
describe('admission card', () => {
	it('presents the named ticket and its admission QR when paid', async () => {
		await render(<TicketAdmission ticket={value} />);
		expect(screen.getByText('Ana Silva')).toBeTruthy();
		expect(screen.getByLabelText('QR Code do ingresso 1')).toBeTruthy();
	});
	it('explains pending payment and does not expose its QR', async () => {
		await render(
			<TicketAdmission ticket={{ ...value, registration: { ...value.registration, payment_status: 'pending' } }} />,
		);
		expect(screen.getByText(/liberado após/)).toBeTruthy();
		expect(screen.queryByLabelText('QR Code do ingresso 1')).toBeNull();
	});
	it('shows attendance already registered instead of a new QR', async () => {
		await render(<TicketAdmission ticket={{ ...value, check_in_date: '2027-12-01T10:00:00Z' }} />);
		expect(screen.getByText('Entrada registrada')).toBeTruthy();
		expect(screen.queryByLabelText('QR Code do ingresso 1')).toBeNull();
	});
	it('offers naming inside an editable third-party ticket', async () => {
		const edit = jest.fn();
		const user = userEvent.setup();
		await render(
			<TicketAdmission
				ticket={{ ...value, is_buyer: false, can_edit_attendee: true, attendee_name: null }}
				onEditParticipant={edit}
			/>,
		);
		await user.press(screen.getByRole('button', { name: 'Informar participante' }));
		expect(edit).toHaveBeenCalled();
	});
	it('never offers participant transfer on the buyers own ticket', async () => {
		await render(<TicketAdmission ticket={{ ...value, can_edit_attendee: true }} onEditParticipant={jest.fn()} />);
		expect(screen.queryByRole('button', { name: 'Alterar participante' })).toBeNull();
	});
});
