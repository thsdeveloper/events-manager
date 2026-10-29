# Eventos independentes e publicação

O painel em /admin/eventos gerencia vários eventos por organizador. Cada evento mantém sua própria página em
/eventos/[slug], configuração de ingressos, lotes, participantes e página personalizada. A criação e a edição usam o
mesmo assistente em etapas.

## Visibilidade

Na etapa **Ingressos e publicação**, escolha:

- **Público**: depois de publicado, aparece no catálogo, busca, blocos de eventos do CMS e sitemap.
- **Não listado**: depois de publicado, pode ser aberto pelo link direto. Não aparece nas listagens acima e sua página
  solicita que buscadores não a indexem. Qualquer pessoa com o link pode acessar e se inscrever; não exige convite.

A visibilidade é independente do status. Rascunhos, eventos cancelados e arquivados continuam indisponíveis na página
pública. Eventos que já existiam recebem visibilidade pública na migração. A edição preserva a escolha salva.

## Criação com ingressos

As regras de quantidade mínima/máxima por compra, período de vendas, parcelamento e preços válidos são compartilhadas
pelos contratos da API. Ingressos enviados com o evento passam pelas mesmas regras dos ingressos cadastrados
separadamente.

Quando a criação solicita publicar um evento com ingressos, a API salva primeiro um rascunho, cria todos os ingressos e
só então muda o status para publicado. Uma falha de criação ou publicação tenta remover o evento incompleto. Se essa
remoção também falhar, o registro fica em rascunho e não aparece ao público.

## Banco e execução

A migração **202610290001_event_visibility.sql** adiciona a coluna de visibilidade, o índice de catálogo e as políticas
de leitura. Ela deve ser aplicada antes de executar a nova versão da API.

Com o Supabase local ativo, na pasta do projeto no WSL:

```sh
pnpm exec supabase migration up --local
pnpm --filter @events-manager/contracts build
pnpm dev:apps
```

Isso aplica as migrações locais pendentes sem recriar o banco. Para um banco remoto, use o procedimento de implantação
do projeto e confira as migrações pendentes antes de aplicá-las.

A alteração de status protege a publicação normal durante a requisição, mas não substitui uma transação entre evento e
ingressos: a interrupção do processo pode deixar um rascunho incompleto para o organizador revisar. Não foram executadas
migrações, cobranças ou chamadas a serviços reais durante a verificação.

## Verificação

Foram acrescentados testes nos contratos, no serviço de eventos, nas consultas públicas, na validação do assistente, na
criação/edição pelo formulário e nos metadados da página pública. Execute os comandos da raiz:

```sh
pnpm test
pnpm lint
pnpm test:coverage
```

### Testes de regressão alterados ou adicionados

- `packages/contracts/src/schemas.test.ts`
- `apps/api/test/events.test.ts`
- `apps/api/test/event-visibility.test.ts`
- `apps/web/src/app/admin/eventos/novo/_components/validation.test.ts`
- `apps/web/src/app/admin/eventos/novo/_components/EventCreationWizard.edit.test.tsx`
- `apps/web/src/app/(event)/eventos/[slug]/page.test.ts`

A verificação foi executada em uma cópia temporária no Windows, preservando as dependências instaladas no WSL. Foram
usados `vitest run --coverage`, `tsc --noEmit`, o build TypeScript da API/contratos e `next build` para a interface. Na
suíte completa da interface, o Vitest usou `--pool=threads --maxWorkers=4 --testTimeout=60000`. Esses ajustes ficaram
apenas na execução temporária.
