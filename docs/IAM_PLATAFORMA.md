# Equipe da plataforma

## Arquitetura encontrada e plano

O IAM organizacional já usa Supabase Auth, autorização na API, permissões consultadas no banco, convites de uso único,
RLS sem acesso direto pelo navegador e auditoria. O super-admin ainda usa o cargo global `profiles.role = super_admin`.
Suas rotas abrangem organizadores, transações/repasses, validação cadastral, taxas, identidade visual, categorias e CMS.

1. Acrescentar um catálogo e vínculos próprios da plataforma, preservando os super-admins existentes como responsáveis
   protegidos. Um membro delegado não terá seu cargo global promovido nem ganhará acesso às organizações.
2. Aplicar uma política central a todas as rotas `/api/super-admin/*`, negando rotas desconhecidas. Separar consulta de
   alteração, publicação, revisão cadastral e execução de repasses. Revalidar permissões nas operações SQL sensíveis.
3. Reutilizar os componentes de equipe, envio de convites e padrões TanStack Query/Shadcn com contexto explícito de
   plataforma. Adicionar `/super-admin/equipe`, navegação filtrada e proteção das ações existentes.
4. Testar isolamento entre os dois IAMs, consulta sem escrita, revogação, convites, delegação, responsáveis protegidos,
   RLS e navegação. Validar a migration em banco descartável antes de aplicá-la ao desenvolvimento local.

O push e a implantação no ambiente compartilhado permanecem sujeitos à autorização já solicitada.

## Modelo implementado

A migration `202611180015_platform_iam.sql` acrescenta `platform_permissions`, `platform_roles`,
`platform_role_permissions`, `platform_members`, `platform_role_assignments` e `platform_invitations`. O histórico usa
`audit_logs` com o prefixo `platform_iam.` e sem vínculo organizacional. Os tipos do banco foram regenerados. A
migration é aditiva; os dados e vínculos organizacionais existentes são preservados.

Os 39 privilégios usam o prefixo `platform_` e cobrem visão geral, organizadores, financeiro, repasses, validação
cadastral, taxas, identidade visual, categorias, CMS, equipe, cargos e auditoria. Esse catálogo não é intercambiável com
as permissões organizacionais: o contrato e o banco rejeitam permissões de organização e escopos de evento.

| Cargo padrão             | Acesso                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Super-admin principal    | Todos os módulos. Derivado exclusivamente do perfil global já existente; protegido contra convites, atribuições e alterações pela equipe. |
| Atendimento              | Consulta e manutenção de organizadores; sem valores financeiros, contas bancárias ou documentos.                                          |
| Financeiro da plataforma | Indicadores, organizadores e consultas financeiras; sem execução de repasses.                                                             |
| Editor de conteúdo       | CMS e categorias.                                                                                                                         |
| Consulta da plataforma   | Indicadores e consultas de organizadores e financeiro.                                                                                    |

Os cargos padrão são protegidos. Cargos personalizados podem combinar permissões e ser editados por responsáveis
expressamente autorizados. A delegação verifica tanto os privilégios antigos quanto os novos: ninguém altera um cargo ou
vínculo acima de sua própria autoridade. Um cargo atribuído ou usado por convite válido não pode ser excluído.

## Uso da interface

O menu **Equipe** abre `/super-admin/equipe`, com abas Membros, Convites, Cargos e Histórico, conforme as permissões. A
interface reutiliza TanStack Query, TanStack Table e os componentes Shadcn do IAM organizacional. As chaves de cache
incluem usuário e contexto de plataforma, evitando mistura com dados de uma organização.

1. Um super-admin principal abre Equipe e convida um e-mail, escolhendo um ou mais cargos.
2. O convidado entra ou cria uma conta, confirma seu e-mail e aceita em `/convites/plataforma`.
3. O acesso permanece limitado aos módulos concedidos; a entrada em `/super-admin` encaminha ao primeiro módulo
   permitido.
4. A edição de membro permite alterar cargos, suspender ou remover o acesso. O histórico registra essas operações.

Inclua as permissões de consulta necessárias ao conceder ações: a tela da equipe exige `platform_users.read` ou
`platform_roles.read`; convidar e atribuir cargos pela interface também exige consulta de cargos. Para gerenciar
recebimento no detalhe de um organizador, conceda `platform_organizers.read` e `platform_receiving.read`, além de
`platform_receiving.review` para aprovar/rejeitar. Para operar repasses, conceda consulta de organizadores e financeiro,
além de `platform_payouts.execute`. Consultar financeiro, isoladamente, não libera transferências.

As páginas fazem a verificação no servidor antes de buscar dados. O menu e os controles também respeitam permissões. O
contexto é atualizado ao focar a janela e a cada 30 segundos; falha na consulta ou mudança de identidade fecha o acesso
na interface. A API verifica a autoridade atual em cada requisição, independentemente desse intervalo.

## API

Todas as rotas administrativas exigem sessão, consultam permissões atuais e respondem com erros RFC 7807.

| Método                | Caminho                                                                                | Finalidade                                               |
| --------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| GET                   | `/api/super-admin/iam/access`                                                          | Permissões efetivas e indicação de responsável principal |
| GET                   | `/api/super-admin/iam/members`                                                         | Membros e responsáveis protegidos                        |
| GET                   | `/api/super-admin/iam/roles`                                                           | Cargos e permissões                                      |
| GET                   | `/api/super-admin/iam/permissions`                                                     | Catálogo, incluindo indicação de delegação permitida     |
| GET                   | `/api/super-admin/iam/invitations`                                                     | Convites, sem token ou hash                              |
| GET                   | `/api/super-admin/iam/audit?page=1`                                                    | Auditoria paginada                                       |
| POST                  | `/api/super-admin/iam/invitations`                                                     | Emitir convite                                           |
| POST / DELETE         | `/api/super-admin/iam/invitations/:id/resend` / `/api/super-admin/iam/invitations/:id` | Reenviar ou revogar                                      |
| POST / PATCH / DELETE | `/api/super-admin/iam/roles` / `/api/super-admin/iam/roles/:id`                        | Gerenciar cargos personalizados                          |
| PATCH / DELETE        | `/api/super-admin/iam/members/:id`                                                     | Alterar cargos/status ou remover vínculo                 |
| POST                  | `/api/platform-iam/invitations/accept`                                                 | Aceitar convite com a identidade autenticada             |

Convites usam tokens aleatórios de 256 bits no fragmento da URL, somente hash SHA-256 no banco, validade de sete dias,
uso único, e-mail confirmado correspondente e limite de emissão/aceite. Reenvio substitui o token. Alterações de acesso
revogam convites pendentes do destinatário; o aceite revalida também a autoridade atual de quem convidou. Suspensão não
pode ser contornada aceitando um convite. Falha de envio permite reenviar, sem informar falsamente que houve entrega.

## Proteções integradas

- A política central cobre todas as rotas `/api/super-admin/*`; operações desconhecidas são negadas por padrão.
- Vínculos da plataforma não alteram `profiles.role`, não selecionam outra organização e não concedem acesso ao admin
  organizacional.
- RLS permanece habilitado nas seis tabelas; clientes `anon`/`authenticated` não podem consultar ou modificar os dados
  nem executar as funções administrativas. A API usa o cliente privilegiado exclusivamente no backend.
- As mutações e o aceite executam transações com bloqueio de concorrência, validação de delegação e auditoria.
- Revisão cadastral e conclusão/cancelamento de transferência manual revalidam sua permissão no SQL.
- Respostas administrativas usam `private, no-store`. Dados financeiros e de recebimento são removidos também dos
  objetos e históricos aninhados quando o solicitante não possui a permissão correspondente.
- Alterações de publicação/agendamento no CMS exigem permissão própria. Omissão de status/data em uma atualização de
  conteúdo não aplica defaults que poderiam despublicar ou reagendar o documento.
- Logs de auditoria não contêm tokens de convite e não podem ser modificados por usuários comuns.

## Validação e implantação

Testes novos: `packages/contracts/src/platform-iam.test.ts`, `apps/api/test/platform-*.test.ts`,
`apps/api/test/cms-publication-patch.test.ts`, `apps/web/src/features/platform-access/*.test.*`,
`PlatformTeamManagement.test.tsx`, `supabase/tests/platform_iam.sql`. Testes existentes de equipe, autenticação e
componentes administrativos foram adaptados para fornecer permissões explícitas; produção continua negando por padrão.

Comandos: `pnpm lint`, `pnpm --filter @events-manager/web exec tsc --noEmit`, testes e cobertura dos três pacotes,
`pnpm build` em cópia isolada, e execução dos 11 arquivos de teste SQL em banco descartável. A cobertura global tem um
déficit anterior a esta entrega; os limiares não foram reduzidos. Os resultados finais estão registrados abaixo.

A validação de navegador usou componentes reais com HTTP simulado, sem enviar e-mails ou alterar cadastros reais:
convite, criação de cargo, suspensão, desktop e celular sem transbordamento horizontal da página. Evidências:
[desktop](evidence/platform-iam/equipe-desktop.png), [convite](evidence/platform-iam/convite.png),
[permissões](evidence/platform-iam/permissoes.png), [celular](evidence/platform-iam/equipe-mobile.png).

A migration foi testada em banco descartável e aplicada somente ao Supabase de desenvolvimento local, com backup
anterior. Nenhum banco compartilhado ou produção foi alterado. Não há novas credenciais ou dependências. A entrega real
dos convites depende do serviço de e-mail já configurado e de `WEB_URL` correto.

Implantar na ordem **migration → API → frontend**, pois a serialização de sessão consulta as novas funções. Não fazer
rollback removendo tabelas com membros/convites: preservar os dados e corrigir por migration posterior. O push na `main`
aciona `.github/workflows/ci-deploy.yml`, com migration e deploy compartilhados, e permanece pendente da autorização
específica já solicitada.

Resultados da entrega:

- Contratos: 330 testes aprovados; cobertura aprovada (98,01% statements, 95,11% branches).
- API: 1.080 testes aprovados. Branches em 76,02%, acima dos 75,33% anteriores, mas abaixo do limite global de 83,5%.
- Web: 983 testes aprovados. Cobertura em 74,61% statements, 68,09% branches, 75,19% functions e 76,08% lines; todos os
  indicadores melhoraram sobre o baseline anterior, mas os quatro limites globais continuam pendentes.
- Banco: 23 cenários aprovados em 11 arquivos, incluindo cinco grupos de regressão da plataforma.
- Build dos três pacotes, lint e TypeScript aprovados. O build do frontend foi feito em cópia isolada para preservar o
  servidor local.
- Verificação local: API `/health` e frontend `/login` retornam 200; a serialização dos responsáveis existentes carrega
  corretamente as 39 permissões e os cinco cargos.
