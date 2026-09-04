-- Telefone de contato no perfil, opcional, guardado só com dígitos (DDD +
-- número). A validação do DDD e do formato fica na API (brPhoneSchema).

alter table public.profiles add column if not exists phone text;

alter table public.profiles
  drop constraint if exists profiles_phone_digits,
  add constraint profiles_phone_digits check (phone is null or phone ~ '^[0-9]{10,11}$');
