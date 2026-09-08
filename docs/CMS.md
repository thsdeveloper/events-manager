# CMS gerenciado pelo superadmin

A página inicial e as demais páginas institucionais do site são montadas por um
CMS próprio, inspirado no modelo do Directus (coleções, page builder com blocos
polimórficos, status com agendamento, SEO por item, live preview, atividade e
biblioteca de arquivos). Somente perfis `super_admin` ativos gerenciam o
conteúdo, pela área `/super-admin/conteudo`. O site público lê tudo pela API
Fastify; o navegador nunca fala com o banco.

## Modelo de dados

| Coleção | Tabelas | Observações |
| --- | --- | --- |
| Páginas | `pages`, `page_blocks` | `permalink` único e validado no banco (`pages_permalink_format`); `seo` em JSONB; `status` draft/in_review/published e `published_at` para agendamento |
| Blocos | `block_hero` (+ `block_button_groups`, `block_buttons`), `block_richtext`, `block_gallery` (+ `block_gallery_items`), `block_pricing` (+ `block_pricing_cards`), `block_posts`, `block_events`, `block_form` | `page_blocks.collection`/`item` é a relação polimórfica; o gatilho `page_blocks_delete_item` apaga o item ao remover o bloco e `page_blocks_touch_page` atualiza `pages.date_updated` |
| Menus | `navigation`, `navigation_items` | `main` e `footer` são usados pelo layout e não podem ser excluídos; um nível de subitens |
| Blog | `posts` | `slug` validado no banco (`posts_slug_format`); conteúdo HTML sanitizado |
| Formulários | `forms`, `form_fields`, `form_submissions`, `form_submission_values` | campos atualizados pelo `id` para preservar respostas antigas |
| Redirecionamentos | `redirects` | origem sempre relativa (`redirects_url_from_relative`); ciclos são recusados |
| Mídia | `media_files` + bucket `media` | exclusão remove registro e objeto; FKs viram nulas |
| Site | `site_settings` | identidade, redes sociais, cor, favicon, logos e `default_og_image` |
| Auditoria | `audit_logs` | toda mutação grava `before_data`/`after_data`, ator, IP e user agent; alimenta o painel "Atividade" |

A tabela `ai_prompts`, herdada do template e sem uso, foi removida na migration
`20260905000000_cms_admin_and_cleanup.sql`.

## Contratos compartilhados

`packages/contracts/src/cms.ts` concentra os schemas Zod usados pelo painel e
pela API: `cmsPageInputSchema`, `cmsPageBlockInputSchema` (união discriminada
por `collection`), `cmsNavigationItemInputSchema`, `cmsPostInputSchema`,
`cmsRedirectInputSchema`, `cmsFormInputSchema`, `cmsSiteSettingsInputSchema`,
`cmsSeoSchema`, além de `normalizePermalink`, `slugify` e a lista de prefixos
reservados (`/admin`, `/eventos`, `/blog`...), que nunca podem virar página do
CMS porque o App Router os resolve antes da rota catch-all.

`packages/contracts/src/html-sanitizer.ts` exporta `sanitizeHtml`, um
sanitizador por lista de permissão usado na gravação (API), na leitura pública
(API) e na renderização (web). Scripts, iframes, atributos `on*` e URLs
`javascript:`/`data:` nunca chegam ao HTML servido.

## API

Rotas em `apps/api/src/routes/cms.ts`, todas sob `/api/super-admin/cms` e
protegidas por `requireSuperAdmin`:

- `overview`, `pages` (+ `blocks`, `blocks/order`, `preview`, `activity`),
  `navigation` (+ `items`, `items/order`), `posts`, `redirects`, `forms`
  (+ `submissions`), `media`, `site`.
- Regras de negócio em `apps/api/src/application/cms/cms-service.ts`
  (unicidade de permalink/slug, proteção da home e dos menus `main`/`footer`,
  sanitização, validação do item pelo schema da própria coleção, ordem de
  blocos, hierarquia de menu, ciclos de redirect, auditoria).
- Persistência em `apps/api/src/infrastructure/supabase/cms-repository.ts`.

Conteúdo público (`apps/api/src/routes/content.ts`):

- `GET /api/content/pages?permalink=&page=&preview=` devolve só páginas
  publicadas cuja `published_at` já chegou; um token de preview válido libera
  rascunhos. Tokens são HMAC-SHA256 com `COOKIE_SECRET`, atrelados ao permalink
  e válidos por 1 hora (`apps/api/src/application/cms/preview-token.ts`).
- `GET /api/content/sitemap` omite páginas `noindex` ou agendadas e inclui
  `change_frequency`/`priority` definidos no painel.

## Web

- Painel: `apps/web/src/app/super-admin/conteudo/**` e
  `apps/web/src/features/cms/**` (editor de páginas com construtor de blocos,
  painel SEO com preview de resultado de busca, menus, blog, formulários com
  respostas, redirecionamentos, biblioteca de mídia e configurações do site).
- Público: rota catch-all `apps/web/src/app/(public)/[[...permalink]]`,
  `PageBuilder` como server component, blocos sem estado renderizados no
  servidor, metadata completa (`apps/web/src/lib/seo/metadata.ts`), JSON-LD
  (`apps/web/src/lib/seo/json-ld.ts`), `sitemap.ts`, `robots.ts`, índice e
  detalhe do blog, redirecionamentos do CMS resolvidos em runtime e preview de
  rascunho com banner e `noindex`.
- Cache: leituras públicas usam as tags `site-settings` e `cms-content`
  (`apps/web/src/lib/content/fetchers.ts`); o painel chama a server action
  `revalidateCmsContent()` depois de cada mutação, então o site reflete a
  edição sem esperar a janela de ISR.

## Segurança

- Escrita só pela API com a chave de serviço, depois de `requireSuperAdmin`;
  `anon`/`authenticated` seguem sem `insert/update/delete` no schema `public`.
- HTML sanitizado em três pontos (gravação, leitura e render).
- Uploads validam MIME e assinatura do arquivo (`MediaService`).
- Preview de rascunho assinado e com expiração; nunca entra no cache do site.
- Permalinks e slugs validados em contrato e em constraint de banco.

## Fluxo de trabalho

1. `pnpm db:reset` aplica migrations e o seed (home com hero, texto e eventos;
   páginas "Sobre" e "Contato" com formulário; um post; menus principal e rodapé).
2. Promova um usuário com `pnpm admin:promote -- email@dominio` e acesse
   `/super-admin/conteudo`.
3. Crie ou edite uma página, adicione blocos, ajuste o SEO, use
   "Pré-visualizar" para ver o rascunho e publique (ou agende).
4. Testes: `pnpm test` (contracts, api, web); os testes do CMS vivem em
   `packages/contracts/src/cms.test.ts`, `html-sanitizer.test.ts`,
   `apps/api/test/cms-*.test.ts`, `content.test.ts`, `architecture.test.ts`
   e nos `*.test.ts(x)` de `apps/web/src/features/cms` e `apps/web/src/lib/seo`.
