import { Metadata } from 'next';
import PendingPaymentsList from '@/components/payments/PendingPaymentsList';

export const metadata: Metadata = {
  title: 'Pagamentos Pendentes',
  description: 'Gerencie suas parcelas pendentes e vencidas',
};

export default async function PendingPaymentsPage() {
  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Pagamentos Pendentes</h1>
        <p className="text-muted-foreground">
          Acompanhe e pague suas parcelas pendentes
        </p>
      </div>

      <PendingPaymentsList />
    </div>
  );
}
