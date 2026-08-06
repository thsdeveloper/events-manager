export interface UserRepository {
	listPendingInstallmentRegistrations(userId: string): Promise<Record<string, unknown>[]>;
	listTickets(userId: string): Promise<unknown[]>;
	listTransactions(userId: string): Promise<unknown[]>;
}

interface Installment extends Record<string, unknown> {
	due_date: string;
	installment_number: number;
	status: string;
}

export class UserService {
	constructor(
		private readonly repository: UserRepository,
		private readonly now: () => number = Date.now,
	) {}

	listTickets(userId: string) {
		return this.repository.listTickets(userId);
	}

	listTransactions(userId: string) {
		return this.repository.listTransactions(userId);
	}

	async listPendingPayments(userId: string) {
		const registrations = await this.repository.listPendingInstallmentRegistrations(userId);
		const rows = registrations.map((registration) => {
			const installments = [...((registration.installments as Installment[] | undefined) ?? [])]
				.map((item) =>
					item.status === 'pending' && new Date(item.due_date).getTime() < this.now()
						? { ...item, status: 'overdue' }
						: item,
				)
				.sort((left, right) => left.installment_number - right.installment_number);
			const stats = {
				total: installments.length,
				paid: installments.filter((item) => item.status === 'paid').length,
				pending: installments.filter((item) => item.status === 'pending').length,
				overdue: installments.filter((item) => item.status === 'overdue').length,
			};
			return {
				...registration,
				installments,
				installment_stats: stats,
				next_installment: installments.find((item) => ['pending', 'overdue'].includes(item.status)) ?? null,
			};
		});
		return { success: true, data: rows, total: rows.length };
	}
}
