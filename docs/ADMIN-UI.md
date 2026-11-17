# Interface administrativa com shadcn/ui

A área do organizador (`/admin`) e a administração da plataforma (`/super-admin`, incluindo o CMS) usam os componentes locais de `apps/web/src/components/ui`. A configuração da biblioteca está em `apps/web/components.json`.

## Componentes e composição

- Navegação: `SidebarProvider`, `Sidebar`, `SidebarMenuButton` e `SidebarTrigger`. Em telas pequenas, o menu usa `Sheet`, fecha ao navegar e mantém o controle de foco do Radix.
- Formulários: `Input`, `Textarea`, `Label`, `Checkbox`, `RadioGroup`, `Select`, `NativeSelect`, `Switch` e `Form`. Os nomes dos campos e os corpos enviados à API foram preservados. O filtro GET de organizadores usa `NativeSelect` para continuar funcionando no servidor.
- Listagens: `Table`, TanStack Table, `Badge` e `Pagination`. A seleção parcial de participantes aparece como indeterminada; paginação e tamanho da página continuam operacionais no celular.
- Conteúdo e estados: `Card`, `Alert`, `Skeleton`, `Progress`, `Collapsible`, `Button`, `Dialog`, `Sheet`, `Tooltip` e menus. `SectionCard`, `FormSection` e outros componentes de domínio compõem essas primitivas.
- Gráficos: `ChartContainer`, `ChartTooltipContent` e `ChartLegendContent`, com Recharts e cores do tema. Tiptap, Leaflet, upload e recorte de imagens continuam responsáveis por suas funções específicas; seus controles usam a mesma UI.

`sidebar` e `use-mobile` vêm do registro oficial `default` do shadcn/ui; `chart` e `native-select` vêm do registro `new-york-v4`, adaptados ao Tailwind 3 e Recharts 3 instalados. Fontes: [Sidebar](https://ui.shadcn.com/docs/components/sidebar), [Chart](https://ui.shadcn.com/docs/components/chart), [Native Select](https://ui.shadcn.com/docs/components/native-select). O shadcn/ui distribui o código dos componentes sob a [licença MIT](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md).

Use as variantes e os tokens semânticos (`background`, `card`, `primary`, `muted`, `border`) ao criar controles. Preserve a paleta e o raio de borda configurados no projeto. A paginação é um componente cliente porque utiliza as variantes do botão, que mantém estados de ação assíncrona.

## Validação

Comandos executados com pnpm 10.14 via Corepack:

```sh
corepack pnpm --filter @events-manager/web lint
corepack pnpm --filter @events-manager/web exec tsc --noEmit
corepack pnpm --filter @events-manager/web test:coverage
corepack pnpm --filter @events-manager/contracts test
corepack pnpm --filter @events-manager/api test
corepack pnpm build
```

Regressões cobertas: navegação móvel e conta do usuário, seleção e paginação de participantes, envio dos campos de edição de evento, indicador de progresso, gráficos vazios e tamanho de página da tabela. Os limites de cobertura foram elevados para 54% de linhas/statements e 76% de funções, mantendo 76% de branches.

As capturas abaixo usam Chromium e uma API local com dados fictícios, sem Supabase ou gateway real. A conferência cobre os layouts desktop (1440px), móvel (390px), temas e interações de navegação. Não substitui uma homologação com dados de produção. Não há migrations, novas variáveis de ambiente ou mudanças nos contratos HTTP.

## Evidências visuais

- [Dashboard do organizador](ui/organizer-dashboard.png)
- [Edição de evento](ui/event-edit.png)
- [Navegação móvel](ui/mobile-navigation.png)
- [Eventos no celular](ui/mobile-events.png)
- [CMS e tema escuro](ui/cms-dark.png)
- [Listagem e paginação do CMS](ui/cms-pages.png)
- [Administração da plataforma](ui/platform-overview.png)
- [Análises](ui/analytics.png)
- [Participantes](ui/participants.png)
- [Financeiro](ui/finance.png)
- [Configurações do organizador](ui/settings.png)
