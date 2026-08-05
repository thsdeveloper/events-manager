import { readFile } from 'node:fs/promises';
import process from 'node:process';

function parseEnv(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1).replace(/^['"]|['"]$/g, '')];
      }),
  );
}

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes('@')) {
  console.error('Uso: pnpm admin:promote -- usuario@exemplo.com');
  process.exit(1);
}

const fileEnv = parseEnv(await readFile(new URL('../.env', import.meta.url), 'utf8'));
const supabaseUrl = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.');
  process.exit(1);
}

const response = await fetch(`${supabaseUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`, {
  method: 'PATCH',
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify({ role: 'super_admin', status: 'active' }),
});
const body = await response.json().catch(() => null);
if (!response.ok) {
  console.error(body?.message ?? `Falha ao promover usuário (${response.status}).`);
  process.exit(1);
}
if (!Array.isArray(body) || body.length !== 1) {
  console.error(`Nenhum perfil único encontrado para ${email}.`);
  process.exit(1);
}
console.log(`${body[0].email} promovido para super_admin.`);

