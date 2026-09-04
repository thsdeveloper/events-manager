-- Cadastro passa a exigir data de nascimento (idade mínima validada na API) e
-- o perfil ganha o CPF, opcional. O campo livre "title" ("Como você se
-- apresenta") deixa de existir.

alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists document text;

alter table public.profiles
  drop constraint if exists profiles_birth_date_not_future,
  add constraint profiles_birth_date_not_future check (birth_date is null or birth_date <= current_date);

-- CPF guardado só com dígitos; a validação do dígito verificador fica na API.
alter table public.profiles
  drop constraint if exists profiles_document_digits,
  add constraint profiles_document_digits check (document is null or document ~ '^[0-9]{11}$');

-- Um CPF identifica uma pessoa: duas contas não podem informar o mesmo.
create unique index if not exists profiles_document_key on public.profiles (document) where document is not null;

alter table public.profiles drop column if exists title;

-- A data de nascimento chega nos metadados do signUp e é copiada para o perfil
-- na criação do usuário, como já acontece com nome e sobrenome.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, last_name, birth_date)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    nullif(new.raw_user_meta_data ->> 'birth_date', '')::date
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
