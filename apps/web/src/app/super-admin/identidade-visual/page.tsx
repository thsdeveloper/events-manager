import { fetchBrandingSettings } from '@/features/super-admin/api/server';
import { BrandingSettingsForm } from '@/features/super-admin/components/BrandingSettingsForm';

export default async function BrandingSettingsPage() {
  const { settings } = await fetchBrandingSettings();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-violet-700">Identidade da plataforma</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Identidade visual</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Cadastre as duas versões da logo do site. Elas alimentam o header principal, o rodapé e as telas de login e
          cadastro, alternando automaticamente conforme o tema escolhido pelo visitante.
        </p>
      </header>
      <BrandingSettingsForm initialSettings={settings} />
    </div>
  );
}
