-- Trilha de auditoria das alterações de CPF no perfil. Toda troca registra o
-- valor anterior, o novo, quem fez e de onde, para que o suporte consiga
-- investigar uma disputa. Só a API (service role) escreve e lê: RLS ligado sem
-- políticas.

create table public.profile_document_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_document text,
  new_document text,
  changed_by text not null check (changed_by in ('user', 'support')),
  ip text,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index profile_document_changes_user_id_idx on public.profile_document_changes (user_id, created_at desc);

alter table public.profile_document_changes enable row level security;
