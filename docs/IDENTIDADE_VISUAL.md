# Identidade visual da Flouvi

A referência é o `Guia-da-marca.pdf` do Kit Flouvi. A interface usa DM Sans variável, hospedada em
`apps/web/public/fonts` com a licença OFL, e carregada por `next/font/local` com `display: swap`.

## Padrão visual

- Violeta `#743DF5`: ações principais com texto branco.
- Ameixa `#231A33`: texto no tema claro e fundo no tema escuro.
- Névoa `#F3EEFF`: superfícies suaves e texto sobre ameixa.
- Branco `#FFFFFF`: superfícies principais e contraste sobre ações.
- Damasco `#FFD09D`: preservado na assinatura inversa e nos detalhes do kit.

Os tokens ficam em `apps/web/src/styles/globals.css`. O tema escuro usa tons derivados de ameixa e violeta para manter
contraste; links têm um token próprio, mais claro sobre fundos escuros. Os painéis administrativos preservam o tema
neutro padrão do Shadcn.

`Headline` centraliza a escala: títulos principais de 30–36 px, títulos de seção de 24–30 px, subtítulos de 20–24 px,
peso 600. Cards usam 18–20 px. Textos continuam em 14–16 px, com entrelinha confortável. O mesmo DM Sans é usado em
títulos e corpo. Conteúdo editorial mantém sua hierarquia e ênfase.

`Container` define a largura e as margens compartilhadas com header e footer. `PageBuilder` aplica esse container a
todos os tipos de bloco, incluindo páginas novas. O fundo escuro escolhido no CMS é uma superfície local e não muda o
tema do restante da página.

## Cadastro no superadmin

Em `/super-admin/identidade-visual`:

| Campo                   | Formatos                           | Uso                                                                              |
| ----------------------- | ---------------------------------- | -------------------------------------------------------------------------------- |
| Logo clara e escura     | SVG, até 5 MB                      | Header, footer e telas de acesso; sem recorte ou rasterização                    |
| Favicon padrão e escuro | SVG, PNG ou ICO quadrado, até 5 MB | Abas/favoritos; versão escura selecionada pela preferência de cores do navegador |
| Ícone padrão            | PNG de 1024 × 1024, até 5 MB       | Manifesto web e Apple Touch Icon                                                 |
| Ícones escuro e tonal   | PNG de 1024 × 1024, até 5 MB       | Variantes disponíveis para integração com aplicativos nativos                    |

Os ícones escuro e tonal não são selecionados automaticamente pelo manifesto web. Um app iOS deve integrar essas imagens
em seu catálogo de recursos, conforme o kit. Os PNGs originais são preservados, incluindo a transparência da variante
escura.

Uploads passam por `POST /api/super-admin/settings/branding/assets?kind=logo|favicon|app-icon`, restrito a superadmins
ativos. O servidor valida o conteúdo, rejeita SVG ativo ou com recursos externos e registra o tipo de uso da mídia.
`PATCH /api/super-admin/settings/branding` aceita alterações parciais e `null` para remoção. Logos raster já cadastradas
continuam funcionando até serem substituídas.

Salvar invalida o cache de identidade visual. Os ícones aparecem nos metadados do site e em `/manifest.webmanifest`.
Arquivos enviados continuam na biblioteca de mídia; substituir uma referência não apaga automaticamente um arquivo que
pode estar sendo usado em outro lugar.

A migration `202611170002_branding_assets.sql` adiciona quatro referências opcionais em `site_settings`, com índices e
`ON DELETE SET NULL`, e permite ICO no bucket de mídia. Não há novas variáveis de ambiente.
