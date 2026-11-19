# Recebimento e verificação do organizador

O organizador cadastra seu destino de recebimento em `/admin/financeiro/recebimento`. Contas ainda pendentes acessam
`/perfil/organizador/[id]/recebimento`; o cadastro inicial encaminha diretamente para essa etapa. O super-admin analisa
as solicitações na aba **Recebimento e documentos** de `/super-admin/organizadores/[id]`.

## Etapas e permissões

1. O titular escolhe PIX ou transferência bancária e informa os dados da conta, que deve estar no mesmo CPF/CNPJ da
   organização.
2. Anexa documento do responsável e comprovante de titularidade. Para CNPJ, também é obrigatório o comprovante da
   empresa (contrato social ou CCMEI). Cada envio cria uma versão e vincula documentos novos àquela versão.
3. O super-admin confere os dados/documentos e registra aprovação ou rejeição, com parecer visível ao organizador. Não
   há edição de destino pelo suporte.
4. A primeira aprovação libera vendas em produção e, para uma conta pendente, ativa o workspace. Uma nova versão
   bloqueia somente **novos repasses**; as vendas continuam liberadas, conforme a primeira aprovação.
5. Uma rejeição mantém repasses bloqueados, sem restaurar uma chave anterior. O organizador corrige e reenvia.
   Histórico, documentos e pareceres permanecem.

A análise exige a permissão ativa `platform_receiving.review`, já concedida aos super-admins ativos. O analista pode ser
o próprio titular da organização; a decisão registra sua identidade e o parecer na auditoria. Ser apenas titular não
concede permissão de análise. Versões já decididas/substituídas não podem ser reaprovadas. A confirmação da versão
ocorre sob bloqueio transacional, junto à auditoria. Os dados de uma versão enviada são imutáveis. O CPF/CNPJ da
organização também deixa de ser editável após o primeiro envio de documentos.

`production_approved_at` controla a primeira liberação. Checkouts e novos planos parcelados reais verificam a liberação
e o status ativo antes de criar pagamentos. O provedor `mock` continua permitindo simulações locais. Alterar o status da
conta pelo formulário geral de suporte não substitui a validação documental.

## Documentos privados

PDF, JPG e PNG, até 10 MB por arquivo. A API verifica assinatura/MIME/tamanho e limita uploads do organizador a 30 por
hora. O bucket `organizer-verification` é privado, sem políticas de acesso direto para clientes. Os documentos não
entram na biblioteca pública de mídia do CMS.

Downloads passam pela API, que verifica autenticação e titularidade ou perfil de super-admin. As respostas usam
`Cache-Control: private, no-store`, download como anexo, `nosniff` e CSP restritiva. Caminhos internos de armazenamento
não são retornados pela consulta de solicitações. Uploads que falham ao registrar seus metadados têm o objeto removido.
Arquivos anexados a uma versão não podem ser reutilizados em outra solicitação.

## Repasses

- **PIX:** o destino vem da versão aprovada capturada na reserva do saldo. O envio ao gateway usa essa cópia, evitando
  uma chave lida antes da reserva.
- **Transferência bancária:** o Financeiro do super-admin reserva o valor, com status pendente e cópia dos dados
  aprovados. A equipe realiza a transferência e, na aba **Repasses** do organizador, anexa o comprovante privado,
  informa a referência e confirma a execução. Só então o repasse fica concluído.
- Reservas manuais não enviadas podem ser canceladas, com motivo e confirmação explícita de que nenhum valor saiu. Isso
  libera apenas o saldo reservado.
- Mudanças de cadastro impedem novas reservas. Uma transferência já reservada mantém seu destino original e pode ser
  conciliada com o comprovante efetivo.
- Webhooks do provedor não concluem transferências manuais.

A opção bancária não dispara TED por API. A execução manual foi escolhida para este fluxo; a integração existente do
gateway é utilizada para PIX.

## API

- `GET/POST /api/organizer/receiving-accounts/:id`: situação, histórico e envio.
- `POST .../:id/documents?kind=...`: upload privado do titular.
- `GET .../:id/documents/:documentId`: download autorizado.
- `GET /api/super-admin/organizers/:id/receiving-account`: consulta da análise.
- `POST .../receiving-account/:requestId/review`: decisão sobre uma versão.
- `GET .../receiving-account/documents/:documentId`: download do analista.
- `GET /api/super-admin/organizers/:id/manual-payouts`: reservas/transferências.
- `POST /api/super-admin/finance/payouts/:id/receipt|complete|cancel`: comprovante, conclusão e cancelamento de
  transferência manual.
- Downloads de comprovantes possuem rotas próprias para o titular e o super-admin.
- O antigo `PATCH /api/organizer/payout-settings` retorna 410, apontando para o novo fluxo. O PATCH geral do suporte
  recusa campos financeiros (422).

## Banco e identidade visual

Migrations `202611180005_receiving_account_verification.sql`, `202611180006_verified_payout_destinations.sql` e
`202611180007_preserve_receiving_identity.sql`. Não há variáveis de ambiente novas.

A migration `202611190001_allow_receiving_owner_review.sql` permite analisar a própria organização, mantendo a
verificação de permissão da plataforma e o acesso à função restrito à API.

Chaves antigas são preservadas como histórico legado e exigem envio de documentos para nova aprovação. A migration não
presume uma validação documental anterior; repasses antigos permanecem no histórico. Vendas reais dependem da nova
primeira aprovação. Aplique as migrations antes do deploy da API/frontend.

Ilustrações: `apps/web/public/illustrations/organizer-verification.png` e `organizer-approved.png`. Foram criadas para
este fluxo a partir da paleta do `Guia-da-marca.pdf` da Flouvi: violeta `#743DF5`, ameixa `#231A33`, damasco `#FFD09D`,
névoa `#F3EEFF` e branco. A interface usa DM Sans e os componentes compartilhados do projeto.

## Validação

Contratos: `receiving-account.test.ts`, `organizer-admin.test.ts`. API: `receiving-account-routes.test.ts`,
`receiving-documents.test.ts`, `receiving-production-access.test.ts`, `manual-payout-routes.test.ts`,
`manual-payout-service.test.ts`, `payout-security.test.ts`, `payout-webhook-destination.test.ts`,
`organizer-support-service.test.ts`, `organizer-support-routes.test.ts`, `organizer-signup.test.ts` e ajuste das
fixtures em `hosted-checkout.test.ts`. Frontend: `ReceivingAccountPage.test.tsx`, `ReceivingReviewPanel.test.tsx`,
`ManualPayoutPanel.test.tsx`, `PaymentAccountStatus.test.tsx`, `PayoutHistory.test.tsx`, `FinanceiroDashboard.test.tsx`,
`OrganizerSupportPage.test.tsx`, `perfil/organizador/novo/page.test.tsx`. SQL: `receiving_accounts.sql`,
`verified_payouts.sql`, `organizer_support.sql`.

Comandos: `pnpm test`, `pnpm lint`, `pnpm test:coverage`, `pnpm build` nos pacotes; `pnpm db:migrate`, `pnpm db:types` e
os scripts SQL com `psql -v ON_ERROR_STOP=1 -f ...`. Os testes SQL executam dentro de transação e rollback. A validação
no navegador usa contas, documentos e repasse fictícios locais, removidos ao final; não movimenta dinheiro real.

Na validação de 18/11/2026, passaram 258 testes de contratos, 754 da API e 847 do frontend. O lint, a verificação de
tipos e os builds passaram. O build web foi executado em uma cópia isolada para preservar o servidor de desenvolvimento.
As suítes completas foram executadas por `pnpm test:coverage --maxWorkers=4` na API e no frontend e `pnpm test:coverage`
nos contratos. Os limites dos contratos passaram e foram elevados. Os limites globais já pendentes da API e do frontend
continuam reprovando a etapa de cobertura; nenhum limite foi reduzido. A cobertura de branches da API subiu de 71,95%
para 72,43%; no frontend, de 62,82% para 62,96%, com linhas de 69,81% para 70,55%.
