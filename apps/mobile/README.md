# Flouvi para clientes

Aplicativo Expo SDK 58 / React Native 0.88, dedicado a quem compra e recebe ingressos. Usa a mesma conta, eventos e API
do site. Não contém funcionalidades administrativas.

## Desenvolvimento

Na raiz, `pnpm install` e `pnpm dev:mobile`. Para acessar fora da rede local, `pnpm mobile:preview` inicia o Metro com
túnel e mostra o QR Code para Expo Go. O telefone precisa do Expo Go compatível com SDK 58.

As URLs públicas padrão apontam para o desenvolvimento publicado. Para usar uma API local, copie `.env.example` para
`.env.local` e informe um endereço acessível pelo telefone; `localhost` no telefone não é o computador. Nunca coloque
chaves do Supabase, Resend ou gateways em variáveis `EXPO_PUBLIC_*`.

`pnpm --filter @events-manager/mobile web` abre uma prévia visual em 8082. O CORS da API deve autorizar a origem dessa
prévia para chamadas no navegador; essa restrição de navegador não existe no aplicativo nativo. A sessão da prévia web
fica somente em memória e não sobrevive ao recarregamento.

## Publicação de teste

Projeto: [thsdeveloper/flouvi-cliente](https://expo.dev/accounts/thsdeveloper/projects/flouvi-cliente). Identificador:
`8e8f295f-1517-4574-8f39-3c9fd83077e8`.

`pnpm mobile:update --message "Descrição da atualização" --non-interactive` publica na branch `preview`, usando o
ambiente EAS `preview`. A CLI é executada com versão fixa via `pnpm dlx`, sem entrar nas dependências do aplicativo.

A configuração de teste utiliza `sdkVersion: 58.0.0`, sem `runtimeVersion`, para compatibilidade com Expo Go. Não
execute `eas update:configure` sobre esta configuração sem revisar o resultado: ele acrescenta `runtimeVersion`, que
exige um binário próprio. Antes de distribuição em lojas, configure uma política de runtime e faça builds assinados. Não
há submissão a lojas neste fluxo.

## Experiência

- Descoberta e busca paginada, detalhes de evento, imagem sem corte, mapa, vídeo, compartilhamento e outros eventos da
  organização.
- Cadastro, confirmação de e-mail por código, login e recuperação de senha.
- Favoritos locais, separados por conta, contendo apenas dados públicos.
- Carteira agrupada por compra, situação do pagamento e parcelas do Pix.
- QR individual somente para ingressos confirmados, quitados e nominais. O cliente apresenta o código; a equipe
  autorizada registra o check-in.
- Dados, CPF e confirmação de telefone por SMS no formulário seguro existente.
- Preferências de e-mail nativas; alterações só são confirmadas após a API salvar.

Checkout, gestão completa da compra/PDF e edição dos dados pessoais abrem o site responsivo em uma WebView dentro do
app. Isso preserva as validações de CPF/senha, SMS, participantes, cartão, boleto e Pix já implementadas. Ao fechar, os
dados da conta e da carteira são atualizados. Nenhuma compra de teste é confirmada automaticamente pelo aplicativo.

## Arquitetura e segurança

`src/app` contém somente rotas Expo Router. `features` concentra componentes e regras por funcionalidade; `shared`
fornece API, armazenamento e identidade visual. Os contratos são importados apenas como tipos: a API mantém a validação
Zod autoritativa, sem carregar módulos de servidor no bundle nativo.

O cliente nativo usa `/api/auth/mobile/login`, `/register`, `/register/confirm` e `/refresh`. Access e refresh tokens
ficam separados no Expo SecureStore; renovações simultâneas compartilham uma única chamada. Logout limpa as credenciais
e o cache privado. Nenhum segredo privilegiado ou cliente de banco vai ao app.

`POST /api/auth/mobile/web-session` recebe uma credencial explícita e um destino permitido. A API verifica a identidade
e cria uma sessão independente para a WebView. A prova de acesso é gerada e consumida no servidor, sem enviar e-mail. Os
cookies são HttpOnly; o token nativo não aparece na URL e seu refresh token não é compartilhado com o navegador. A
WebView usa sessão isolada. Os endpoints de navegador existentes continuam retornando apenas cookies, sem tokens JSON.

Imagens usam cache do Expo Image, busca tem debounce, listas são virtualizadas, e o React Query limita chamadas e
atualiza os dados ao retomar o aplicativo. Não há carteira offline nem notificações push nesta versão.

## Validação

```sh
pnpm --filter @events-manager/mobile test
pnpm --filter @events-manager/mobile test:coverage
pnpm --filter @events-manager/mobile lint
pnpm --filter @events-manager/mobile build
cd apps/mobile && pnpm dlx expo-doctor
```

Jest Expo + React Native Testing Library cobrem formulários, mensagens de erro, preferências, elegibilidade do QR,
parcelas, navegação segura e concorrência da renovação de sessão. A API cobre transporte nativo e a sessão da WebView
com Vitest em `auth.test.ts` e `mobile-browser.test.ts`. Nenhum teste unitário envia e-mail ou acessa gateways/bancos
reais. A integração completa deve ser validada no Expo Go com a conta de teste antes da distribuição aos clientes.

O override de Zod é restrito ao MCP da Expo e seu túnel para evitar a dependência vulnerável reportada no
GHSA-mrhx-c7xc-m3w5. Os contratos/API mantêm sua versão.

Os arquivos de marca são do Kit Flouvi. A licença da fonte DM Sans acompanha os arquivos em `assets/OFL-DM-Sans.txt`.
