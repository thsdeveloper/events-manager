# Página exclusiva do evento

O organizador pode substituir o layout padrão da página pública do evento por uma landing page própria, montada por
seções, com cabeçalho e navegação próprios. Este documento descreve o modelo, as regras e os pontos de encaixe.

## Modelo

- Tabela `event_pages` (migração `20260917150000_event_pages.sql`): uma linha por evento com `draft` (o que o
  organizador edita), `published` (o que o público vê), `enabled` e `published_at`. O layout é um documento JSON
  validado pelo contrato `eventPageLayoutSchema` (`packages/contracts/src/event-page.ts`).
- Um documento por página, em vez de tabelas por seção como no CMS: salvamento atômico, reordenação trivial e rascunho
  separado da cópia publicada.
- Layout: `theme` (claro/escuro e cor de destaque), `header` (mostrar, fixo, logo própria ou do organizador, título, até
  8 links de navegação, texto do botão), `footer` (mostrar organizador, nota) e `sections`.
- Seções: `hero`, `about`, `tickets`, `schedule`, `speakers`, `location`, `faq`, `gallery`, `sponsors`, `cta`,
  `countdown`, `richtext`. Toda seção tem `id`, `anchor`, `hidden` e `title` opcional. Rótulos e âncoras padrão em
  `EVENT_PAGE_SECTION_META`.

## Regras

- **A seção de ingressos é obrigatória** e não pode ficar oculta: é por ela que a pessoa chega ao checkout
  (`/eventos/:slug/checkout`).
- Navegação só por âncora (`#secao`). Não existem páginas internas; o schema recusa qualquer link que não seja uma
  âncora, e a publicação recusa âncoras duplicadas ou links para seções inexistentes (`validateEventPageLayout`).
- O HTML das seções `about` e `richtext` é sanitizado ao salvar (mesmo sanitizador do CMS) e novamente ao renderizar
  (`Text`).
- Publicar copia o rascunho para `published` e liga a página. "Voltar ao padrão" desliga sem apagar o rascunho.

## API (`apps/api/src/routes/event-pages.ts`)

- `GET /api/events/:id/page`: rascunho e cópia publicada; quando nunca salvo, devolve um rascunho montado a partir do
  evento (`buildDefaultEventPageLayout`).
- `PUT /api/events/:id/page` com `{ draft }`: salva o rascunho.
- `POST /api/events/:id/page/publish`: valida e publica; 422 `EVENT_PAGE_INVALID` com `context.issues` quando há
  problemas.
- `POST /api/events/:id/page/unpublish`: volta ao layout padrão.
- Todas exigem sessão e posse do evento. O público recebe a cópia publicada em `GET /api/events/slug/:slug` no campo
  `page` (nulo quando desligada).

## Web

- Público: `apps/web/src/app/(event)/eventos/[slug]/page.tsx` renderiza `EventPageRenderer`
  (`apps/web/src/features/event-page/puck/`, com `Render` de `@puckeditor/core/rsc`) quando há página publicada, sem o
  cabeçalho e o rodapé do site; caso contrário monta o layout padrão dentro do `SiteLayout`. O grupo `(event)` existe
  para que a página decida a própria casca.
- Painel: `/admin/eventos/:id/pagina` com o construtor (`apps/web/src/features/event-page/builder/`): seções
  arrastáveis, edição em painel lateral, cabeçalho e tema, pré-visualização ao vivo com o mesmo renderizador em
  `mode="preview"` (nada navega), salvamento automático do rascunho e publicação com a lista de problemas.
- Imagens do organizador usam o upload já existente (`/api/upload?folder=events`).

## Atualização dos dados públicos

O evento por slug é lido com `cache: 'no-store'` e `revalidate: 0` em `fetchEventBySlug`. A página pública (padrão ou
landing), seus metadados e o checkout usam essa mesma leitura. Preço, estoque, status, datas e demais dados vêm da API a
cada nova requisição; o catálogo `/eventos` segue a mesma política. O cache de 30 segundos permanece para o conteúdo
institucional do CMS.

Antes, o evento herdava o cache de 30 segundos de `backendFetch`, e a edição isolada de um ingresso não invalidava essa
cópia. Limpar o cache ou fazer um hard refresh mascarava o problema em desenvolvimento. A API já respondia com
`Cache-Control: private, no-store`; a correção está na leitura do frontend. A ação `revalidateEventPage` também invalida
os caminhos exatos do evento e do checkout, além do catálogo, sitemap e tags anteriores.

Testes: `apps/web/src/lib/content/event-freshness.test.ts` exercita os fetchers reais com dublê apenas de `fetch`,
incluindo alteração de preço/título, evento que deixa de existir, catálogo e preservação do cache institucional.
`fetchers.test.ts` e `features/event-page/actions.test.ts` foram atualizados. O ciclo Red reproduziu quatro falhas de
política de cache/invalidação; os **22 testes direcionados**, incluindo páginas públicas e checkout, passaram.

Em um build de produção isolado com Next.js 15.5.29, usando os fetchers reais, Chromium confirmou: recarga normal mostra
o preço novo, navegação por `Link` e checkout usam o último preço, metadados mudam e despublicação retorna 404. Nenhum
cache do navegador foi limpo. A rota de comparação com a configuração antiga manteve o preço anterior. O evento
informado pelo usuário também foi conferido somente por leitura, com o mesmo valor na API e no HTML. Evidência:
[validation.json](evidencias/evento-cache/validation.json).

Comandos: Prettier e ESLint nos seis arquivos alterados, `pnpm --filter @events-manager/web exec tsc --noEmit`,
`pnpm --filter @events-manager/web lint` e
`pnpm --filter @events-manager/web exec vitest run --coverage --maxWorkers=4 --testTimeout=15000`. O lint direcionado e
o TypeScript passaram. O lint global mantém os quatro erros anteriores na sidebar. Nenhuma migration ou variável de
ambiente foi adicionada. Suíte completa: **1.073 testes aprovados**. A cobertura aumentou para **75,63% / 69,61% /
76,01% / 77,25%** (statements / branches / functions / lines), mantendo as pendências anteriores das catracas globais,
sem reduzir limites.

Referência: [política de fetch e cache do Next.js 15](https://nextjs.org/docs/15/app/api-reference/functions/fetch).

## Página padrão e descoberta de eventos — 19/11/2026

A página padrão agora usa `features/event-page/components/DefaultEventPage` dentro do cabeçalho/rodapé públicos e do
`Container` compartilhado. A identidade segue DM Sans, violeta `#743DF5`, ameixa `#231A33`, damasco `#FFD09D` e névoa
`#F3EEFF`.

- A capa aparece inteira (`object-contain`), em sua proporção, sem título ou gradiente encobrindo a arte. `EventCover`
  também é usado no hero da página personalizada e no preview do construtor.
- Título, categoria, formato, organização, descrição/idiomas, temas, ingressos, grupos, condições, datas completas,
  período de inscrições, capacidade, endereço, mapa/acesso online e contatos usam os dados cadastrados. Nenhuma
  programação ou política é inventada; seções personalizadas continuam seguindo o documento publicado pela organização.
- A seleção de quantidade/participantes permanece no checkout. A página permite consultar tipos, valores em BRL com
  taxa, disponibilidade, limites e condições. O menor preço considera apenas ingressos públicos disponíveis para venda.
  Não há promessa fixa de 12 parcelas. Pix parcelado informa a liberação somente após quitação integral; boleto é à
  vista.
- O resumo acompanha a rolagem no desktop. No celular, uma barra inferior com preço e compra respeita a área segura; há
  espaço após o rodapé para não cobrir seus links. Inscrições encerradas/futuras, evento encerrado/cancelado e falta de
  estoque não oferecem um botão de compra ativo.
- Compartilhamento com ícones coloridos para WhatsApp, Facebook, LinkedIn e X, cópia com feedback e opção nativa quando
  suportada. Falha da área de transferência oferece um campo selecionável com o link; cancelar o compartilhamento nativo
  não exibe erro. Links não carregam parâmetros de checkout/rastreamento. Nenhuma mensagem é enviada automaticamente.
- `GET /api/events/public` aceita `organizer_id` e `exclude_id` (UUIDs opcionais). O banco filtra organização,
  publicação, visibilidade pública e eventos ainda não encerrados **antes** da paginação. A página pede até quatro cards
  pequenos; se não houver outro evento, a seção não aparece. Falha nessa consulta não bloqueia a página nem a compra. A
  leitura continua `no-store`.
- Páginas personalizadas também recebem compartilhamento e outros eventos no final, fora do preview. Suas seções,
  conteúdo e ordem continuam preservados.

### Correção de “Voltar ao layout padrão”

O `upsert({ event_id, enabled: false })` falhava na restrição `draft NOT NULL` do PostgreSQL antes de tratar o conflito
do registro existente. A operação agora usa `repository.disable`, com `UPDATE` apenas de `enabled`, após validar a posse
do evento. Preserva rascunho, cópia publicada e data de publicação; se nunca houve página salva, devolve o layout
inicial sem criar uma linha incompleta. Não exige migration ou nova variável de ambiente.

A restauração pedida foi aplicada ao evento local `b395d1b2-9fd0-4147-be73-d3a6975aafd0` pelo caso de uso real. Foram
comparados o rascunho e a cópia publicada antes/depois, sem alterações de conteúdo.

### Validação

TDD: regressão do `NOT NULL` antes da correção; testes de autorização/validação da rota; consulta de outros eventos com
filtros no banco; renderização, condições de venda, idiomas, ações de compra e compartilhamento. Arquivos
novos/ajustados:

- API: `event-page.test.ts`, `event-page-routes.test.ts`, `event-discovery.test.ts`.
- Web: `DefaultEventPage.test.tsx`, `EventShareActions.test.tsx`, `public-event.test.ts`,
  `EventLandingPage.ssr.test.tsx`, `fetchers.test.ts`, a suíte SSR da rota do evento e a convenção de `Container` do
  design system.

Navegador real em `localhost:3003`: larguras 320, 375, 390, 768, 1024 e 1440 px, sem transbordamento; capa carregada;
resumo acompanhando rolagem; barra mobile; condições expansíveis; navegação real para outro evento e para o checkout.
Nenhum erro JavaScript nessa navegação. O checkout foi apenas aberto, sem compra.

Evidências: [desktop](evidencias/pagina-evento/desktop.png), [mobile](evidencias/pagina-evento/mobile.png),
[página completa](evidencias/pagina-evento/desktop-completa.png),
[mobile completo](evidencias/pagina-evento/mobile-completa.png),
[registro de validação](evidencias/pagina-evento/validacao.json).

Comandos executados nesta alteração:

```sh
pnpm --filter @events-manager/api exec vitest run test/event-page.test.ts test/event-page-routes.test.ts test/event-discovery.test.ts
pnpm --filter @events-manager/web exec vitest run src/features/event-page src/lib/content/fetchers.test.ts
pnpm --filter @events-manager/web exec vitest run 'src/app/(event)/eventos/[slug]/page.ssr.test.tsx' src/components/design-system/design-system.convention.test.ts
pnpm --filter @events-manager/api test
pnpm --filter @events-manager/web test --maxWorkers=2
pnpm --filter @events-manager/api lint
pnpm --filter @events-manager/api build
pnpm --filter @events-manager/web lint
pnpm --filter @events-manager/web exec tsc --noEmit
pnpm --filter @events-manager/api test:coverage --maxWorkers=2
pnpm --filter @events-manager/web test:coverage --maxWorkers=2
```

Resultado final: **1.217 testes API (108 arquivos) e 1.126 testes web (241 arquivos) aprovados** na execução com
cobertura. A execução web sem cobertura passou com 1.111 testes; os 15 casos adicionais de disponibilidade/endereço/data
passaram isoladamente e depois na suíte completa com cobertura. Lint/build da API, TypeScript do frontend e ESLint dos
arquivos tocados passaram. Prettier aplicado.

Cobertura sem redução dos limiares:

| Pacote | Statements | Branches | Functions |  Lines |
| ------ | ---------: | -------: | --------: | -----: |
| API    |     81,42% |   77,70% |    83,63% | 83,44% |
| Web    |     76,60% |   71,55% |    76,68% | 78,16% |

Todos os indicadores aumentaram frente à medição anterior (API: 81,35/77,69/83,52/83,36; web: 76,31/70,92/76,48/77,88).
Os gates globais ainda falham por pendências anteriores: branches API abaixo de 83,5%, branches web abaixo de 79,1% e
functions web abaixo de 78,5%. O lint global web mantém quatro erros `newline-before-return` nos arquivos alheios à
alteração: `AdminSidebar.tsx:102`, `SidebarSubmenu.tsx:91`, `ui/sidebar.test.tsx:24` e `:104`. Esses arquivos não foram
alterados nesta tarefa.

## Menu fixo e vídeo de apresentação (19/11/2026)

O menu da página padrão acompanha a rolagem logo abaixo do cabeçalho do site. `EventSectionNavigation` observa a altura
real do cabeçalho e do próprio menu, inclusive quando os itens quebram em duas linhas no celular. As âncoras mantêm o
título da seção visível abaixo das barras. Links nativos preservam o histórico e identificam o destino selecionado com
`aria-current="location"`.

Na etapa **Visual** de criar/editar um evento, o organizador pode informar **uma URL opcional de vídeo do YouTube**,
conferir a prévia e apagar o campo para remover o vídeo. Links `watch`, `youtu.be`, `shorts`, `live` e
`youtube-nocookie.com/embed` são aceitos quando contêm um identificador de vídeo válido. URLs de outros serviços,
playlists, credenciais e hosts que imitam o YouTube são recusados. Rascunhos aceitam texto incompleto durante a
digitação; a validação definitiva ocorre ao avançar/salvar.

O campo `events.video_url` é público e independente de `online_url`, que continua reservado ao acesso online. A API
preserva o valor em POST/PATCH, consulta do evento e projeção pública, mantendo as permissões existentes. A migration
`202611190005_event_presentation_video.sql` adiciona uma coluna nullable com limite de 2.048 caracteres, sem alterar
registros existentes, RLS ou índices. Foi aplicada no banco local e os tipos foram regenerados. Aplicar a migration
antes de atualizar a API nos demais ambientes; nenhuma variável de ambiente nova.

Com URL preenchida, a página padrão inclui **Vídeo** no menu e a seção `#video`. Páginas personalizadas também recebem a
seção e o atalho no cabeçalho; se já houver uma âncora autoral chamada `video`, a nova seção usa `video-evento` (com
sufixo extra se necessário), preservando os destinos existentes. Sem URL válida, a seção e o atalho ficam ocultos. O
player compartilhado mantém a proporção 16:9, usa as cores da Flouvi, permite tela cheia e só carrega o iframe após
clique/teclado. Uma ligação canônica permite abrir o vídeo diretamente no YouTube. A CSP permite apenas o host
`https://www.youtube-nocookie.com` adicional para frames.

### Testes e evidências

TDD: os testes reproduziram a ausência do campo, seu descarte nos schemas, a ausência na consulta pública, o formulário
sem entrada de vídeo, o player/seção inexistentes e a CSP bloqueando esse host antes da implementação. Arquivos
novos/ajustados:

- Contratos: `src/event-video.test.ts`.
- API: `test/event-video.test.ts` (criar/editar/remover, leitura pública sem URL privada, validação 422, autenticação
  401 e isolamento da organização).
- Web: `EventSectionNavigation.test.tsx`, `DefaultEventPage.test.tsx`, `EventLandingPage.ssr.test.tsx`,
  `YouTubeVideo.test.tsx`, `wizard-content.test.ts`, `EventCreationWizard.edit.test.tsx` e `checkout-security.test.ts`.

O menu foi verificado na página real em `localhost:3003` nas larguras 320, 390, 768 e 1440 px. O vídeo foi verificado
com os componentes reais em um preview Vite isolado, com uma URL de demonstração somente no fixture: 16:9, nenhuma
rolagem horizontal, âncoras abaixo do menu e nenhum iframe antes do clique. O evento existente permaneceu sem vídeo até
o organizador cadastrar a URL desejada. API local do evento respondeu 200 com `video_url`; o frontend local respondeu
com a CSP atualizada.

Evidências: [menu desktop](evidencias/pagina-evento/menu-fixo-desktop.png),
[menu mobile](evidencias/pagina-evento/menu-fixo-mobile.png),
[vídeo desktop](evidencias/pagina-evento/video-desktop.png), [vídeo mobile](evidencias/pagina-evento/video-mobile.png),
[cadastro desktop](evidencias/pagina-evento/video-cadastro-desktop.png),
[cadastro mobile](evidencias/pagina-evento/video-cadastro-mobile.png) e
[medidas do navegador](evidencias/pagina-evento/validacao-video.json).

Comandos:

```sh
pnpm db:migrate
pnpm exec supabase gen types typescript --local
pnpm --filter @events-manager/contracts build
pnpm --filter @events-manager/contracts lint
pnpm --filter @events-manager/contracts test:coverage
pnpm --filter @events-manager/api exec vitest run test/event-video.test.ts
pnpm --filter @events-manager/api test:coverage --maxWorkers=2
pnpm --filter @events-manager/api lint
pnpm --filter @events-manager/api build
pnpm --filter @events-manager/web test:coverage --maxWorkers=2
pnpm --filter @events-manager/web lint
pnpm --filter @events-manager/web exec tsc --noEmit
```

A compilação de produção também foi executada numa cópia isolada em `/tmp/flouvi-video-build/apps/web`, com
`pnpm build`, para preservar o servidor em uso. A geração otimizada compilou com sucesso (54 s); a etapa de lint
interrompeu o build pelos quatro erros anteriores na sidebar, listados acima. O aviso de abreviação `h-full w-full` no
botão do player foi corrigido para `size-full`, e o ESLint do arquivo passou sem avisos. Os testes de convenção de UI
também passaram após o player adotar o `Button` compartilhado.

Resultado final desta alteração: **379 testes de contratos (24 arquivos), 1.223 testes API (109 arquivos) e 1.137 testes
web (243 arquivos) aprovados**. Lint/build de contratos e API, TypeScript web, ESLint dos arquivos alterados e Prettier
passaram.

| Pacote    | Statements | Branches | Functions |  Lines |
| --------- | ---------: | -------: | --------: | -----: |
| Contratos |     98,10% |   95,62% |    99,27% | 99,02% |
| API       |     81,42% |   77,70% |    83,63% | 83,44% |
| Web       |     76,72% |   71,63% |    76,80% | 78,28% |

A cobertura permaneceu estável na API e aumentou em contratos e web, sem reduzir limiares. Os gates globais de cobertura
API/web continuam abaixo dos limites anteriores de branches/functions; lint e build completos do frontend continuam
bloqueados pelos quatro erros anteriores na sidebar. Nenhum desses arquivos foi alterado nesta tarefa.

## Editor Puck — 19/11/2026

O construtor de `/admin/eventos/:id/pagina` usa `@puckeditor/core` **0.24.1**. O Puck controla o catálogo, a estrutura,
arrastar e soltar, seleção, propriedades, histórico de desfazer/refazer e prévias de computador (1280 px), tablet (768
px) e celular (390 px). Os controles estão em português e usam os tokens violeta da Flouvi e a fonte DM Sans local.
`no-external.css` evita a fonte externa padrão do editor.

### Fronteiras e compatibilidade

- `builder/EventPageBuilder.tsx` carrega o editor com `next/dynamic`, somente no cliente. O pacote de edição fica
  restrito ao painel.
- `puck/editor-config.tsx` e `editor-fields.tsx` definem as doze seções existentes, campos nativos de texto rico, listas
  e objetos, além dos campos personalizados de mídia e switches. A mídia continua usando a API autenticada de upload.
- `puck/data.ts` converte o documento de domínio em dados do Puck e vice-versa. **O banco e a API continuam armazenando
  `EventPageLayout` versão 1.** Não há migration nem conversão destrutiva dos rascunhos ou das páginas publicadas. IDs,
  âncoras, imagens, texto, visibilidade e configurações são preservados.
- `puck/EventPageRenderer.tsx` usa a entrada RSC do Puck e uma configuração separada, sem campos ou ferramentas de
  edição. Público e prévia autenticada renderizam no servidor. A casca e as seções visuais são compartilhadas com o
  editor e com a prévia do cadastro de eventos.
- O JSON só aceita o catálogo validado por Zod; não contém código executável ou HTML arbitrário de componentes. A
  sanitização de textos permanece na API e na renderização. Ingressos, preços, datas e local continuam vindo do evento,
  sem duplicação no layout.

A decisão de manter um adaptador, em vez de persistir diretamente a estrutura de uma biblioteca de UI, preserva os
contratos, o isolamento da API e as páginas existentes. Uma mudança futura do documento de domínio exige versionamento
próprio; atualizar o Puck não implica migrar o banco.

### Salvamento e publicação

`api/page-writer.ts` serializa as gravações. A publicação salva primeiro a fotografia atual do editor e só então chama
`/publish`, na mesma fila. Uma falha no PUT interrompe a publicação; um salvamento antigo e lento não pode sobrescrever
a revisão que está sendo publicada. Requisições idênticas já confirmadas não repetem o PUT.

`api/usePageDraft.ts` aplica o debounce de 1500 ms, indica alterações pendentes, evita salvar documentos estruturalmente
incompletos, mantém a edição após erros e avisa antes de fechar uma aba com alterações não salvas. Alterações durante um
salvamento recebem um novo ciclo depois que ele termina. A restauração do layout padrão continua explícita e preserva o
rascunho.

Permissões de edição e publicação vêm de `usePermissions` e são refletidas nos controles e nas permissões nativas do
Puck. A API permanece responsável pela autorização efetiva. Ingressos não podem ser removidos, duplicados ou ocultados;
destaque, local e contagem regressiva são únicos. Inserção e duplicação respeitam o limite de 30 seções. Cópias recebem
âncoras e IDs de itens novos. Problemas semânticos, como links para seções removidas, impedem a publicação e são
exibidos no editor.

### Referências e validação

Decisões baseadas na documentação oficial:

- [Getting started](https://puckeditor.com/docs/editor/getting-started) e
  [código/versionamento do Puck](https://github.com/puckeditor/puck).
- [Renderização com Server Components](https://puckeditor.com/docs/editor/data-and-rendering/server-components).
- [Campos personalizados](https://puckeditor.com/docs/editor/customize/custom-fields),
  [temas](https://puckeditor.com/docs/editor/customize/theming) e
  [tradução da interface](https://puckeditor.com/docs/editor/customize/localization).

Testes de regressão: `puck/data.test.ts`, `puck/editor-config.test.ts`, `puck/validation.test.ts`,
`puck/server-render.ssr.test.tsx`, `api/page-writer.test.ts`, `builder/EventPageBuilder.test.tsx`,
`builder/lib.test.ts`, `components/EventLandingPage.ssr.test.tsx` e a suíte SSR da rota pública. Os testes do editor
utilizam o Puck real; a rede e as APIs do Next são os pontos de substituição. Os antigos componentes manuais de lista,
modal e formulários foram removidos.

Evidências visuais em `docs/evidencias/editor-puck/`: `desktop.png`, `previa-celular.png` e `mobile.png`. O teste de
navegador usou os componentes reais com respostas de gravação isoladas, sem publicar ou alterar eventos do usuário.
Foram verificados edição e salvamento, desfazer, texto rico, duplicação com âncora nova, inserção pelo catálogo,
reordenação, proteção dos ingressos e largura de 390 px sem overflow horizontal.

A comparação de revisões normaliza o documento pelo schema antes de comparar: a ordem das propriedades devolvidas pelo
JSONB não cria falsas alterações nem provoca um PUT desnecessário antes de publicar. A duplicação nativa do Puck usa
`onAction` e `resolveDataById` para resolver novamente os IDs e as âncoras da cópia.

O build foi executado em uma cópia isolada para preservar o servidor de desenvolvimento. `next build --no-lint` concluiu
a compilação, a checagem de tipos e a geração das páginas. O build padrão chegou à compilação e parou nos quatro erros
de lint preexistentes do sidebar (`AdminSidebar.tsx:102`, `SidebarSubmenu.tsx:91`, `ui/sidebar.test.tsx:24,104`). Esses
arquivos não fazem parte desta refatoração. O manifest da rota pública não referencia o editor nem `@puckeditor`; o
carregamento do construtor é assíncrono e restrito ao painel.

Comandos de validação desta refatoração:

- `pnpm --filter web exec vitest run src/features/event-page 'src/app/(event)/eventos/[slug]/page.ssr.test.tsx' --maxWorkers=2`.
- `pnpm --filter web test:coverage --maxWorkers=2` (executa também a suíte completa).
- `pnpm --filter web exec tsc --noEmit`.
- `pnpm --filter web exec eslint src/features/event-page/puck src/features/event-page/api src/features/event-page/builder`
  e checagem das rotas/renderer alterados.
- `pnpm --filter web exec prettier --check src/features/event-page/puck src/features/event-page/api src/features/event-page/builder`.
- `pnpm --filter api exec vitest run test/event-page.test.ts test/event-page-routes.test.ts --maxWorkers=2` — 16 testes
  aprovados.
- `next build` e `next build --no-lint`, em cópia isolada, conforme a limitação de lint descrita acima.

Os overrides de `@tiptap/html` e `@tiptap/extension-text-align` específicos do Puck mantêm esses pacotes em 3.31.3,
alinhados à família Tiptap que o CMS já utiliza.

Resultado final: **1.146 testes web aprovados em 246 arquivos**, além dos **16 testes de compatibilidade da API**.
TypeScript, Prettier e lint dos arquivos desta refatoração passaram. Cobertura web: statements 76,82%, branches 71,68%,
funções 76,91% e linhas 78,30%; as quatro métricas superam a medição anterior à refatoração (76,72% / 71,63% / 76,80% /
78,28%). O comando de cobertura ainda termina com falha porque as metas globais de branches (79,1%) e funções (78,5%) já
não eram atendidas. Nenhum limite foi reduzido.
