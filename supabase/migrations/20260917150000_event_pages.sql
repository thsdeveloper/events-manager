-- Página exclusiva do evento.
--
-- O organizador monta uma landing page para o evento: cabeçalho próprio com
-- logo e navegação por âncoras, seções à escolha (destaque, sobre, programação,
-- palestrantes, local, galeria, apoiadores, perguntas...) e, obrigatoriamente,
-- a seção de ingressos, por onde se chega ao checkout. O layout é um documento
-- JSON validado pelo contrato `eventPageLayoutSchema` na API; guardar um
-- documento por página, em vez de uma tabela por seção, mantém o salvamento
-- atômico e a reordenação trivial.
--
-- `draft` é o que o organizador edita; `published` é o que o público vê quando
-- `enabled` está ligado. Desligar volta o evento ao layout padrão do site sem
-- perder o trabalho.

create table public.event_pages (
  event_id uuid primary key references public.events(id) on delete cascade,
  enabled boolean not null default false,
  draft jsonb not null,
  published jsonb,
  published_at timestamptz,
  date_created timestamptz not null default timezone('utc', now()),
  date_updated timestamptz not null default timezone('utc', now()),
  constraint event_pages_published_when_enabled check (not enabled or published is not null)
);

comment on table public.event_pages is
  'Landing page do evento montada pelo organizador: rascunho e cópia publicada em JSON.';

create trigger event_pages_updated_at
  before update on public.event_pages
  for each row execute procedure public.set_updated_at();

-- Leitura: o organizador do evento e a administração. O público lê a cópia
-- publicada pela API, junto com o evento. Escrita só pela API (service role).
alter table public.event_pages enable row level security;

create policy read_event_pages on public.event_pages for select to authenticated using (
  public.owns_event(event_id) or public.is_admin()
);

grant select on public.event_pages to authenticated;
revoke insert, update, delete on public.event_pages from anon, authenticated;
