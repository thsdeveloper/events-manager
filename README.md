# Events Manager

Monorepo para criação, publicação e venda de ingressos de eventos. O frontend Next.js consome exclusivamente a API Fastify; autenticação, Postgres e Storage são fornecidos pelo Supabase.

## Arquitetura

```text
apps/web                 Next.js 15 (interface pública e administrativa)
apps/api                 Fastify (autenticação, conteúdo, eventos e pagamentos)
packages/contracts       Tipos e schemas Zod compartilhados
supabase/migrations      Schema Postgres, RLS, funções e políticas
supabase/seed.sql        Conteúdo mínimo para desenvolvimento
testsprite_tests         Cenários de aceitação
```

O navegador chama caminhos `/api/*` no Next.js. Em desenvolvimento, o Next encaminha essas chamadas para `http://127.0.0.1:3333`, onde a API executa as regras de negócio e acessa o Supabase. A chave `service_role` existe apenas na API.

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

O frontend usa a porta fixa 3003 para evitar conflitos com outros projetos locais. Se ela estiver ocupada, encerre o processo antigo ou altere em conjunto o script do web, `WEB_URL`, `NEXT_PUBLIC_SITE_URL` e `supabase/config.toml`.

## Banco e autenticação

O schema inicial cria perfis, organizadores, conteúdo modular, eventos, ingressos, inscrições, pagamentos, e-mails e arquivos. As tabelas expostas possuem Row Level Security. O seed adiciona identidade visual, navegação, categorias e um evento público de demonstração.

```bash
pnpm supabase:status   # credenciais e URLs locais
pnpm db:reset         # reaplica migrations e seed
pnpm db:types         # atualiza os tipos gerados do banco
pnpm supabase:stop
```

Cadastre um usuário pela aplicação. Com `PAYMENTS_MODE=mock`, a solicitação feita em **Minha conta** é ativada
automaticamente como organizador e pagamentos e repasses são simulados. Para testar a integração externa, use
`PAYMENTS_MODE=abacatepay` com uma chave de desenvolvimento e configure o webhook assinado.

## Serviços opcionais

`PAYMENTS_MODE=mock` confirma pagamentos localmente sem chamadas externas. O modo `abacatepay` usa checkout hospedado,
PIX e webhooks HMAC do AbacatePay. O SMTP local aponta para o Inbucket; OpenAI e Google Places ficam desativados enquanto
suas chaves estiverem vazias.

## Qualidade e TDD

O projeto é desenvolvido com TDD em todos os pacotes: cada comportamento nasce
de um teste que falha, recebe a implementação mínima e é refatorado com a
suíte verde. O protocolo obrigatório está em [AGENTS.md](AGENTS.md) e o guia
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

Na API, os testes ficam em `apps/api/test` (casos de uso com dublês de porta,
rotas com `app.inject`, regras de arquitetura). No front, `*.test.ts` roda em
Node e `*.test.tsx` roda em jsdom com Testing Library. Os contratos Zod têm
testes em `packages/contracts/src`.

As rotas da API retornam erros no formato RFC 7807. Alterações de banco devem ser feitas por uma nova migration em `supabase/migrations`, acompanhadas da atualização do seed e dos contratos quando aplicável.

## Administração e pagamentos

O painel do organizador fica em `/admin` e o painel global, protegido pelo papel `super_admin`, em `/super-admin`.
O usuário local `ths.pereira@gmail.com` já está promovido para testes. Para promover outro perfil, use
`pnpm admin:promote -- usuario@exemplo.com`.

Checkout, PIX, webhooks e repasses usam uma abstração de gateway com adapters local e AbacatePay. Veja o fluxo completo,
as variáveis e o roteiro para o ambiente de desenvolvimento em [docs/PAGAMENTOS-ABACATEPAY.md](docs/PAGAMENTOS-ABACATEPAY.md).
