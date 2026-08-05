import { fetchPaymentSettings } from '@/features/super-admin/api/server';
import { PaymentSettingsForm } from '@/features/super-admin/components/PaymentSettingsForm';

export default async function PaymentSettingsPage() {
  const data = await fetchPaymentSettings();

  return <div className="space-y-6"><header><p className="text-sm font-semibold text-violet-700">Configurações financeiras</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Taxas e gateway</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Centralize a política de preços, acompanhe os custos atuais do AbacatePay e controle quando repasses reais podem ser enviados.</p></header><PaymentSettingsForm initialSettings={data.settings} runtimeProvider={data.runtimeProvider} /></div>;
}

