# Assets do PDF de ingresso

Arquivos locais usados pelo gerador de PDF da API, inclusive no build em `dist`.
O pacote de produção deve incluir este diretório `assets/tickets`.

- `flouvi.png`: rasterização de `apps/web/public/images/logo.svg`, com largura de 480 px e transparência.
- `dm-sans-regular.ttf` e `dm-sans-bold.ttf`: instâncias estáticas (pesos 400 e 700) da fonte
  `apps/web/public/fonts/dm-sans-latina.woff2`, geradas com FontTools (`instantiateVariableFont`),
  fixando os demais eixos nos valores padrão. A licença original acompanha os arquivos.

A conversão é feita ao preparar os assets; a aplicação não precisa de Python, fontes do sistema,
acesso à internet ou ao frontend para gerar o anexo.
