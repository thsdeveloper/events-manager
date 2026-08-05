# Repository Guidelines

## Project Structure

- `apps/web/` contém o frontend Next.js App Router. Páginas públicas ficam em `src/app/(public)`, autenticação em `src/app/(auth)` e dashboards em `src/app/admin`.
- `apps/api/` contém a API Fastify. Rotas HTTP ficam em `src/routes`, casos de uso em `src/application`, integrações em `src/infrastructure` e configuração em `src/config`.
- `packages/contracts/` contém tipos de domínio e schemas Zod compartilhados. Nenhum segredo ou cliente privilegiado pode ser importado pelo frontend.
- `supabase/` contém configuração local, migrations, políticas RLS e seed.
- `testsprite_tests/` contém cenários de aceitação.

## Commands

- `pnpm dev` inicia Supabase, API e frontend.
- `pnpm dev:apps` inicia apenas API e frontend quando o Supabase já está ativo.
- `pnpm db:reset` recria o banco local e aplica o seed.
- `pnpm lint`, `pnpm test` e `pnpm build` são os gates de qualidade.
- `pnpm db:types` atualiza os tipos gerados do banco.

## Architecture and Style

- O frontend nunca acessa o banco diretamente e nunca recebe `SUPABASE_SERVICE_ROLE_KEY`; toda regra de negócio passa pela API Fastify.
- Use TypeScript, schemas Zod na fronteira HTTP e erros RFC 7807.
- Preserve as camadas: domínio/contratos, aplicação, infraestrutura e interface HTTP.
- Componentes usam PascalCase, hooks começam com `use`, helpers usam camelCase e variáveis de ambiente usam UPPER_SNAKE_CASE.
- Execute o Prettier para formatação e preserve as convenções Tailwind/Shadcn existentes.

## Database and Tests

- Toda mudança de schema deve ser uma nova migration; mantenha RLS, índices, triggers e seed coerentes.
- Teste autenticação, isolamento por organizador, checkout, upload e dashboards.
- Novas rotas exigem teste de sucesso, validação e autorização.

## Commits and Pull Requests

- Use mensagens concisas em português, com um único assunto por commit.
- PRs devem listar comandos executados, impactos de migration/env e evidências visuais quando houver mudança de UI.
