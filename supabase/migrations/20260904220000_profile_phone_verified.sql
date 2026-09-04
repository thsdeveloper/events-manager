-- Marca quando o telefone do perfil foi confirmado por código (Supabase Auth,
-- fluxo phone_change). Trocar o telefone zera a marca; só a confirmação a define.

alter table public.profiles add column if not exists phone_verified_at timestamptz;
