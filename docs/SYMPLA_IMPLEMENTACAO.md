# Funcionalidades de criação de eventos: análise Sympla e implementação

## Escopo e origem

O REA foi usado para estudar o JavaScript público da área do organizador da Sympla. As regras observáveis foram
implementadas na arquitetura existente do Events Manager, com contratos compartilhados, API, interface e migração
própria. O REA não é uma dependência de execução do produto.

Artefato analisado: `https://organizador.sympla.com.br/dist/js/create_event_bundle.js`. SHA-256:
`83f04fc66ff48b344d4fd27e930adbef3910df9451583fb3bb7cf4482158ac6b`. O inventário encontrou 924 módulos; 14 foram
selecionados, 12 analisados por inteiro e quatro métodos dos outros dois analisados separadamente. É uma análise
estática parcial: não recupera o servidor, banco ou regras privadas da Sympla e não demonstra seus fluxos completos de
pagamento.

Os relatórios de origem desta sessão estão em `C:/Users/thspe/.codex/tools/rea/temp/sympla/`, em especial
`sympla-analise-por-partes.md` e `sympla-evidencias-resumo.json`.

## Rastreabilidade

| Comportamento observado                                                                | Evidência REA                                                                                                                                | Implementação neste projeto                                                                                                                                                 |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rascunho incompleto, prévia, publicar e retirar publicação                             | `ev_38cc295df2555aaddd434cd48aa7d7e4bcd6471a426ae2d1f77ecfd409c0d1b8`                                                                        | Snapshots no servidor com etapa atual; retomada; prévia sem compra; confirmação de publicação e retirada; invalidação das páginas e catálogo.                               |
| Quantidade mínima/máxima, período de venda e meia-entrada com preço e estoque próprios | `ev_5721c4b9222290f11209e495d6cc59940d6915f83ef2624a2b2fade0630b44f0`                                                                        | Regras compartilhadas nos contratos e formulário; tipo de ingresso inteira/meia-entrada e estoque separado. As regras de período e quantidade já existiam e foram mantidas. |
| Taxa percentual e mínima configuradas pelo servidor                                    | `ev_a04bd691bb23d328e311dfbb596d934461ce30028c2856321ba4af339b8e1563`                                                                        | Taxa mínima por unidade paga na configuração do superadmin, resumo, checkout, cupons e parcelamento; eventos gratuitos com taxa zero.                                       |
| Grupos, subgrupos e ordem dos ingressos                                                | `ev_c6bf45050a57b9c762efdbc56ac4bb8d81536a1b49e4168c51df35dc34eb769f`                                                                        | Editor de grupos de até dois níveis, associação ao ingresso, movimentação acessível e ordenação persistida atomicamente.                                                    |
| Endereço estruturado, local a definir, mapa e plataforma online                        | `ev_90bf276ea0d77e50a499a87a81bd30a8a445d3186fde646cc47265f115ddd5dd`                                                                        | Campos de endereço, controles de local/mapa, seleção de plataforma e validação sintática do endereço eletrônico.                                                            |
| Capa, descrição traduzida e dados do produtor                                          | `ev_f7ff33fd67e50577eaccb95ab258b21653bf6cb9dfa6d4f2a3326128c2542856`                                                                        | Texto alternativo da capa, descrições PT/EN/ES com idioma e fallback; sanitização de HTML. Cadastro e aprovação do organizador aproveitam o modelo já existente.            |
| Separação dos serviços e validação/envio                                               | `ev_718e3f025ef5325a2a16324fc4611a967e0fd36958f5d7b9fc3c3ccf3a61b178`, `ev_8d5199899dc4751a03a8904b6ffa18f7fab39280a32db218586ac25c6de8c539` | Rotas autenticadas e regras próprias do Events Manager; nenhum endpoint privado da Sympla é chamado.                                                                        |

## Como usar

- Organizador aprovado: abra **Eventos → Criar evento**. É possível salvar os dados ainda incompletos e retomá-los na
  lista de rascunhos.
- Organizador com aprovação pendente: prepare e retome rascunhos em `/perfil/organizador/rascunhos`. A publicação
  depende da aprovação já usada pelo projeto.
- Na criação, configure capa, descrições, agenda, local e ingressos. Na etapa de ingressos, cadastre grupos/subgrupos e
  selecione inteira ou meia-entrada para cada tipo.
- Use a prévia antes de publicar. A prévia do assistente mostra os valores atuais sem criar um evento e sem permitir
  inscrição; a prévia de evento salvo exige acesso do organizador.
- No detalhe do evento, gerencie ingressos, grupos e ordem; confira confirmações, reservas, cancelamentos e receita
  recebida.
- Para retirar um evento do ar, use a ação de despublicar e confirme. A visibilidade pública/não listada continua
  independente do estado publicado/rascunho.
- A taxa mínima fica nas configurações de pagamento do superadmin e começa em zero para preservar o comportamento
  anterior.

## Persistência e recuperação

`/api/event-drafts` oferece listagem e criação; `/api/event-drafts/:id` oferece consulta, atualização e exclusão. Cada
rascunho pertence ao organizador autenticado, inclusive quando o usuário participa de mais de uma organização. Não são
permitidos acessos anônimos ou por outro organizador.

A conversão envia `draft_id` a `POST /api/events`. O evento nasce em rascunho; a API cria grupos e ingressos, vincula o
snapshot e só então tenta publicar. A unicidade do vínculo impede a conversão do mesmo snapshot em dois eventos. Uma
falha anterior à publicação tenta excluir apenas o evento incompleto, preservando o snapshot para recuperação.

Se a confirmação da publicação falhar, tente concluir novamente. O sistema recupera o mesmo evento e informa seu estado
atual, sem criar outro nem republicar automaticamente. Se ele continuar como rascunho, abra o evento recuperado, confira
os dados e publique pelo painel. Uma interrupção entre operações pode deixar um rascunho incompleto; não há transação
única entre todas as chamadas da API.

As tabelas novas usam RLS, chaves que impedem relações entre eventos/organizadores diferentes e validação de hierarquia.
A ordenação exige o conjunto completo de ingressos e ocorre em uma transação no banco. Sua função só pode ser executada
pela API privilegiada depois da autorização do organizador.

## Decisões próprias do Events Manager

- Taxa mínima: por unidade paga, com valor inicial zero. A taxa repassada ao comprador é somada ao preço; a absorvida é
  descontada do valor do organizador. Um ingresso pago com preço menor que sua taxa absorvida não pode ser salvo.
- Cupons: taxas da linha não podem ultrapassar o total efetivamente pago após desconto. Cupom de 100% resulta em taxa
  zero; o repasse usa o recebimento efetivo menos as taxas. Esses são critérios deste projeto, não regras privadas
  comprovadas da Sympla.
- Pedidos anteriores mantêm seus valores de preço e taxa salvos. As estimativas e novos pedidos usam a configuração
  atual; métricas usam o total efetivamente recebido.
- A URL de Zoom, YouTube, Meet, Teams ou Vimeo é verificada por formato e domínio. Isso não confirma disponibilidade,
  existência da sala ou permissão de acesso.
- A aprovação administrativa existente é a autorização para publicar. Não foi criada integração externa de KYC ou SEFAZ
  a partir de nomes encontrados no JavaScript.

## Limites conhecidos

Não representa uma cópia completa da Sympla. Convites e emissão manual não tiveram seus fluxos recuperados/implementados
nesta etapa e são indicados como indisponíveis na interface. Pagamentos, ingressos nominais, check-in, cupons e
relatórios já pertenciam ao Events Manager; foram integrados às mudanças quando necessário, sem alegar que todo o
comportamento da Sympla foi reproduzido.

## Banco e execução local

Use Node.js 22 ou superior. Com o Supabase local ativo, dentro da pasta do projeto no WSL:

```sh
pnpm db:migrate
pnpm dev:apps
```

`db:migrate` aplica somente migrações locais pendentes, sem recriar o banco. `dev:apps` compila os contratos
compartilhados antes de iniciar API e interface. A migração `202610290002_sympla_creation_features.sql` adiciona
metadados, rascunhos, grupos, classificação inteira/meia e taxa mínima; os eventos existentes recebem valores padrão
compatíveis.

O endpoint `/health` identifica ausência das estruturas novas. Erros conhecidos de banco desatualizado recebem
`DATABASE_MIGRATION_REQUIRED`, evitando uma falha interna genérica.

## Verificação

As novas regras foram desenvolvidas por ciclos Red → Green, incluindo retomada, publicação incerta, isolamento entre
organizadores, cupons de 100%, taxa mínima, grupos e ordenação. Os testes alterados/adicionados ficam nos três pacotes,
especialmente `event-creation-features.test.ts`, `event-drafts.test.ts`, `event-service-lifecycle.test.ts`,
`ticket-groups.test.ts`, `sympla-ticket-features.test.ts` e os testes do assistente e dos componentes de ingressos.

```sh
pnpm test
pnpm lint
pnpm test:coverage
pnpm build
```

Os limiares de cobertura existentes permanecem sem redução. O SQL também passou por verificações isoladas de
permissões/relações e por execução com rollback no PostgreSQL 15 local. Nenhuma cobrança ou envio de e-mail real é
necessário para validar estes fluxos.

### Resultado da integração local em 29/10/2026

A migração `202610290002` foi aplicada pelo gerenciador do Supabase no banco local, sem reset. A API em execução
confirmou banco conectado e recursos novos protegidos por autenticação; catálogo e página de taxas responderam
normalmente.

Passaram 1.286 testes: 137 nos contratos, 496 na API e 653 na interface, com os limites de cobertura originais. Também
passaram lint e compilação dos contratos/API no WSL, e a compilação de produção Next.js no espelho com as mesmas fontes
verificadas por hash. A primeira execução da interface no WSL teve um timeout em teste preexistente; a suíte completa
passou novamente com `--pool=threads --maxWorkers=4 --testTimeout=60000`, sem alterar configuração ou reduzir limiares.

A migração passou ainda por 30 verificações isoladas de permissões e integridade, além da execução com rollback no
PostgreSQL 15 antes da aplicação definitiva. Não foi realizado checkout pago nem envio real de e-mail. A verificação
visual autenticada do painel ainda pode ser feita pelo usuário após entrar na sua conta.
