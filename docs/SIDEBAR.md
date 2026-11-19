# Sidebar dos painéis

## Estrutura encontrada e plano

Os painéis organizacional e da plataforma já usam `SidebarProvider`, com estado desktop em cookie e Sheet no celular.
O componente local deriva da implementação Radix do Shadcn, e os menus usam apenas parte dos elementos disponíveis.
Base UI já faz parte das dependências; o projeto utiliza Tailwind 3 e mantém componentes Shadcn compartilhados.

A atualização segue a [composição Sidebar Base UI](https://ui.shadcn.com/docs/components/base/sidebar), adaptando a
composição `render` com `useRender` e `mergeProps` sem substituir globalmente os controles do design system.

1. Completar o componente com composição Base UI, slots, controles acessíveis e persistência do provider.
2. Aplicar grupos, ações, contadores e submenus nos dois painéis; todos os destinos continuam filtrados pelo IAM.
3. Manter submenus acessíveis em modo de ícones através de menu flutuante e fechar o painel móvel após navegar.
4. Validar com testes de comportamento, navegador desktop/celular, TypeScript, lint, cobertura e build.

Não há mudanças de API, schema, credenciais ou autenticação.
