---
name: tdd
description: Executa uma tarefa de desenvolvimento neste repositório seguindo o ciclo TDD (Red → Green → Refactor) com os helpers e convenções do Events Manager. Use para qualquer funcionalidade, correção de bug ou refatoração na API, no front ou nos contratos.
---

# Ciclo TDD do Events Manager

Você vai executar a tarefa descrita em `$ARGUMENTS` (ou a tarefa em discussão)
usando estritamente o ciclo abaixo. Leia `docs/TDD.md` se ainda não conhecer
as receitas da camada envolvida.

## 1. Planejar comportamentos

Liste, em uma frase cada, os comportamentos observáveis que a tarefa exige.
Para cada um, decida o nível e o arquivo de teste:

| Camada | Arquivo | Ambiente |
| --- | --- | --- |
| Schema Zod compartilhado | `packages/contracts/src/<módulo>.test.ts` | Node |
| Caso de uso da API | `apps/api/test/<área>.test.ts` | Node, dublês de porta (`partialMock`) |
| Rota da API | `apps/api/test/<área>.test.ts` | `buildRouteTestApp` + `createSupabaseClientsStub` + `app.inject` |
| Função pura do front | `apps/web/src/**/<módulo>.test.ts` | Node |
| Hook ou componente | `apps/web/src/**/<Módulo>.test.tsx` | jsdom, `renderWithProviders` / `renderHookWithProviders`, `mockFetch` |
| Render no servidor | `apps/web/src/**/<Módulo>.ssr.test.tsx` | Node sem DOM |

Rotas novas precisam de sucesso, validação (422) e autorização (401/403).

## 2. Para cada comportamento, nesta ordem

1. **Red**: escreva um único `it` cujo nome descreve a regra. Rode
   `pnpm vitest run <arquivo>` dentro do pacote. Confirme que falha porque a
   regra não existe (não por import quebrado). Mostre a saída resumida.
2. **Green**: implemente o mínimo que faz esse `it` passar. Rode o arquivo de
   novo e mostre que passou.
3. **Refactor**: melhore nomes, remova duplicação, respeite as camadas
   (`application` sem framework; segredos só na API). Rode `pnpm test` no
   pacote.

Não avance para o próximo comportamento com a suíte vermelha.

## 3. Encerrar

- Rode `pnpm test` e `pnpm lint` no(s) pacote(s) alterado(s).
- Se cobriu um módulo antes descoberto, eleve o limiar em `vitest.config.ts`.
- Relate: comandos executados, arquivos de teste criados/alterados, resultado
  final da suíte, e qualquer comportamento que ficou de fora e por quê.

## Regras fixas

- Dublês só em portas e rede. Nunca mocke o módulo sob teste.
- Sem `it.skip`, `it.only` ou testes removidos para passar.
- Sem serviços reais (Supabase, SMTP, AbacatePay, OpenAI) em testes.
- Sem commit ou push sem pedido explícito.
