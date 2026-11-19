# Ambiente de desenvolvimento na nuvem

O push da `main` executa `.github/workflows/ci-deploy.yml`. Pull requests executam somente validação, sem credenciais de
infraestrutura. O deploy segue a ordem: validação da aplicação + banco isolado → migrations remotas → API → frontend →
configuração de autenticação. A concorrência serializa os deploys; não interrompa uma execução durante uma migration.

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

O job `database` desabilita o seed de demonstração somente na cópia do runner antes de `db start`, pois esse comando
também executa o seed por padrão. Ele inicia apenas o Postgres, recria o banco **local do CI** com todas as migrations e
`--no-seed`, e executa `supabase test db --local`. Ele não recebe credenciais de infraestrutura e também roda em pull
requests. O banco descartável é encerrado mesmo quando algum teste falha. Os testes SQL criam seus próprios usuários,
pedidos e organizações dentro de transações com rollback; por isso devem rodar nesse ambiente isolado. Esse fluxo segue
a [orientação oficial de testes no GitHub Actions do Supabase](https://supabase.com/docs/guides/deployment/ci/testing).

O job `migrate` exige sucesso tanto de `validate` quanto de `database`. No projeto remoto, ele apenas vincula o projeto
e aplica migrations pendentes, em etapas separadas para distinguir falhas de conexão de falhas de SQL. Não execute
`supabase test db --linked` no deploy: a conexão temporária usada pela CLI para migrations não tem os privilégios
necessários para criar fixtures em `auth.users` nem para acessar todas as tabelas da suíte.

### Falha de testes após migrations aplicadas

Na execução [#5](https://github.com/thsdeveloper/events-manager/actions/runs/44612062945), o comando `db push` concluiu
as sete migrations pendentes. A falha seguinte foi `permission denied for schema auth` /
`permission denied for table pages` durante os testes SQL remotos; não foi uma falha de login ou de aplicação de
migrations. O deploy da API e do frontend foi bloqueado pela dependência desse job. A execução #4 já apresentava o mesmo
problema.

As migrations aplicadas permanecem no banco. Após corrigir o workflow, `db push --linked` consulta o histórico e aplica
somente as que ainda faltarem; não é necessário resetar o banco, reparar o histórico ou ampliar privilégios para testes.
O teste de regressão `apps/api/test/deployment-workflow.test.ts` verifica a separação dos testes, os pré-requisitos do
deploy e a ausência de reset/seed no banco remoto.

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

A chave OpenAI, quando configurada, é um secret da API. O ambiente local usa Mailpit; ele não é acessível pelo Fly. O
desenvolvimento publicado usa Resend para os e-mails da API e do Supabase Auth, conforme a configuração abaixo.

### Resend no desenvolvimento publicado

Em 19/11/2026, o SMTP foi configurado no app Fly `flouvi-api-dev` e no Supabase `yqjkujwugetsffldkisd`. O domínio
`ello4.com.br` já estava verificado, com SPF e DKIM válidos e envio habilitado. O remetente identifica o ambiente:
`Flouvi Desenvolvimento <flouvi-dev@ello4.com.br>`.

| Configuração da API | Valor                                                    |
| ------------------- | -------------------------------------------------------- |
| `SMTP_HOST`         | `smtp.resend.com`                                        |
| `SMTP_PORT`         | `465`                                                    |
| `SMTP_SECURE`       | `true` — TLS desde o início da conexão                   |
| `SMTP_USER`         | `resend`                                                 |
| `SMTP_PASSWORD`     | Chave Resend armazenada como secret no Fly; nunca no Git |
| `EMAIL_FROM`        | `Flouvi Desenvolvimento <flouvi-dev@ello4.com.br>`       |

A API continua usando o gateway Nodemailer existente, incluindo os anexos PDF dos ingressos. Não é necessário adicionar
SDK do Resend à aplicação ou expor a chave ao frontend. O SMTP usa a chave de API como senha, conforme a
[documentação do Resend](https://resend.com/docs/send-with-smtp).

A conexão TLS e a autenticação SMTP foram verificadas localmente e de dentro da máquina Fly, sem disparar mensagens para
clientes. O health check da API retornou `200`, com banco conectado, após a aplicação dos secrets.

O Supabase Auth tem configuração própria em **Authentication → Email → SMTP Settings**. Usa o mesmo host, porta,
usuário, chave e remetente. Seu limite de envio ficou em 30 mensagens por hora para desenvolvimento; confirmação
obrigatória de e-mail, validade dos códigos e URLs de retorno foram preservadas. Consulte a
[integração Resend/Supabase](https://resend.com/docs/send-with-supabase-smtp).

Para renovar a chave, atualize o secret `SMTP_PASSWORD` do Fly e a senha SMTP do Supabase. Não coloque a credencial em
`fly.toml`, `.env.example`, logs ou argumentos de comandos. Prefira entrada padrão para `fly secrets import` e o painel
ou corpo JSON da API de gerenciamento do Supabase. A configuração persiste nos próximos deploys.

### MCP do Resend e ambiente local

O MCP remoto oficial foi registrado como `resend` em `~/.codex/config.toml`, usando `https://mcp.resend.com/mcp` e
autenticação Bearer. O arquivo privado tem permissão `0600`; não copie seu conteúdo para issues, commits ou logs. O
servidor respondeu à inicialização, à listagem de ferramentas e a uma consulta autenticada aos domínios. Novas sessões
do Codex carregam essa configuração. A [documentação do MCP](https://resend.com/docs/mcp-server) descreve as opções de
conexão.

A chave também está no `.env` local ignorado pelo Git, como `RESEND_API_KEY`, para uso administrativo. Essa variável
sozinha não altera o transporte da aplicação: a API lê `SMTP_*`. O localhost continua usando o Mailpit nas portas 55324
(interface) e 55325 (SMTP), inclusive para os testes das notificações. O MCP é uma ferramenta de administração; os
envios da aplicação não dependem dele.

### Modelos e códigos de autenticação

Os arquivos `supabase/templates/*.html` e a seção `[auth.email]` do `supabase/config.toml` configuram o Supabase local.
O projeto hospedado precisa receber esses valores pela Management API; aplicar migrations e configurar SMTP não publica
os modelos de e-mail.

O job `auth_config` executa `scripts/sync_supabase_auth.py` depois de publicar a API e o frontend. Ele confere o projeto
pela URL do site, sincroniza os modelos de confirmação, recuperação e troca de e-mail, seus assuntos em português e a
política de confirmação (6 dígitos, 15 minutos). Uma leitura posterior verifica a persistência. SMTP, credenciais, URLs
de retorno e limites de envio são preservados. O script usa Python 3.11+ e não precisa de dependências adicionais. Os
testes de configuração rodam dentro de `pnpm test:api`, com uma API simulada.

O link de recuperação abre `/redefinir-senha#token_hash=...&type=recovery`. Abrir a página não verifica nem consome o
código. A API recebe a prova somente ao enviar uma nova senha e chama `verifyOtp` com o propósito fixo `recovery`, em um
cliente isolado. Isso evita inferir o propósito pela declaração `amr`, que pode ser `otp` mesmo em uma recuperação
válida. A prova não permite nova alteração depois de consumida. Links antigos que já geraram uma sessão exigem uma nova
solicitação em `/esqueci-senha`; nenhuma senha ou confirmação de conta existente é alterada pelo deploy.

Referência:
[modelos e pré-carregamento de links no Supabase](https://supabase.com/docs/guides/auth/auth-email-templates).

Validação da correção em 19/11/2026:

- `pnpm --filter @events-manager/api test:coverage --maxWorkers=2`: 1.301 testes passaram, incluindo a execução de cinco
  casos Python da sincronização; `pnpm --filter @events-manager/web test:coverage --maxWorkers=2`: 1.154 testes
  passaram.
- `pnpm lint` e `pnpm --filter @events-manager/web exec tsc --noEmit`: passaram.
- Recuperação real com conta temporária no Supabase local: nova senha aceita, senha anterior recusada, prova de uso
  único e sessão compartilhada preservada. A conta temporária foi removida; contas reais não foram alteradas.
- Recuperação também validada pelo proxy público de desenvolvimento, depois do deploy: resposta 200, login com a nova
  senha, recusa da senha anterior e recusa de reutilização da prova. A conta temporária tinha boas-vindas desabilitadas
  e foi removida ao final; a prova foi gerada administrativamente, sem disparar e-mail.
- `/api/branding/logo` utiliza o PNG da Flouvi já incluído nos assets da API quando não há logo cadastrada ou a
  configuração está indisponível. A leitura é compartilhada em memória e a resposta permite cache de cinco minutos.
  Logos cadastradas continuam tendo preferência. A regressão reproduzia o erro 404 observado em desenvolvimento.
- Cobertura sem regressão: branches da API 78,18% (antes 78,10%); frontend manteve branches 71,86% e funções 77,06%. Os
  comandos de cobertura ainda retornam erro pelos limites globais preexistentes, que não foram reduzidos.

Regressões cobertas em `apps/api/test/auth.test.ts`, `auth-email-templates.test.ts`, `email-logo.test.ts`,
`auth-deployment-config.test.ts`, `deployment-workflow.test.ts`, `scripts/tests/test_sync_supabase_auth.py` e
`apps/web/src/app/(auth)/redefinir-senha/page.test.tsx`.

### Ativação das notificações

As notificações de conta, organização, pagamento e evento têm fila e preferências próprias. Antes de habilitá-las, siga
a [ativação de notificações por ambiente](NOTIFICACOES_EMAIL.md#ativação-por-ambiente): aplique a migration, configure o
SMTP e a credencial do agendador e ative `EMAIL_NOTIFICATIONS_ENABLED`. O workflow `email-notifications.yml` aciona a
API mesmo quando a máquina do Fly estiver suspensa.

A primeira configuração utilizou CLI/API oficiais autenticadas: o endpoint MCP Supabase recusou a conexão com HTTP 403 e
o MCP Vercel não estava disponível.

Rollback de código deve ser um `git revert` seguido de push, mantendo histórico e validações. Migrations precisam ser
compatíveis com a versão anterior da API; reverter um commit não desfaz alterações no banco. Corrija schema com uma nova
migration, sem editar migrations já aplicadas.

Referências: [Fly — autostop](https://fly.io/docs/launch/autostop-autostart/),
[Vercel — monorepos](https://vercel.com/docs/monorepos).
