import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import InstallmentPaymentPage from '@/components/payments/InstallmentPaymentPage';

export const metadata: Metadata = {
  title: 'Pagar Parcela',
  description: 'Efetue o pagamento da sua parcela via Pix',
};

interface PaymentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PaymentPage({ params }: PaymentPageProps) {
  const { id } = await params;

  return <InstallmentPaymentPage registrationId={id} />;
}
