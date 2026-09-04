# Repository Guidelines

## Project Structure

- `apps/web/` contém o frontend Next.js App Router. Páginas públicas ficam em `src/app/(public)`, autenticação em `src/app/(auth)` e dashboards em `src/app/admin`.
- `apps/api/` contém a API Fastify. Rotas HTTP ficam em `src/routes`, casos de uso em `src/application`, integrações em `src/infrastructure` e configuração em `src/config`.
- `packages/contracts/` contém tipos de domínio e schemas Zod compartilhados. Nenhum segredo ou cliente privilegiado pode ser importado pelo frontend.
- `supabase/` contém configuração local, migrations, políticas RLS e seed.
- `testsprite_tests/` contém cenários de aceitação (E2E).
- `docs/TDD.md` é o guia da metodologia de desenvolvimento orientado a testes, obrigatória em todo o repositório.

## Commands

- `pnpm dev` inicia Supabase, API e frontend.
- `pnpm dev:apps` inicia apenas API e frontend quando o Supabase já está ativo.
- `pnpm db:reset` recria o banco local e aplica o seed.
- `pnpm lint`, `pnpm test` e `pnpm build` são os gates de qualidade; `pnpm test:coverage` aplica os limiares de cobertura.
- `pnpm test:watch` (dentro de cada pacote) mantém a suíte rodando durante o ciclo TDD.
- `pnpm db:types` atualiza os tipos gerados do banco.

## Architecture and Style

- O frontend nunca acessa o banco diretamente e nunca recebe `SUPABASE_SERVICE_ROLE_KEY`; toda regra de negócio passa pela API Fastify.
- Use TypeScript, schemas Zod na fronteira HTTP e erros RFC 7807.
- Preserve as camadas: domínio/contratos, aplicação, infraestrutura e interface HTTP.
- Componentes usam PascalCase, hooks começam com `use`, helpers usam camelCase e variáveis de ambiente usam UPPER_SNAKE_CASE.
- Execute o Prettier para formatação e preserve as convenções Tailwind/Shadcn existentes.

## Metodologia obrigatória: TDD

Todo trabalho neste repositório, na API, no front e nos contratos, segue
desenvolvimento orientado a testes. Isso vale para funcionalidade nova, correção
de bug e refatoração, e vale para pessoas e para agentes de IA. O guia completo,
com receitas por camada e helpers, está em [`docs/TDD.md`](docs/TDD.md).

### Protocolo (Red → Green → Refactor)

1. **Entenda o comportamento pedido** e identifique a camada: contrato Zod,
   caso de uso, rota, função pura, hook ou componente.
2. **Red: escreva o teste primeiro.** O `it` descreve a regra de negócio ou a
   experiência observável. Rode o teste e confirme que falha pelo motivo
   esperado (a regra ainda não existe), não por erro de import ou sintaxe.
3. **Green: implemente o mínimo** que faz o teste passar. Rode-o de novo.
4. **Refactor** com a suíte verde. Rode a suíte do pacote (`pnpm test` dentro de
   `apps/api`, `apps/web` ou `packages/contracts`).
5. **Repita** em passos pequenos até cobrir o pedido inteiro.
6. **Antes de entregar**: `pnpm test` e `pnpm lint` verdes no pacote alterado;
   cobertura não regrediu (`pnpm test:coverage`). Relate os comandos e os
   arquivos de teste tocados.

Bug: primeiro um teste que reproduz o defeito e falha; depois a correção. O
teste fica como regressão. Refatoração: sem teste cobrindo o trecho, escreva um
teste de caracterização antes de mover código.

### Onde os testes vivem

- `packages/contracts/src/*.test.ts`: regras dos schemas Zod compartilhados.
- `apps/api/test/*.test.ts`: casos de uso com dublês de porta, rotas com
  `app.inject` e Supabase falso, regras de arquitetura. Helpers em
  `apps/api/test/support/` (`createTestEnv`, `partialMock`, `buildRouteTestApp`,
  `createSupabaseClientsStub`). Toda rota nova exige testes de sucesso,
  validação (422) e autorização (401/403).
- `apps/web/src/**/*.test.ts` (projeto `unit`, Node): funções puras e schemas.
- `apps/web/src/**/*.ssr.test.tsx` (projeto `unit`): render no servidor sem DOM.
- `apps/web/src/**/*.test.tsx` (projeto `dom`, jsdom + Testing Library):
  componentes e hooks. Helpers em `apps/web/src/test/` (`renderWithProviders`,
  `renderHookWithProviders`, `mockFetch`, `jsonResponse`, `problemResponse`).
- Exemplos de referência: `apps/api/test/events.test.ts`,
  `apps/web/src/lib/fees.test.ts`, `apps/web/src/hooks/useDebounce.test.tsx`,
  `apps/web/src/features/tickets/components/TicketFeeSummary.test.tsx`,
  `apps/web/src/features/tickets/api/useFeeConfig.test.tsx`,
  `packages/contracts/src/schemas.test.ts`.

### Regras

- Dublês apenas nas portas (repositórios, gateways) e na rede (`fetch`,
  módulos do Next). Nunca mocke o módulo sob teste. Nada de Supabase, SMTP ou
  gateway real no ciclo interno.
- Teste comportamento, não implementação: sem asserções em classes CSS, ordem
  interna de chamadas ou estado privado. No front, localize por papel, rótulo
  ou texto e interaja com `user-event`.
- Sem `it.skip`, `it.only` ou testes comentados em código entregue.
- Limiares de cobertura são catraca: nunca reduza; eleve ao cobrir um módulo.
- E2E (`testsprite_tests/`, Playwright) complementa o ciclo, não o substitui.

## Database

- Toda mudança de schema deve ser uma nova migration; mantenha RLS, índices, triggers e seed coerentes.
- Teste autenticação, isolamento por organizador, checkout, upload e dashboards.

## Commits and Pull Requests

- Use mensagens concisas em português, com um único assunto por commit.
- PRs devem listar comandos executados, impactos de migration/env e evidências visuais quando houver mudança de UI.
