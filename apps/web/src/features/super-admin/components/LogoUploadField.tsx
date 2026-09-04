'use client';

import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
import { useId, useRef, useState } from 'react';
import { ImageCropperDialog } from '@/components/ui/image-cropper-dialog';

const acceptedTypes = ['image/png', 'image/webp'];
const maxFileSize = 5 * 1024 * 1024;

export interface SelectedLogo {
  id: string;
  url: string;
}

interface LogoUploadFieldProps {
  value: SelectedLogo | null;
  onChange: (logo: SelectedLogo | null) => void;
  label: string;
  helper: string;
  /** Renders the preview over the background the logo will actually sit on. */
  surface: 'light' | 'dark';
}

export function LogoUploadField({ value, onChange, label, helper, surface }: LogoUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  // Holds the picked file while the crop dialog is open.
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so re-picking the same file still fires onChange.
    event.target.value = '';
    if (!file) return;
    setError(null);

    if (!acceptedTypes.includes(file.type)) {
      setError('Envie um arquivo PNG ou WebP.');

      return;
    }
    if (file.size > maxFileSize) {
      setError('O arquivo deve ter no máximo 5 MB.');

      return;
    }

    setFileToCrop(file);
  }

  async function handleCropped(file: File) {
    setFileToCrop(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload?folder=branding', { method: 'POST', body: formData });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível enviar a imagem.');
      onChange({ id: body.fileId, url: body.url });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Falha no envio da imagem.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleRemove() {
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-950">{label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
          <ImageIcon className="size-5" />
        </div>
      </div>

      <div
        className={`relative mt-4 flex h-36 items-center justify-center rounded-lg border ${
          surface === 'dark' ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
        }`}
      >
        {value ? (
          <Image
            src={value.url}
            alt={`Pré-visualização da ${label.toLowerCase()}`}
            fill
            sizes="320px"
            className="object-contain p-6"
          />
        ) : (
          <p className="text-xs text-slate-400">Nenhuma logo enviada — o site usa a imagem padrão</p>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/60">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          <Upload className="size-4" />
          {value ? 'Substituir' : 'Enviar logo'}
        </button>
        {value && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <Trash2 className="size-4" />
            Remover
          </button>
        )}
        <span className="text-xs text-slate-500">PNG ou WebP, fundo transparente, até 5 MB</span>
      </div>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {/* Free crop: brand marks vary in shape, so a locked ratio would
          letterbox them. */}
      <ImageCropperDialog
        file={fileToCrop}
        onCancel={() => setFileToCrop(null)}
        onCropped={handleCropped}
        outputWidth={512}
        title="Ajustar imagem"
        description="Recorte as margens sobrando ao redor da marca."
      />

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
