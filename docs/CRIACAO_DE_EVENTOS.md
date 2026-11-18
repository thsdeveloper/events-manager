# Cadastro de eventos

O assistente em `/admin/eventos/novo` mantém as sete etapas e o salvamento de rascunhos. Prévia e Salvar rascunho ficam
junto ao título. A navegação usa [Tabs do Shadcn com Base UI](https://ui.shadcn.com/docs/components/base/tabs), com
acesso por teclado e bloqueio das etapas ainda não visitadas. A edição reutiliza o mesmo assistente.

## Comportamentos

- A categoria selecionada recebe sua cor cadastrada, com fundo suave, borda e ícone colorido.
- Presencial, Online e Híbrido têm ilustrações da marca e indicação da opção selecionada. Os controles de local a
  definir e exibição do mapa ficam junto aos seus rótulos.
- Em eventos presenciais e híbridos, nome do local, CEP, número (ou `s/n`) e UF são obrigatórios, exceto quando o local
  ainda está a definir. O seletor contém as 27 UFs e o CEP usa máscara `00000-000`.
- A consulta ao [ViaCEP](https://viacep.com.br/) passa por `GET /api/places/postal-code/:code`, com autenticação,
  validação, limite de requisições e timeout de 8 segundos. Erros permitem preenchimento manual. Respostas atrasadas são
  descartadas; mudanças em outros campos não disparam novas consultas. Endereços já personalizados são preservados ao
  retornar à etapa.
- O modal do mapa busca o endereço informado para enquadrar a região. O organizador pode clicar ou arrastar o marcador;
  somente Salvar localização grava as coordenadas. Cancelar preserva o ponto anterior. Alterar o CEP não muda o ponto
  exato. Um marcador removido não reaparece por causa de uma resposta antiga. O mapa mantém a atribuição ao
  OpenStreetMap e usa tons da marca nos controles, mapa e marcador.
- Eventos gratuitos e pagos têm ilustrações próprias. A ajuda dos grupos explica a organização em setores e subgrupos,
  preservando preço, estoque e período de venda de cada ingresso. O botão Adicionar ingresso fica dentro do estado
  vazio; os campos de grupo e seu botão ficam alinhados.
- `CurrencyInput` formata valores como `R$ 344,00`, mantendo números nos payloads. É usado em ingressos, descontos
  fixos, repasses, configurações monetárias e calculadora de taxas; percentuais e quantidades continuam numéricos. A
  digitação segue a entrada por centavos (por exemplo, `34400` resulta em `R$ 344,00`).
- O modal de taxas detalha preço base, percentual e mínimo da plataforma, responsável pela conveniência, total do
  comprador, percentual e parcela fixa do gateway, descontos e recebimento estimado. Permite comparar formas de
  pagamento com a tabela pública vigente. Taxas de repasse são apresentadas separadamente. A consulta compartilhada usa
  TanStack Query.
- A capa tem upload compacto à esquerda e texto alternativo, orientações e IA à direita; em telas pequenas, as colunas
  se empilham. A revisão exibe tanto a imagem local ainda não enviada quanto uma capa já cadastrada.
- Após criar, a página `/admin/eventos/:id` consome a confirmação pendente e mostra o toast e os confetes. A animação
  termina automaticamente, respeita movimento reduzido e não se repete ao recarregar. Estados cancelado e arquivado
  recuperados não geram comemoração.

## Assets e execução

As cinco ilustrações estão em `apps/web/public/illustrations/event-creation/`. Os prompts completos, a ferramenta de
geração e os caminhos originais estão em [illustrations/event-creation.json](illustrations/event-creation.json). A
paleta segue o Guia da marca Flouvi: violeta, ameixa, damasco e tons claros.

Foi adicionada a dependência `@base-ui/react` e atualizado o lockfile. Não há nova migration nem variável de ambiente
nesta alteração.

Evidências em [evidencias/criacao-eventos](evidencias/criacao-eventos): cabeçalho e categoria, modal de mapa,
detalhamento de taxas, capa, animação e localização em 390 px. Foram usados apenas usuários, organização e evento
temporários no banco local, removidos após a verificação.

## Testes

O ciclo Red → Green foi aplicado à validação física, consulta de CEP, máscara monetária, navegação por tabs, mapa, ajuda
de grupos, estado vazio, modal de taxas, capa na revisão e confirmação após navegação. As regressões de consulta
repetida, resposta antiga e preservação do endereço foram reproduzidas antes da correção.

Arquivos de teste criados ou atualizados:

- `packages/contracts/src/event-location.test.ts`
- `apps/api/test/postal-code.test.ts`
- `apps/web/src/app/admin/eventos/novo/page.test.tsx`
- `apps/web/src/app/admin/eventos/novo/_components/{EventCreationWizard.edit.test.tsx,WizardProgressBar.test.tsx,validation.test.ts,wizard-content.test.ts}`
- `apps/web/src/app/admin/eventos/novo/_components/steps/{LocationStep.test.tsx,ReviewStep.test.tsx}`
- `apps/web/src/components/ui/currency-input.test.tsx`
- `apps/web/src/components/location/usePostalCode.test.tsx`
- `apps/web/src/components/map/{EventLocationMap.test.tsx,EventLocationPicker.test.tsx}`
- `apps/web/src/features/tickets/components/{TicketFormSheet.test.tsx,TicketFeeSummary.test.tsx,TicketGroupingEditor.test.tsx,TicketList.test.tsx}`
- `apps/web/src/features/fees/components/FeeCalculator.test.tsx`
- `apps/web/src/hooks/usePublicFees.test.tsx` (realocado para a camada compartilhada)
- `apps/web/src/features/event-creation/components/EventCreatedFeedback.test.tsx`

Comandos de verificação: `pnpm lint`, `pnpm test:coverage` nos contratos e na API, suíte web com cobertura e dois
workers, `tsc --noEmit`, builds de contratos/API e build Next em cópia isolada, além da navegação real com Playwright.

Resultado final: **1.903 testes aprovados** (269 contratos, 759 API e 875 frontend). Lint, verificação de tipos e builds
concluídos.

| Pacote    | Statements | Branches | Funções | Linhas |
| --------- | ---------- | -------- | ------- | ------ |
| Contratos | 97,58%     | 93,53%   | 99,01%  | 98,75% |
| API       | 77,17%     | 72,45%   | 80,44%  | 79,27% |
| Frontend  | 71,64%     | 64,24%   | 72,61%  | 73,11% |

Os comandos de cobertura da API e do frontend retornam falha pelos limites globais, apesar de todos os testes aprovados:
a API exige 83,5% de branches; o frontend exige 76,5% de statements/linhas, 79,1% de branches e 78,5% de funções.

Os limiares de cobertura não foram reduzidos. Os contratos elevaram a catraca para 97,5% de statements, 93,5% de
branches e 99% de funções. Os limites globais de cobertura da API e do frontend já não eram atingidos antes desta
alteração; as coberturas medidas aumentaram.
