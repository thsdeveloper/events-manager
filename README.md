# Events Manager

Monorepo para criação, publicação e venda de ingressos de eventos. O frontend Next.js consome exclusivamente a API
Fastify; autenticação, Postgres e Storage são fornecidos pelo Supabase.

## Arquitetura

```text
apps/web                 Next.js 15 (interface pública e administrativa)
apps/api                 Fastify (autenticação, conteúdo, eventos e pagamentos)
packages/contracts       Tipos e schemas Zod compartilhados
supabase/migrations      Schema Postgres, RLS, funções e políticas
supabase/seed.sql        Conteúdo mínimo para desenvolvimento
testsprite_tests         Cenários de aceitação
```

O navegador chama caminhos `/api/*` no Next.js. Em desenvolvimento, o Next encaminha essas chamadas para
`http://127.0.0.1:3333`, onde a API executa as regras de negócio e acessa o Supabase. A chave `service_role` existe
apenas na API.

## Desenvolvimento local

Pré-requisitos: Node.js 22+, pnpm 10+, Docker e Docker Compose. O repositório inclui `.nvmrc`; com NVM, execute
`nvm use` antes da instalação. A API fornece um transporte WebSocket compatível com Node 18/20 somente para facilitar a
transição, mas essas versões não são mais suportadas pelo cliente Supabase.

```bash
pnpm install
cp .env.example .env
pnpm dev
```

O comando inicia o Supabase e, depois, a API e o frontend:

- Frontend: http://localhost:3003
- API/health check: http://localhost:3333/health
- Supabase API: http://127.0.0.1:55321
- Supabase Studio: http://127.0.0.1:55323
- Caixa de e-mail local: http://127.0.0.1:55324

O frontend usa a porta fixa 3003 para evitar conflitos com outros projetos locais. Se ela estiver ocupada, encerre o
processo antigo ou altere em conjunto o script do web, `WEB_URL`, `NEXT_PUBLIC_SITE_URL` e `supabase/config.toml`.

## Banco e autenticação

O schema inicial cria perfis, organizadores, conteúdo modular, eventos, ingressos, inscrições, pagamentos, e-mails e
arquivos. As tabelas expostas possuem Row Level Security. O seed adiciona identidade visual, navegação, categorias e um
evento público de demonstração.

```bash
pnpm supabase:status   # credenciais e URLs locais
pnpm db:reset         # reaplica migrations e seed
pnpm db:types         # atualiza os tipos gerados do banco
pnpm supabase:stop
```

Cadastre um usuário pela aplicação. Com `PAYMENTS_MODE=mock`, a solicitação feita em **Minha conta** é ativada
automaticamente como organizador e pagamentos e repasses são simulados. Para testar a integração externa, use
`PAYMENTS_MODE=abacatepay` com uma chave de desenvolvimento e configure o webhook assinado.

## Confirmação de telefone

O telefone do perfil é confirmado por código SMS pelo Supabase Auth (fluxo `phone_change`). Com `NODE_ENV=development`,
a API não pede código: o clique em "Confirmar por SMS" confirma o telefone na hora, para que o restante do fluxo
(cadastro completo, organizador) possa ser testado. Fora de desenvolvimento nenhum atalho existe. O
`supabase/config.toml` ainda define códigos de teste por número em `[auth.sms.test_otp]` (por exemplo, `(11) 99999-0000`
aceita `123456`) para exercitar o fluxo real localmente. No projeto hospedado, configure um provedor de SMS (Twilio,
Vonage, MessageBird ou Textlocal) em Authentication > Providers > Phone; cadastro e login por telefone permanecem
desligados, o telefone é apenas dado de contato.

## Serviços opcionais

`PAYMENTS_MODE=mock` confirma pagamentos localmente sem chamadas externas. O modo `abacatepay` usa
[checkout transparente](docs/CHECKOUT_TRANSPARENTE.md) com Pix, boleto, cartão tokenizado e webhooks assinados da
AbacatePay. O SMTP local aponta para o Inbucket; OpenAI e Google Places ficam desativados enquanto suas chaves estiverem
vazias.

## Qualidade e TDD

O projeto é desenvolvido com TDD em todos os pacotes: cada comportamento nasce de um teste que falha, recebe a
implementação mínima e é refatorado com a suíte verde. O protocolo obrigatório está em [AGENTS.md](AGENTS.md) e o guia
completo, com receitas por camada e helpers, em [docs/TDD.md](docs/TDD.md).

```bash
pnpm lint
pnpm test              # contracts, api e web
pnpm test:coverage     # cobertura com limiares (catraca: só sobem)
pnpm build
pnpm format

# dentro de apps/api, apps/web ou packages/contracts
pnpm test:watch        # ciclo Red → Green → Refactor com watch
```

Na API, os testes ficam em `apps/api/test` (casos de uso com dublês de porta, rotas com `app.inject`, regras de
arquitetura). No front, `*.test.ts` roda em Node e `*.test.tsx` roda em jsdom com Testing Library. Os contratos Zod têm
testes em `packages/contracts/src`.

As rotas da API retornam erros no formato RFC 7807. Alterações de banco devem ser feitas por uma nova migration em
`supabase/migrations`, acompanhadas da atualização do seed e dos contratos quando aplicável.

## Administração e pagamentos

O painel do organizador fica em `/admin` e o painel global, protegido pelo papel `super_admin`, em `/super-admin`.

No Header do admin, o seletor de evento filtra dashboard, eventos, participantes, ingressos, análises, financeiro e
exportações. “Todos os eventos” restaura a visão da organização. A escolha fica em cookie HTTP-only por 30 dias,
vinculada à organização e validada pela API em cada requisição. Trocar de organização ou sair da conta limpa a
preferência; eventos removidos deixam de limitar a visão. O Financeiro oculta saldo e saques na visão por evento, pois
pertencem à organização. A troca reinicia o cache e os filtros locais das páginas; nos detalhes, abre a mesma seção do
novo evento. Configurações da organização continuam sendo da organização.

O dashboard por evento requer a migration `202611180001_dashboard_event_scope.sql` (`pnpm db:migrate` em
desenvolvimento). Não há nova variável de ambiente. Os testes de regressão estão em
`apps/api/test/event-selection.test.ts`, `apps/api/test/event-scope-routes.test.ts`,
`apps/web/src/features/event-scope/`, `AdminHeader.test.tsx`, `FinanceiroDashboard.test.tsx` e
`supabase/tests/dashboard_event_scope.sql`.

Também foram ajustados `ParticipantFilters.test.tsx` e `EventoDetalhesClient.test.tsx`, e adicionados
`eventos/[evento_id]/layout.ssr.test.tsx`, `AdminEventScope.test.tsx` e `openEvent.test.ts`. Para o bloco de eventos
recentes, a cobertura está em `event-highlight.test.ts` (API e contratos), `EventHighlight.test.tsx`,
`EventHighlightEditor.test.tsx` e nos registros `cms.test.ts`, `BlockBuilder.test.tsx`, `BlockFields.test.tsx` e
`blocks.test.ts`.

O menu Workspace oferece **Cadastrar nova conta**, que abre o formulário existente em `/perfil/organizador/novo`. Um
usuário pode gerenciar várias contas com CPF/CNPJ distintos. Uma nova conta ativa passa a ser o workspace atual e limpa
o filtro de evento; contas pendentes aparecem como “Em análise” e preservam a seleção anterior. O cadastro requer perfil
completo e mantém as regras de aprovação. A migration `202611180002_organizer_account_signup.sql` serializa cadastros
por documento e lembra a conta ativa sem alterar registros existentes. Não há nova variável de ambiente. Testes:
`organizer-signup.test.ts`, `OrganizationSwitcher.test.tsx`, `OrganizerSignupForm.test.tsx`, `AdminSidebar.test.tsx`,
`perfil/organizador/novo/page.test.tsx` e `supabase/tests/organizer_signup.sql`.

O usuário local `ths.pereira@gmail.com` já está promovido para testes. Para promover outro perfil, use
`pnpm admin:promote -- usuario@exemplo.com`.

Checkout, PIX, webhooks e repasses usam uma abstração de gateway com adapters local e AbacatePay. Veja o fluxo completo,
as variáveis e o roteiro para o ambiente de desenvolvimento em
[docs/PAGAMENTOS-ABACATEPAY.md](docs/PAGAMENTOS-ABACATEPAY.md).

## Atendimento aos organizadores

`/super-admin/organizadores` usa TanStack Table com busca por nome, e-mail ou CPF/CNPJ, filtros, paginação e ordenação
no servidor. O nome e a ação de detalhes abrem `/super-admin/organizadores/[id]`, que reúne:

- identificação, responsável, contatos e edição cadastral;
- status da conta e análise de PIX/conta bancária com documentos;
- saldo disponível, receita, valores reservados e repassados;
- eventos, transações com referências do provedor, repasses e comprovantes;
- alterações auditadas e anotações internas de atendimento, com paginação.

Toda alteração cadastral exige um motivo. Dados de recebimento são enviados exclusivamente pelo organizador; a aba
**Recebimento e documentos** permite aprovar/rejeitar versões e consultar documentos privados e histórico. A primeira
aprovação libera produção; alterações posteriores bloqueiam apenas novos repasses. Transferências bancárias são manuais
e exigem comprovante para conclusão. Consulte [Recebimento e verificação](docs/RECEBIMENTO_E_VERIFICACAO.md) para rotas,
migrations, regras de segurança, ilustrações e testes.

API protegida por superadmin: `GET/PATCH /api/super-admin/organizers/:id`,
`GET .../:id/records?kind=events|transactions|payouts|activity` e `POST .../:id/notes`. O endpoint anterior
`.../:id/status` também exige motivo. Os dados do gateway são limitados às referências e aos campos necessários ao
atendimento; payloads privados não são enviados ao navegador.

Migrations: `202611180003_organizer_support.sql` e `202611180004_organizer_legal_pages.sql`. Nenhuma variável de
ambiente nova. Os termos e políticas são editáveis no CMS, conforme [docs/CMS.md](docs/CMS.md).

Testes alterados/adicionados: `organizer-admin.test.ts` (contratos), `organizer-support-routes.test.ts` e
`organizer-support-service.test.ts` (API), `data-table.test.tsx`, `OrganizerTable.test.tsx`,
`OrganizerSupportPage.test.tsx`, `OrganizerSupportRecords.test.tsx`, `OrganizerSignupForm.test.tsx` (web),
`supabase/tests/organizer_support.sql` e `supabase/tests/organizer_legal_pages.sql`. Validação: `pnpm test`,
`pnpm lint`, `pnpm test:coverage`, builds da API/web e os dois scripts SQL contra o Supabase local, em transações com
rollback.

## CMS do superadmin

A página inicial e as páginas institucionais são montadas por blocos no painel `/super-admin/conteudo` (páginas, menus,
blog, formulários, redirecionamentos, mídia e SEO). O guia completo, com modelo de dados, rotas e regras de segurança,
está em [`docs/CMS.md`](docs/CMS.md).
