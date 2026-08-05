import type { MediaFile } from '@events-manager/contracts';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55321';

export function getMediaAssetUrl(fileOrId: string | MediaFile | null | undefined): string {
  if (!fileOrId) return '';
  if (typeof fileOrId === 'string') {
    if (/^https?:\/\//.test(fileOrId)) return fileOrId;
    
return `/api/media/${fileOrId}`;
  }

  if (fileOrId.path) {
    const bucket = fileOrId.bucket ?? 'media';
    
return `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileOrId.path}`;
  }

  return `/api/media/${fileOrId.id}`;
}
