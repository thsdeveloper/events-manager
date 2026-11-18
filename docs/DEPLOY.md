# Ambiente de desenvolvimento na nuvem

O push da `main` executa `.github/workflows/ci-deploy.yml`. Pull requests executam somente validação, sem credenciais de
infraestrutura. O deploy segue a ordem: validação → migrations → API → frontend. A concorrência serializa os deploys;
não interrompa uma execução durante uma migration.

| Serviço                        | Destino                                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Frontend Next.js               | https://flouvi-dev.vercel.app — projeto Vercel `flouvi-dev`, equipe `ello4-solutions`, raiz `apps/web`          |
| API Fastify                    | https://flouvi-api-dev.fly.dev — app Fly `flouvi-api-dev`, região `yyz` (Toronto, próxima ao banco em Montreal) |
| Banco, autenticação e arquivos | Supabase `EventsFlow`, referência `yqjkujwugetsffldkisd`, região `ca-central-1`                                 |

O slot chamado `production` pela Vercel pertence ao projeto **de desenvolvimento**. A API usa `NODE_ENV=production` para
otimizações e cookies seguros, com `APP_ENV=development` e `PAYMENTS_MODE=mock`. Não há cobrança real neste ambiente. O
frontend recebe apenas URLs públicas e a URL interna da API. Credenciais privilegiadas do Supabase e das integrações
ficam exclusivamente na API.

## GitHub Actions

No environment `development`, os secrets são:

- `SUPABASE_ACCESS_TOKEN`: aplica as migrations ao projeto indicado explicitamente.
- `FLY_API_TOKEN`: token de deploy restrito ao app `flouvi-api-dev`.
- `VERCEL_TOKEN`: token da equipe para o deploy do projeto Vercel.

As variables são `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID`. Tokens nunca ficam no Git. O token Fly criado na configuração
inicial expira em 90 dias; renove-o antes do vencimento e atualize o secret. As actions usam revisões fixas e os CLIs de
deploy possuem versão fixa. A instalação usa `pnpm-lock.yaml` com `--frozen-lockfile`.

A validação executa os testes dos três pacotes, lint/tipos, builds, auditoria das dependências de runtime e build
Docker. O workflow manual `Cobertura (limiares existentes)` aplica os limiares originais e publica os relatórios mesmo
quando falha. A API e o frontend já estavam abaixo desses limiares antes deste pipeline; eles não foram reduzidos. Esse
workflow ainda não bloqueia o deploy e deve virar um gate obrigatório depois de resolver a dívida de cobertura
existente.

## Máquina Fly e ociosidade

`fly.toml` configura uma máquina compartilhada de 1 CPU e 512 MB, com `auto_stop_machines = "stop"`,
`auto_start_machines = true` e `min_machines_running = 0`. O deploy usa `--ha=false` para não criar uma segunda máquina
de reserva. Após alguns minutos sem tráfego, o proxy Fly pode parar a máquina. A primeira requisição seguinte a inicia
novamente e pode demorar mais. Não há um temporizador exato de ociosidade configurável nesses campos.

Os health checks internos não exigem manter a máquina ligada. Evite serviços externos que consultem `/health`
continuamente: eles geram tráfego e impedem a ociosidade. Ao parar, a API recebe SIGTERM e fecha as conexões Fastify.

Tarefas periódicas em memória também param. Antes de habilitar pagamentos reais, planeje um worker ou agendador externo
para a reconciliação; o ambiente atual usa pagamentos simulados. O desligamento reduz tempo de CPU/RAM faturado, mas não
implica gratuidade dos provedores.

```sh
fly status -a flouvi-api-dev
fly machine list -a flouvi-api-dev
fly logs -a flouvi-api-dev
curl --fail https://flouvi-api-dev.fly.dev/health
```

## Banco e desenvolvimento local

O banco remoto recebe somente migrations, incluindo configurações iniciais e categorias. Não execute `db reset --linked`
nem `db push --include-seed` nele: `supabase/seed.sql` contém contas e eventos de demonstração locais. Usuários,
eventos, posts e arquivos já cadastrados no banco local não são copiados para a nuvem por um commit ou deploy.

Para continuar trabalhando localmente:

```sh
cp .env.example .env # apenas se ainda não existir; preserve as integrações atuais
pnpm install --frozen-lockfile
pnpm dev
```

O ambiente local continua usando Supabase local, web na porta 3003 e API na porta 3333. `pnpm db:reset` é destrutivo
para o banco local e não é necessário para este deploy. Para conferir migrations remotas use uma sessão autenticada:

```sh
pnpm exec supabase link --project-ref yqjkujwugetsffldkisd --yes
pnpm exec supabase db push --linked --dry-run
```

O Supabase Auth permite retornos para `https://flouvi-dev.vercel.app/**` e `http://localhost:3003/**`. Cadastre o
usuário na instância remota antes de promover um superadmin; o script `pnpm admin:promote` deve receber as credenciais
do ambiente correto, sem reutilizar implicitamente o banco local.

## Integrações e manutenção

A chave OpenAI, quando configurada, é um secret da API. O ambiente local usa Mailpit; ele não é acessível pelo Fly. Para
emails de ingressos e demais mensagens transacionais, configure um SMTP real via secrets `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` e `EMAIL_FROM`. Configure também SMTP no Supabase Auth para remover as
restrições do serviço de email padrão.

A primeira configuração utilizou CLI/API oficiais autenticadas: o endpoint MCP Supabase recusou a conexão com HTTP 403 e
o MCP Vercel não estava disponível.

Rollback de código deve ser um `git revert` seguido de push, mantendo histórico e validações. Migrations precisam ser
compatíveis com a versão anterior da API; reverter um commit não desfaz alterações no banco. Corrija schema com uma nova
migration, sem editar migrations já aplicadas.

Referências: [Fly — autostop](https://fly.io/docs/launch/autostop-autostart/),
[Vercel — monorepos](https://vercel.com/docs/monorepos).
