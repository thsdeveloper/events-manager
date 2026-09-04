'use client';

import { Save } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { revalidateSiteBranding } from '@/features/super-admin/api/actions';
import type { BrandingMedia, BrandingSettings } from '@/features/super-admin/api/server';
import { getMediaAssetUrl } from '@/lib/media';
import type { SelectedLogo } from './LogoUploadField';
import { LogoUploadField } from './LogoUploadField';

function toSelectedLogo(media: BrandingMedia | null): SelectedLogo | null {
  return media ? { id: media.id, url: getMediaAssetUrl(media) } : null;
}

export function BrandingSettingsForm({ initialSettings }: { initialSettings: BrandingSettings }) {
  const [logo, setLogo] = useState(() => toSelectedLogo(initialSettings.logo));
  const [logoDarkMode, setLogoDarkMode] = useState(() => toSelectedLogo(initialSettings.logo_dark_mode));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const dirty =
    (logo?.id ?? null) !== (initialSettings.logo?.id ?? null) ||
    (logoDarkMode?.id ?? null) !== (initialSettings.logo_dark_mode?.id ?? null);

  async function save() {
    setSaving(true);
    setFeedback(null);
    setFailed(false);
    try {
      const response = await fetch('/api/super-admin/settings/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo: logo?.id ?? null, logo_dark_mode: logoDarkMode?.id ?? null }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível salvar a identidade visual.');
      await revalidateSiteBranding();
      setFeedback('Logos salvas. O header, o rodapé e as telas de acesso já estão atualizados.');
    } catch (error) {
      setFailed(true);
      setFeedback(error instanceof Error ? error.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <LogoUploadField
          value={logo}
          onChange={setLogo}
          label="Logo Clean"
          helper="Usada no tema claro do site: header principal, rodapé e telas de login/cadastro. Prefira a versão com traços escuros."
          surface="light"
        />
        <LogoUploadField
          value={logoDarkMode}
          onChange={setLogoDarkMode}
          label="Logo Dark"
          helper="Usada quando o visitante está no tema escuro. Se ficar vazia, a Logo Clean é exibida também no escuro."
          surface="dark"
        />
      </div>

      <div className="sticky bottom-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p role="status" className={`text-sm ${failed ? 'text-red-600' : 'text-slate-600'}`}>
          {feedback ?? (dirty ? 'Você tem alterações não salvas.' : 'Envie uma imagem para alterar a identidade visual.')}
        </p>
        <Button onClick={save} disabled={saving || !dirty}>
          <Save className="mr-2 size-4" />
          {saving ? 'Salvando…' : 'Salvar identidade visual'}
        </Button>
      </div>
    </div>
  );
}
