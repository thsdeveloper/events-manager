# IAM e autorização por organização e evento

## Arquitetura encontrada (antes da implementação)

- Monorepo pnpm: Next.js 15/React 19 no frontend, Fastify/TypeScript na API e Zod em `packages/contracts`.
- Supabase Auth já fornece identidade, confirmação de e-mail e recuperação de senha. A API valida a sessão com
  `auth.getUser`; o navegador utiliza cookies HTTP-only.
- `profiles` referencia `auth.users`; `organizers` representa a organização e `organizers.user_id` identifica seu
  proprietário. Não será criada uma tabela duplicada de organizações ou identidades.
- Eventos referenciam `organizers`; tipos de ingresso, inscrições, ingressos nominais, cupons e páginas pertencem a
  eventos. Financeiro agrega registros e transações da organização. Check-in opera sobre ingressos nominais.
- Hoje a autorização verifica propriedade da organização/evento e o cargo global em `profiles`. Não há equipes nem
  cargos delegados. O seletor de evento é uma preferência de visualização, não uma permissão.
- O frontend acessa exclusivamente a API. Migrations de segurança revogam acesso direto de `anon`/`authenticated` às
  tabelas de negócio; RLS permanece habilitada. A API usa `service_role`, portanto precisa aplicar autorização explícita
  antes das operações.
- Serviços de aplicação, repositórios Supabase e rotas estão separados. React Query, TanStack Table, Shadcn, toast,
  e-mail transacional e `audit_logs` serão reutilizados.
- O push na `main` aciona validação, migrations no Supabase compartilhado e deploy de desenvolvimento. A implantação
  deve respeitar a autorização solicitada para impacto em dados/infraestrutura compartilhados.

## Plano e decisões

1. Manter autenticação e tabelas existentes. Acrescentar membros, catálogo de permissões, cargos, vínculos de
   permissões, atribuições organizacionais/por evento e convites.
2. Migrar somente proprietários atuais para membros proprietários; não conceder acesso administrativo a perfis globais
   comuns. Super-admin não recebe acesso implícito a organizações: sua atuação permanece nas rotas da plataforma. Uma
   pessoa que também possui uma organização mantém esse vínculo independente.
3. Resolver permissões no banco a cada requisição, considerando perfil ativo, organização ativa, vínculo ativo e escopo
   do evento. Sem cache compartilhado de autorização e sem confiar em claims de permissões ou no cookie de seleção.
4. Centralizar a decisão em um serviço de autorização e um catálogo explícito das operações HTTP. Rotas administrativas
   sem política são negadas. Validar o evento real dos recursos (ingresso, participante, grupo etc.), inclusive em
   mutações.
5. Filtrar listagens e agregações por eventos autorizados, além de restringir a navegação. Operadores de check-in não
   recebem saldos, receitas, CPF completo ou dados bancários.
6. Gestão transacional de equipe/cargos/convites com auditoria. Proibir remoção/bloqueio do proprietário e concessões
   superiores às do ator no mesmo escopo. Permissões organizacionais não podem ser concedidas por uma atribuição de
   evento.
7. Convites com token aleatório de uso único, hash no banco, validade, revogação e aceite por identidade com e-mail
   confirmado correspondente. Login/cadastro existentes continuam sendo usados. Links não são registrados em logs nem no
   histórico de e-mails.
8. Interface `/admin/equipe` com membros, convites, cargos, matriz de permissões e atribuições por evento;
   `/convites/aceitar` para aceite. Componentes e rotas usam permissões efetivas fornecidas pela API.
9. TDD nos contratos, serviços, endpoints e componentes; testes SQL reversíveis para isolamento, revogação, RLS e
   escalonamento. Banco de desenvolvimento compartilhado/produção não será utilizado para testes.
10. Documentar endpoints, catálogo, migração, validação e limites antes de commit/push.

## Estratégia de migração e reversão

Migration aditiva: preserva autenticação, proprietários, eventos e registros existentes. Chaves compostas e verificações
impedem vínculos entre organizações distintas; índices cobrem consulta por usuário, organização, evento e convites
pendentes. RLS e privilégios mantêm todas as escritas administrativas atrás da API. Auditoria reutiliza `audit_logs`,
acrescentando o identificador da organização.

Reversão operacional: reverter a versão da aplicação mantendo as tabelas aditivas e os dados de auditoria. Remover
tabelas ou vínculos exige procedimento separado e autorização, pois apagaria histórico e acessos concedidos.

## Implementação

A migration `202611180014_iam_rbac.sql` acrescenta `permissions`, `roles`, `role_permissions`, `organization_members`,
`role_assignments` e `user_invitations`. `audit_logs` recebe `organization_id`. `organizers` continua sendo a
organização e `profiles` continua sendo o perfil de identidade. Não há nova dependência.

O catálogo compartilhado em `packages/contracts/src/iam.ts` contém 40 permissões. Os cinco cargos organizacionais padrão
são protegidos contra edição; mudanças específicas são feitas criando cargos personalizados. Super-admin continua sendo
um cargo global, validado exclusivamente nas rotas da plataforma, sem contornar a autorização de equipe.

| Cargo padrão         | Acesso inicial                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Proprietário         | Todas as permissões da própria organização; vínculo legal protegido                                          |
| Administrador        | Operação de eventos e equipe; sem financeiro, reembolsos ou configuração de pagamentos                       |
| Gerente de eventos   | Operação dos eventos atribuídos; sem criar/excluir eventos ou cancelar inscrições                            |
| Financeiro           | Leitura de vendas, análises e exportação; repasses somente com atribuição organizacional                     |
| Operador de check-in | Consulta de eventos/participantes e validação de entrada; sem desfazer check-in, financeiro ou administração |

Uma atribuição com `eventId: null` vale para a organização. Uma atribuição com `eventId` vale somente para aquele evento
e ignora permissões organizacionais do cargo. É possível combinar cargos e eventos. A seleção no Header apenas reduz os
dados já autorizados; selecionar “Todos os eventos” nunca amplia as permissões do membro.

`AuthorizationService` resolve as permissões atuais no banco, valida a organização real do recurso e calcula a
interseção de eventos permitidos para consultas com várias permissões. `route-policy.ts` registra as operações
administrativas existentes; operações desconhecidas são negadas. O hook global aplica a política antes da rota.
Listagens, totais, filtros, dashboards, relatórios e exportações recebem o escopo autorizado antes da agregação.

Mutações de IAM são transacionais, serializadas por organização, e repetem as verificações de delegação no PostgreSQL.
Criar/alterar/excluir cargos ou atribuições exige permissão para administrar a operação e para delegar todos os acessos
afetados. Não é possível editar um cargo mais privilegiado para usá-lo como caminho de escalonamento. A revogação é
efetiva nas próximas requisições; requisições que já foram autorizadas não são interrompidas retroativamente.

Regras contextuais adicionais:

- Reembolso exige `participants.cancel` e `refunds.create` no mesmo evento.
- Alterar qualquer status do evento exige `events.update` e `events.publish`, inclusive despublicar ou arquivar.
- Dashboard exige `dashboard.read` e `finance.read` nos mesmos eventos; análises exigem `reports.read` e `finance.read`.
- Dados de recebimento, documentos cadastrais e identificação fiscal continuam exclusivos do proprietário; a revisão
  pelo super-admin permanece no fluxo de validação existente. Nenhum cargo delegado cadastra contas bancárias.
- Operadores sem permissão financeira não recebem valores, comprovantes ou metadados de pagamento nas respostas de
  participantes. Dados de contato do comprador e documentos completos também são removidos sem `participants.update`.
- Uma organização suspensa, um perfil suspenso ou um vínculo removido/suspenso não mantém acesso por claims antigas.
- O proprietário não pode ser removido, suspenso ou transferido por este módulo. Transferência de propriedade exige um
  procedimento separado, ainda não exposto pela interface.

### RLS e acesso ao banco

As novas tabelas têm RLS habilitada e não concedem acesso a `anon`/`authenticated`. As funções administrativas são
executáveis somente pelo backend com `service_role`. Isso preserva a arquitetura existente, na qual o navegador nunca
consulta tabelas de negócio diretamente. Não foram adicionadas políticas permissivas concorrentes às políticas antigas.
Índices, chaves estrangeiras compostas e triggers impedem atribuições cruzadas entre organização, membro, cargo e
evento. Usuários comuns não podem alterar ou apagar a auditoria, nem executar RPCs de gestão diretamente pelo Supabase.

## APIs de gestão

Todas as rotas exigem sessão autenticada. As rotas organizacionais usam a organização ativa validada no servidor.
Schemas Zod são estritos e os erros seguem RFC 7807. Respostas de autorização/equipe não são armazenadas em cache
público.

| Método e rota                                    | Finalidade / autorização                                                         |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| `GET /api/organizer/iam/access`                  | Permissões efetivas do próprio membro ativo                                      |
| `GET /api/organizer/iam/members`                 | Membros e atribuições; `users.read`                                              |
| `GET /api/organizer/iam/invitations`             | Até 200 convites recentes; `users.read`; nunca retorna token/hash                |
| `POST /api/organizer/iam/invitations`            | Convite por e-mail; `users.invite` e limite de delegação                         |
| `POST /api/organizer/iam/invitations/:id/resend` | Reenvio com novo token; `users.invite` e limite de delegação                     |
| `DELETE /api/organizer/iam/invitations/:id`      | Revogação; `users.invite`                                                        |
| `POST /api/iam/invitations/accept`               | Aceite pela identidade destinatária com e-mail confirmado                        |
| `PATCH /api/organizer/iam/members/:id`           | Status e atribuições; `users.update` e limite de delegação                       |
| `DELETE /api/organizer/iam/members/:id`          | Remoção lógica e revogação das atribuições; `users.remove` e limite de delegação |
| `GET /api/organizer/iam/roles`                   | Cargos padrão e da organização; `roles.read`                                     |
| `POST /api/organizer/iam/roles`                  | Criar cargo personalizado; `roles.create` e limite de delegação                  |
| `PATCH /api/organizer/iam/roles/:id`             | Editar cargo personalizado; `roles.update` e limite de delegação                 |
| `DELETE /api/organizer/iam/roles/:id`            | Excluir cargo sem atribuições/convites pendentes; `roles.delete`                 |
| `GET /api/organizer/iam/permissions`             | Catálogo e permissões delegáveis; `roles.read`                                   |
| `GET /api/organizer/iam/events`                  | Eventos disponíveis para atribuição; `events.read` no escopo correspondente      |
| `GET /api/organizer/iam/audit?page=1`            | Histórico IAM da organização, 25 itens por página; `audit.read`                  |

Convites usam 32 bytes aleatórios, validade de sete dias, hash SHA-256 persistido e consumo único. O token fica no
fragmento do link, não na query string. A página `/convites/aceitar` remove o fragmento, mantém o token na sessão do
navegador durante o login e exige aceite explícito. O e-mail autenticado deve corresponder ao destinatário e estar
confirmado. Um novo usuário utiliza o cadastro existente e reabre o convite após confirmar seu e-mail.

O aceite revalida as permissões atuais de quem convidou. Reenviar invalida o token anterior, inclusive em concorrência
com o aceite. Alterar, suspender ou remover um membro revoga convites pendentes anteriores para esse destinatário; um
novo convite explícito pode readmitir um membro removido. Um vínculo suspenso exige reativação pela equipe.
Envios/reenvios são limitados a 20 por hora por usuário; aceites a 30 tentativas por cinco minutos por usuário.

O envio reutiliza o serviço de e-mail e `WEB_URL`. Se o provedor falhar, o convite fica pendente e a resposta informa
`delivery: "failed"`; a interface permite reenviar. Links/tokens não entram no histórico de entregas nem nas mensagens
de erro persistidas. Auditoria registra ator, organização, ação, recurso, data, atribuições/permissões antes e depois e
negações relevantes, sem armazenar o segredo do convite.

## Interface

`/admin/equipe` reúne tabela de membros com busca/filtro, convite por e-mail, edição de cargos e eventos, suspensão,
reativação e remoção com confirmação. As outras abas mostram convites, cargos com matriz agrupada por módulo e
auditoria. A navegação e ações existentes usam permissões efetivas da API, com proteção no servidor e no cliente. A
consulta de permissões usa TanStack Query, chave por usuário/organização, atualização ao focar a janela e a cada 30
segundos. Falhas de autorização removem o acesso da interface; a API sempre verifica novamente, independentemente desse
intervalo.

Para criar cargos personalizados utilizáveis, inclua também as permissões de consulta das telas necessárias. Por
exemplo, um cargo que convida pela interface precisa de `users.read`, `users.invite`, `roles.read` e das permissões que
irá delegar; atribuições por evento exigem acesso de consulta aos eventos correspondentes. Não há concessão automática
dessas permissões.

Evidências visuais, obtidas com os componentes reais e respostas HTTP simuladas, sem enviar convites reais:

- [Equipe no desktop](evidence/iam/equipe-desktop.png)
- [Convite com escopo de evento](evidence/iam/convite-evento.png)
- [Matriz de permissões](evidence/iam/permissoes-cargo.png)
- [Equipe em tela de celular](evidence/iam/equipe-mobile.png)

## Validação realizada em 18/11/2026

TDD foi aplicado aos schemas, autorização, endpoints, convites, apresentação de dados e componentes. As regressões
incluem escalonamento, acesso cruzado, revogação, permissões organizacionais em atribuições de evento, publicação,
rotação de token, revalidação do remetente e convites anteriores à remoção.

| Comando / verificação                                                  | Resultado                                                                                                           |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @events-manager/contracts test:coverage --maxWorkers=2` | 326 testes; cobertura aprovada                                                                                      |
| `pnpm --filter @events-manager/api test:coverage --maxWorkers=2`       | 992 testes aprovados; gate global de branches ainda abaixo do limite preexistente                                   |
| `pnpm --filter @events-manager/web test:coverage --maxWorkers=2`       | 968 testes aprovados; gates globais de cobertura ainda abaixo dos limites preexistentes                             |
| `supabase/tests/*.sql` via `psql -v ON_ERROR_STOP=1`                   | 18 cenários em dez arquivos, incluindo oito cenários IAM; transações revertidas                                     |
| Navegador com Playwright                                               | Convite por evento, criação de cargo e viewport de 390 px, sem overflow da janela                                   |
| `pnpm lint`                                                            | Contratos, API e frontend aprovados                                                                                 |
| `pnpm build`                                                           | Contratos/API aprovados; frontend aprovado após corrigir a posição de uma diretiva `use client` e repetir seu build |
| `pnpm audit --prod --audit-level=high`                                 | Nenhuma vulnerabilidade conhecida encontrada                                                                        |

Cobertura da API: branches de 73,59% para 75,33% (limite 83,5%). Frontend: statements de 73,67% para 74,36%, branches de
66,72% para 67,70%, funções de 74,15% para 75,04% e linhas de 75,13% para 75,83%. Os limites não foram reduzidos. O
comando de cobertura da API e do frontend termina com código 1 por esses gates, embora todos os testes passem. O build
foi executado em cópia isolada do código para preservar o servidor de desenvolvimento em execução. Após a correção da
diretiva, os cinco testes da tabela de participantes também foram repetidos e aprovados.

Os novos testes estão em `packages/contracts/src/iam.test.ts`, `apps/api/test/iam-*.test.ts`,
`apps/web/src/features/iam/components/*.test.tsx`, `PermissionsProvider.test.tsx`, `permission-policy.test.ts`,
`getEventSelection.test.ts` e `supabase/tests/iam_rbac.sql`. Testes das telas existentes foram adaptados para fornecer
permissões explícitas nos fixtures; o comportamento padrão de produção continua negando acesso.

## Implantação e limites operacionais

A migration foi validada em cópia local descartável contendo apenas schema e fixtures versionados. Nenhuma migration foi
aplicada ao banco real da aplicação nem ao Supabase compartilhado durante essa validação. Não foram enviados e-mails
externos. A entrega efetiva de convites depende do provedor de e-mail já configurado e de `WEB_URL` apontando para a URL
pública HTTPS correta.

Antes da implantação, confirme a integridade dos proprietários existentes: todo `organizers.user_id` não nulo deve
possuir seu `profiles.id`, como assegurado pelo trigger de criação de identidade existente. Se houver dados legados
inconsistentes, a FK interrompe a migration; não são criados perfis ou promovidos usuários arbitrariamente para
contornar o problema. A migration promove somente proprietários comprovados e preserva vínculos existentes de
autenticação.

A ordem de implantação é migration, API e frontend. O workflow `.github/workflows/ci-deploy.yml` já segue essa ordem
quando há push na `main`, incluindo testes SQL no Supabase compartilhado. A execução nesse ambiente está sujeita à
autorização solicitada pelo responsável. A aplicação precisa dessa migration antes de utilizar as novas consultas IAM.

Atualização do ambiente local em 18/11/2026: após a validação isolada, a migration organizacional foi aplicada ao
Supabase local para corrigir o carregamento da sessão, com backup prévio. O IAM separado da equipe da plataforma e sua
migration local estão documentados em [IAM_PLATAFORMA.md](IAM_PLATAFORMA.md). O ambiente compartilhado permanece sem
essas alterações até a autorização de implantação.
