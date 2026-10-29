# Página exclusiva do evento

O organizador pode substituir o layout padrão da página pública do evento por
uma landing page própria, montada por seções, com cabeçalho e navegação
próprios. Este documento descreve o modelo, as regras e os pontos de encaixe.

## Modelo

- Tabela `event_pages` (migração `20260917150000_event_pages.sql`): uma linha
  por evento com `draft` (o que o organizador edita), `published` (o que o
  público vê), `enabled` e `published_at`. O layout é um documento JSON
  validado pelo contrato `eventPageLayoutSchema` (`packages/contracts/src/event-page.ts`).
- Um documento por página, em vez de tabelas por seção como no CMS: salvamento
  atômico, reordenação trivial e rascunho separado da cópia publicada.
- Layout: `theme` (claro/escuro e cor de destaque), `header` (mostrar, fixo,
  logo própria ou do organizador, título, até 8 links de navegação, texto do
  botão), `footer` (mostrar organizador, nota) e `sections`.
- Seções: `hero`, `about`, `tickets`, `schedule`, `speakers`, `location`, `faq`,
  `gallery`, `sponsors`, `cta`, `countdown`, `richtext`. Toda seção tem `id`,
  `anchor`, `hidden` e `title` opcional. Rótulos e âncoras padrão em
  `EVENT_PAGE_SECTION_META`.

## Regras

- **A seção de ingressos é obrigatória** e não pode ficar oculta: é por ela que
  a pessoa chega ao checkout (`/eventos/:slug/checkout`).
- Navegação só por âncora (`#secao`). Não existem páginas internas; o schema
  recusa qualquer link que não seja uma âncora, e a publicação recusa âncoras
  duplicadas ou links para seções inexistentes (`validateEventPageLayout`).
- O HTML das seções `about` e `richtext` é sanitizado ao salvar (mesmo
  sanitizador do CMS) e novamente ao renderizar (`Text`).
- Publicar copia o rascunho para `published` e liga a página. "Voltar ao
  padrão" desliga sem apagar o rascunho.

## API (`apps/api/src/routes/event-pages.ts`)

- `GET /api/events/:id/page`: rascunho e cópia publicada; quando nunca salvo,
  devolve um rascunho montado a partir do evento (`buildDefaultEventPageLayout`).
- `PUT /api/events/:id/page` com `{ draft }`: salva o rascunho.
- `POST /api/events/:id/page/publish`: valida e publica; 422
  `EVENT_PAGE_INVALID` com `context.issues` quando há problemas.
- `POST /api/events/:id/page/unpublish`: volta ao layout padrão.
- Todas exigem sessão e posse do evento. O público recebe a cópia publicada em
  `GET /api/events/slug/:slug` no campo `page` (nulo quando desligada).

## Web

- Público: `apps/web/src/app/(event)/eventos/[slug]/page.tsx` renderiza
  `EventLandingPage` (`apps/web/src/features/event-page/components/`) quando há
  página publicada, sem o cabeçalho e o rodapé do site; caso contrário monta o
  layout padrão dentro do `SiteLayout`. O grupo `(event)` existe para que a
  página decida a própria casca.
- Painel: `/admin/eventos/:id/pagina` com o construtor
  (`apps/web/src/features/event-page/builder/`): seções arrastáveis, edição em
  painel lateral, cabeçalho e tema, pré-visualização ao vivo com o mesmo
  renderizador em `mode="preview"` (nada navega), salvamento automático do
  rascunho e publicação com a lista de problemas.
- Imagens do organizador usam o upload já existente (`/api/upload?folder=events`).
