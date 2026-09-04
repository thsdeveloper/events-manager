# Events Manager: instruções para o Claude Code

@AGENTS.md

## Como trabalhar neste repositório

Este projeto é desenvolvido com **TDD obrigatório** em todos os pacotes
(`apps/api`, `apps/web`, `packages/contracts`). Qualquer pedido que altere
comportamento (funcionalidade, correção, refatoração) é executado no ciclo
Red → Green → Refactor descrito em `AGENTS.md`, com as receitas de
`docs/TDD.md`. Não existe a opção de "implementar agora e testar depois".

### Fluxo que o agente segue em cada pedido

1. Antes de escrever código de produção, diga qual comportamento vai testar e
   em qual arquivo de teste.
2. Escreva o teste, rode-o com `pnpm vitest run <arquivo>` no pacote e mostre
   que falha pelo motivo esperado.
3. Implemente o mínimo, rode o mesmo teste e mostre que passa.
4. Refatore se necessário e rode `pnpm test` no pacote.
5. Ao concluir, informe os comandos executados, os arquivos de teste criados ou
   alterados e o resultado da suíte. Se algum teste ficou vermelho, diga qual e
   por quê; não entregue como concluído.

Para uma tarefa com vários comportamentos, repita o ciclo por comportamento em
passos pequenos, em vez de escrever todos os testes e depois todo o código.

### Atalhos

- `/tdd <descrição da tarefa>` invoca a skill que guia o ciclo passo a passo.
- Ambiente de teste da API: `apps/api/test/support/`. Do front:
  `apps/web/src/test/` (importe de `@/test`).
- Padrão de projeto no front: `*.test.ts` roda em Node; `*.test.tsx` roda em
  jsdom com Testing Library; `*.ssr.test.tsx` roda em Node sem DOM.

### O que não fazer

- Não criar código de produção sem um teste vermelho que o justifique.
- Não usar `it.skip`, `it.only` ou apagar testes para "fazer passar".
- Não reduzir limiares de cobertura em `vitest.config.ts`.
- Não depender de Supabase, SMTP, AbacatePay ou OpenAI reais em testes.
- Não fazer commit ou push sem pedido explícito da pessoa usuária.
