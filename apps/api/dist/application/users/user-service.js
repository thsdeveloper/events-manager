export class UserService {
    repository;
    now;
    constructor(repository, now = Date.now) {
        this.repository = repository;
        this.now = now;
    }
    listTickets(userId) {
        return this.repository.listTickets(userId);
    }
    listTransactions(userId) {
        return this.repository.listTransactions(userId);
    }
    async listPendingPayments(userId) {
        const registrations = await this.repository.listPendingInstallmentRegistrations(userId);
        const rows = registrations.map((registration) => {
            const installments = [...(registration.installments ?? [])]
                .map((item) => item.status === 'pending' && new Date(item.due_date).getTime() < this.now()
                ? { ...item, status: 'overdue' }
                : item)
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
//# sourceMappingURL=user-service.js.map