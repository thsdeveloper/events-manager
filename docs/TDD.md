# Desenvolvimento orientado a testes (TDD)

Este documento é a referência completa de como o Events Manager é desenvolvido.
As regras curtas e obrigatórias estão em [`AGENTS.md`](../AGENTS.md); aqui ficam
as receitas por camada, os helpers disponíveis e a política de cobertura.

## 1. Princípios

1. **Todo comportamento nasce de um teste.** Funcionalidade nova, correção de
   bug e refatoração começam por um teste que descreve o resultado esperado.
2. **Ciclo Red → Green → Refactor**, sempre nessa ordem e em passos pequenos:
   - **Red**: escreva um teste que falha pelo motivo certo (a regra ainda não
     existe). Rode-o e leia a falha antes de seguir.
   - **Green**: escreva o mínimo de código que faz o teste passar. Nada além.
   - **Refactor**: melhore nomes, elimine duplicação e ajuste a arquitetura com
     a suíte verde. Rode a suíte do pacote ao final.
3. **Teste comportamento, não implementação.** O nome do `it` descreve uma regra
   de negócio ou uma experiência observável. Assertivas em detalhes internos
   (ordem de chamadas irrelevante, nomes de classes CSS, estado privado) quebram
   sem valor e são evitadas.
4. **Dublês só na borda.** A API substitui as portas (interfaces de repositório
   e gateway); o front substitui a rede (`fetch`) e módulos do Next que exigem
   runtime. Nunca mocke o próprio código sob teste.
5. **Sem rede, sem banco, sem relógio real** no ciclo interno. Supabase, SMTP,
   AbacatePay e OpenAI entram apenas via dublês; datas usam valores fixos ou
   timers falsos.
6. **Cobertura é catraca, não meta.** Os limiares refletem o valor medido e só
   sobem. Um PR não pode reduzir cobertura; um PR que cobre um módulo antes
   descoberto eleva o limiar.

## 2. Pirâmide e taxonomia

| Nível | Onde | Ferramenta | Quando escrever |
| --- | --- | --- | --- |
| Contrato | `packages/contracts/src/*.test.ts` | Vitest | Toda regra de validação Zod compartilhada |
| Unitário API | `apps/api/test/*.test.ts` | Vitest + dublês de porta | Todo caso de uso em `src/application` |
| Rota API | `apps/api/test/*.test.ts` | Vitest + `app.inject` + Supabase falso | Toda rota: sucesso, validação (422) e autorização (401/403) |
| Arquitetura | `apps/api/test/architecture.test.ts` | Vitest (análise de fonte) | Toda fronteira nova entre camadas |
| Unitário web | `apps/web/src/**/*.test.ts` (projeto `unit`) | Vitest, ambiente Node | Funções puras, formatadores, schemas, utilitários |
| SSR web | `apps/web/src/**/*.ssr.test.tsx` (projeto `unit`) | `renderToStaticMarkup` sem DOM | Componentes que precisam renderizar no servidor sem tocar `window` |
| Componente/hook web | `apps/web/src/**/*.test.tsx` (projeto `dom`) | Vitest + jsdom + Testing Library | Componentes, hooks, formulários, integração com React Query |
| Aceitação (E2E) | `testsprite_tests/`, Playwright | Navegador real | Fluxos críticos ponta a ponta; complementa, não substitui, o ciclo TDD |

O ciclo interno de TDD acontece nos níveis Contrato, Unitário, Rota e
Componente. E2E não faz parte do ciclo Red → Green → Refactor.

## 3. Comandos

```bash
pnpm test                 # todas as suítes (contracts, api, web)
pnpm test:api             # só a API
pnpm test:web             # só o front
pnpm test:contracts       # só os contratos
pnpm test:coverage        # cobertura com limiares (catraca)

# Dentro de apps/api, apps/web ou packages/contracts
pnpm test:watch           # modo watch, roda ao salvar
pnpm test:tdd             # watch com reporter compacto (api e web)
pnpm vitest run caminho/do/arquivo.test.ts   # um arquivo
pnpm vitest run -t "nome do it"              # um caso
```

## 4. Receitas: API (`apps/api`)

A API é organizada em camadas: `src/application` (casos de uso e portas),
`src/infrastructure` (Supabase, e-mail, pagamentos), `src/routes` (Fastify,
Zod, RFC 7807) e `src/shared`.

Helpers em `apps/api/test/support/`:

| Helper | Uso |
| --- | --- |
| `createTestEnv(overrides)` / `TEST_ENV` | `ApiEnv` determinístico; não repita o objeto de ambiente nos testes |
| `partialMock<T>(obj)` | Dublê parcial tipado como a porta; métodos ausentes lançam e denunciam caminhos não previstos |
| `fakePort<T>([...métodos])` | Dublê completo com `vi.fn()` por método |
| `buildRouteTestApp(plugin, options)` | Fastify mínimo com cookies e handler RFC 7807; use `app.inject` |
| `sessionCookie(token)` | Header `cookie` com `access_token` para rotas autenticadas |
| `createSupabaseClientsStub({ tables, user, rpc })` | `SupabaseClients` falso; `from(tabela)` devolve um builder encadeável que resolve o resultado configurado |
| `fakeQueryBuilder(result)` | Builder encadeável avulso para testar repositórios com lógica própria |
| `TEST_USER_ID`, `TEST_ORGANIZER_ID`, `TEST_EVENT_ID` | UUIDs estáveis |

### 4.1 Caso de uso (unitário)

Comece definindo a porta que o caso de uso precisa; o teste a descreve antes da
implementação existir.

```ts
// test/events.test.ts
import { EventNotFound, EventService, type EventRepository } from '../src/application/events/event-service.js';
import { partialMock } from './support/index.js';

it('signals a missing event with a domain error instead of returning null', async () => {
	const repository = partialMock<EventRepository>({ findPublicBySlug: vi.fn().mockResolvedValue(null) });

	await expect(new EventService(repository).getPublicBySlug('inexistente')).rejects.toBeInstanceOf(EventNotFound);
});
```

Regras:
- Erros de domínio são classes (`EventNotFound`, `OrganizerRequired`); a rota
  os converte em `ApiError` com código estável. Teste os dois lados.
- Assertivas sobre a porta verificam **o que** foi pedido (`toHaveBeenCalledWith`)
  quando isso é a regra (ex.: escopo por organizador), não a sequência interna.

### 4.2 Rota (integração leve)

```ts
import { eventRoutes } from '../src/routes/events.js';
import { buildRouteTestApp, createSupabaseClientsStub } from './support/index.js';

it('rejects a public listing above the page size limit with a validation problem', async () => {
	const { clients } = createSupabaseClientsStub();
	const app = await buildRouteTestApp(eventRoutes, { clients });

	const response = await app.inject({ method: 'GET', url: '/api/events/public?limit=100' });
	await app.close();

	expect(response.statusCode).toBe(422);
	expect(response.json()).toMatchObject({ status: 422, title: 'VALIDATION_ERROR' });
});
```

Toda rota nova precisa de, no mínimo, três testes: **sucesso**, **validação**
(422 com `VALIDATION_ERROR`) e **autorização** (401 sem sessão; 403 quando o
papel é insuficiente). Rotas que dependem de `buildApp` completo seguem o
padrão de `test/health.test.ts`, com `vi.mock('@supabase/supabase-js')`.

### 4.3 Repositório Supabase

Repositórios são finos; teste apenas os que carregam lógica própria (seleção
explícita de colunas, sanitização, composição de filtros). Use
`fakeQueryBuilder` e verifique a chamada, como em `test/dashboard.test.ts` e
`test/payments.test.ts`. Regras de exposição de dados (nunca `select('*')` em
tabelas públicas) vivem em `test/architecture.test.ts`.

### 4.4 Arquitetura

`test/architecture.test.ts` lê o código-fonte e garante fronteiras: nenhum
cliente Supabase no front, casos de uso sem importar framework, seleções
públicas sem campos de pagamento. Ao criar uma fronteira nova, adicione a
regra ali primeiro.

## 5. Receitas: front (`apps/web`)

Configuração em `apps/web/vitest.config.ts` com dois projetos:

- `unit` (Node): `*.test.ts` e `*.ssr.test.tsx`.
- `dom` (jsdom + Testing Library): `*.test.tsx`, com `src/test/setup.ts`
  (matchers jest-dom, `cleanup`, stubs de `matchMedia`, `ResizeObserver` e
  `scrollIntoView`).

Helpers em `apps/web/src/test/` (importe de `@/test`):

| Helper | Uso |
| --- | --- |
| `renderWithProviders(ui)` | `render` com `QueryClientProvider` de teste; devolve `user` do user-event |
| `renderHookWithProviders(hook)` | `renderHook` com os mesmos providers |
| `createTestQueryClient()` | React Query sem retry, sem cache e sem atraso entre tentativas |
| `mockFetch([[padrão, handler]])` | Substitui `fetch`; URL sem correspondência falha o teste |
| `jsonResponse(body, { status })` | `Response` JSON |
| `problemResponse(status, title, detail)` | `Response` RFC 7807 como a API devolve |

### 5.1 Função pura (`*.test.ts`)

```ts
import { calculateFees } from './fees';

it('passes the platform fee to the buyer and charges the gateway on the total paid', () => {
	expect(calculateFees(100, 'passed_to_buyer', config)).toEqual({ /* valores exatos */ });
});
```

### 5.2 Hook (`*.test.tsx`)

```ts
import { act, renderHook } from '@testing-library/react';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('only exposes the latest value after the delay has elapsed without changes', () => {
	const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), { initialProps: { value: 'a' } });
	rerender({ value: 'abc' });
	act(() => vi.advanceTimersByTime(300));
	expect(result.current).toBe('abc');
});
```

### 5.3 Hook de dados (React Query + fetch)

```ts
import { waitFor } from '@testing-library/react';
import { jsonResponse, mockFetch, renderHookWithProviders } from '@/test';

it('maps the platform configuration into the fee shape used by the forms', async () => {
	mockFetch([['/api/admin/event-configurations', () => jsonResponse({ platform_fee_percentage: 7 })]]);
	const { result } = renderHookWithProviders(() => useFeeConfig());
	await waitFor(() => expect(result.current.isLoading).toBe(false));
	expect(result.current.feeConfig.platformFeePercentage).toBe(7);
});
```

### 5.4 Componente (`*.test.tsx`)

```tsx
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';

it('shows what the buyer pays and what the organizer receives', () => {
	renderWithProviders(<TicketFeeSummary price={100} serviceFeeType="passed_to_buyer" feeConfig={config} isFallback={false} />);
	expect(screen.getByText(/comprador paga/i).nextElementSibling).toHaveTextContent(/R\$\s?105,00/);
});
```

Regras:
- Localize elementos como a pessoa usuária: `getByRole`, `getByLabelText`,
  `getByText`. Evite `container.querySelector` e classes CSS.
- Interações via `user` (`await user.type(...)`, `await user.click(...)`), não
  `fireEvent`, salvo eventos que o user-event não emula.
- Módulos do Next que exigem runtime (`next/navigation`, `next/link`,
  `next/image`) são substituídos com `vi.mock` no próprio arquivo, como em
  `Footer.test.tsx`.
- Formulários: teste validação exibida, envio com dados válidos e a chamada de
  rede resultante (`fetchMock` recebeu método, URL e corpo esperados).
- Server Components assíncronos e páginas do App Router não entram no jsdom;
  extraia a lógica para funções ou componentes testáveis e cubra a página com
  E2E.

### 5.5 Currency e datas

Formatação `pt-BR` usa espaço não separável entre `R$` e o valor. Assercione
com `/R\$\s?105,00/` ou compare com `formatCurrency(105)`.

## 6. Receitas: contratos (`packages/contracts`)

Toda regra em `schemas.ts` nasce de um teste em `src/schemas.test.ts` que
verifica o `path` do issue devolvido pelo `safeParse`. O teste garante que API
e web rejeitam o mesmo dado pelo mesmo motivo.

## 7. Correção de bugs

1. Escreva um teste que reproduz o bug e falha. O nome descreve o comportamento
   correto, não o sintoma ("keeps tickets ordered by sort", não "fix bug 42").
2. Corrija com o mínimo necessário.
3. Mantenha o teste: ele é a regressão.

## 8. Refatoração

Refatorar exige suíte verde antes e depois. Se a refatoração muda uma porta,
atualize primeiro o teste que descreve a porta, veja-o falhar e então mova o
código. Sem teste cobrindo o trecho, escreva-o antes (teste de caracterização).

## 9. Nomes e organização

- Arquivo: `<módulo>.test.ts(x)` ao lado do código no front e em
  `packages/contracts`; em `apps/api/test/<área>.test.ts`, com helpers em
  `test/support/`. Testes colocados em `apps/api/src/**/*.test.ts` também são
  aceitos e não vão para `dist`.
- `describe` nomeia a unidade (`EventService`, `useFeeConfig`, `event routes`).
- `it` é uma frase no presente que descreve a regra: "requires an active
  organizer profile", "falls back to the published defaults when the request
  fails". Mensagens em inglês seguem o padrão já existente; mensagens de
  produto continuam em português.
- Um `it` cobre um comportamento. `it.each` para tabelas de casos.
- Sem `it.skip`, `it.only` ou `xit` em código commitado.

## 10. Política de cobertura

- `pnpm test:coverage` falha abaixo dos limiares de `vitest.config.ts` de cada
  pacote. Os limiares são catraca: valem o número medido e só sobem.
- Ao cobrir um módulo antes descoberto, eleve o limiar correspondente no mesmo
  PR.
- Reduzir um limiar exige justificativa explícita no PR.

## 11. Anti-padrões

| Evite | Prefira |
| --- | --- |
| Escrever o código e "adicionar testes depois" | Teste primeiro, código mínimo, refatoração |
| Mockar o módulo sob teste | Dublê apenas nas portas e na rede |
| `expect(fn).toHaveBeenCalled()` sem verificar argumentos quando eles são a regra | `toHaveBeenCalledWith` com o escopo esperado |
| Snapshot de HTML inteiro | Assertivas de texto, papel e estado acessível |
| Testes que dependem de `Date.now()` | `vi.useFakeTimers()` ou datas fixas |
| Teste que só passa com Supabase rodando | Dublês; integração real fica no E2E |
| Vários comportamentos em um `it` | Um `it` por regra |

## 12. Checklist de entrega

- [ ] Cada comportamento novo ou alterado tem teste escrito antes do código.
- [ ] Vi o teste falhar pelo motivo esperado antes de implementar.
- [ ] Rotas novas têm sucesso, validação e autorização cobertos.
- [ ] `pnpm test` verde no pacote alterado; `pnpm lint` verde.
- [ ] Cobertura não regrediu (`pnpm test:coverage`).
- [ ] PR lista os comandos executados e os arquivos de teste tocados.
