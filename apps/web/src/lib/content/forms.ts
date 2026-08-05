export async function submitForm(
  formId: string,
  fields: { id: string; name: string; type: string }[],
  data: Record<string, unknown>,
) {
  const values = [];

  for (const field of fields) {
    const value = data[field.name];
    if (value === undefined || value === null || value === '') continue;

    if (field.type === 'file' && value instanceof File) {
      const upload = new FormData();
      upload.append('file', value);
      const uploadResponse = await fetch('/api/upload?folder=forms', { method: 'POST', body: upload });
      if (!uploadResponse.ok) throw new Error('Não foi possível enviar o arquivo do formulário.');
      const uploaded = await uploadResponse.json();
      values.push({ field: field.id, file: uploaded.fileId });
    } else {
      values.push({ field: field.id, value: String(value) });
    }
  }

  const response = await fetch(`/api/forms/${formId}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) throw new Error('Não foi possível enviar o formulário.');
}
