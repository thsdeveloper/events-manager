'use client';

import type { Organizer } from '@events-manager/contracts';
import { Building2, Save } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function OrganizerProfileSettings({ organizer }: { organizer: Organizer }) {
  const [values, setValues] = useState({
    name: organizer.name,
    email: organizer.email,
    phone: organizer.phone ?? '',
    website: organizer.website ?? '',
    description: organizer.description ?? '',
    document: organizer.document ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const update = (key: keyof typeof values, value: string) => setValues((current) => ({ ...current, [key]: value }));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch('/api/organizer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.detail ?? body?.error ?? 'Não foi possível salvar o perfil.');
      setMessage('Perfil atualizado com sucesso.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha ao salvar o perfil.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl"><Building2 className="size-5 text-violet-600" />Dados do organizador</CardTitle>
        <CardDescription>Essas informações identificam sua organização para participantes e para a equipe da plataforma.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="organization-name">Nome público</Label><Input id="organization-name" value={values.name} onChange={(event) => update('name', event.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="organization-email">E-mail financeiro</Label><Input id="organization-email" type="email" value={values.email} onChange={(event) => update('email', event.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="organization-phone">Telefone</Label><Input id="organization-phone" value={values.phone} onChange={(event) => update('phone', event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="organization-document">CPF ou CNPJ</Label><Input id="organization-document" value={values.document} onChange={(event) => update('document', event.target.value)} /></div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="organization-website">Site</Label><Input id="organization-website" type="url" value={values.website} onChange={(event) => update('website', event.target.value)} placeholder="https://" /></div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="organization-description">Descrição</Label><Textarea id="organization-description" rows={5} value={values.description} onChange={(event) => update('description', event.target.value)} /></div>
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <p role="status" className="text-sm text-slate-600">{message}</p>
            <Button type="submit" disabled={saving || values.name.trim().length < 2}><Save className="mr-2 size-4" />{saving ? 'Salvando…' : 'Salvar perfil'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

