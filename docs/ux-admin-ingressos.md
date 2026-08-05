# Especificação UX: Tela de Cadastro de Ingressos

**Rota:** `/admin/ingressos`
**Tipo de Usuário:** Organizadores de eventos autenticados
**Relacionamento:** Um evento pode ter vários ingressos (relação One-to-Many)

---

## 1. Visão Geral

A tela de cadastro de ingressos permite que organizadores criem, editem e gerenciem diferentes tipos de ingressos para seus eventos. Cada ingresso é único e pertence exclusivamente a um evento, podendo ter configurações distintas de preço, quantidade, período de vendas e regras de parcelamento.

---

## 2. Arquitetura da Informação

### 2.1 Estrutura da Página

```
/admin/ingressos
├── Header (Breadcrumb + Ações Principais)
├── Filtros e Busca
├── Lista de Ingressos (Tabela/Cards)
└── Modal/Drawer de Cadastro/Edição
```

---

## 3. Componentes e Layout

### 3.1 Header da Página

**Elementos:**
- **Breadcrumb:** Admin > Ingressos
- **Título:** "Gerenciar Ingressos"
- **Botão Primário:** "+ Novo Ingresso" (destaque visual, cor primária)
- **Dropdown de Ações em Massa** (opcional): Ativar/Desativar selecionados

**Comportamento:**
- Breadcrumb navegável (clicável)
- Botão "+ Novo Ingresso" abre modal/drawer de cadastro
- Se nenhum ingresso estiver selecionado, ações em massa ficam desabilitadas

---

### 3.2 Área de Filtros e Busca

**Layout:** Barra horizontal com inputs alinhados

**Filtros:**
1. **Campo de Busca** (text input)
   - Placeholder: "Buscar por nome do ingresso ou evento..."
   - Busca em: `title`, `event_id.title`
   - Ícone de lupa à esquerda

2. **Filtro por Evento** (select dropdown)
   - Label: "Evento"
   - Opções: Lista de eventos do organizador atual
   - Permite seleção múltipla (multi-select)
   - Mostra thumbnail do evento + título

3. **Filtro por Status** (segmented control / pill buttons)
   - Opções: Todos | Ativos | Esgotados | Inativos
   - Valores: `all`, `active`, `sold_out`, `inactive`

4. **Filtro por Período de Venda** (date range picker)
   - Label: "Período de venda"
   - Campos: Data inicial e final
   - Formato: DD/MM/AAAA

5. **Botão "Limpar Filtros"** (text button, secundário)

**Comportamento:**
- Filtros aplicados em tempo real (debounce de 300ms na busca)
- Indicador visual quando filtros estão ativos (badge com contagem)
- Limpar filtros restaura estado inicial

---

### 3.3 Lista de Ingressos

**Formato:** Tabela responsiva (desktop) | Cards (mobile)

#### Layout Desktop (Tabela)

**Colunas:**
1. **Checkbox** (seleção para ações em massa)
2. **Ingresso** (título + descrição curta)
   - Título em bold
   - Descrição em cinza claro (truncado em 60 caracteres)
3. **Evento**
   - Thumbnail pequeno (40x40px)
   - Nome do evento
   - Data do evento (formato: DD MMM AAAA)
4. **Disponibilidade**
   - Progress bar visual
   - Texto: "X de Y vendidos"
   - % de ocupação
5. **Preço**
   - Valor para o comprador (destaque)
   - Taxa de serviço (tooltip com explicação)
6. **Status**
   - Badge colorido
   - Verde: Ativo
   - Vermelho: Esgotado
   - Cinza: Inativo
7. **Período de Venda**
   - Data início → Data fim
   - Indicador visual se está dentro do período
8. **Ações**
   - Ícone de editar (lápis)
   - Ícone de duplicar (cópias)
   - Menu dropdown (3 pontos verticais) com:
     - Ver detalhes
     - Editar
     - Duplicar
     - Ativar/Desativar
     - Excluir (confirmação obrigatória)

**Ordenação:**
- Padrão: Data de criação (mais recentes primeiro)
- Opções: Nome (A-Z), Evento, Disponibilidade, Preço, Status, Data de venda

**Paginação:**
- 20 itens por página (padrão)
- Opções: 10, 20, 50, 100
- Navegação: Anterior | 1 2 3 ... 10 | Próximo
- Info: "Mostrando 1-20 de 150 ingressos"

#### Layout Mobile (Cards)

**Estrutura do Card:**
```
┌─────────────────────────────────────┐
│ [Thumbnail] Título do Ingresso      │
│              Nome do Evento          │
│                                      │
│ ●●●●●●●●○○ 80% vendidos             │
│ 120 de 150 disponíveis               │
│                                      │
│ R$ 50,00  [Status Badge]            │
│                                      │
│ Vendas: 01/01 - 31/12               │
│ [Editar] [Menu ⋮]                   │
└─────────────────────────────────────┘
```

---

### 3.4 Modal/Drawer de Cadastro e Edição

**Formato:** Drawer lateral (slide-in) de largura fixa (600px)

#### 3.4.1 Header do Drawer

- **Título:** "Novo Ingresso" ou "Editar Ingresso: [Nome]"
- **Ícone de fechar** (X) no canto superior direito
- **Barra de progresso** (steps indicator) - 4 etapas

#### 3.4.2 Estrutura em Abas/Steps

**Step 1: Informações Básicas** 🎫

**Campos:**
1. **Evento** (select obrigatório)
   - Label: "Para qual evento?"
   - Dropdown com busca
   - Mostra: Thumbnail + Título + Data
   - Help text: "Selecione o evento ao qual este ingresso pertence"

2. **Nome do Ingresso** (text input obrigatório)
   - Label: "Nome do ingresso"
   - Placeholder: "Ex: Ingresso Único, Meia-Entrada, VIP"
   - Max length: 100 caracteres
   - Counter: "X/100"

3. **Descrição** (textarea opcional)
   - Label: "Descrição"
   - Placeholder: "Informações adicionais sobre o ingresso (opcional)"
   - Max length: 500 caracteres
   - Counter: "X/500"
   - Help text: "Inclua detalhes sobre o que está incluso, restrições, etc."

4. **Visibilidade** (radio buttons obrigatório)
   - Label: "Quem pode comprar?"
   - Opções:
     - 🌐 **Público** - Qualquer pessoa pode comprar
     - 🔒 **Somente Convidados** - Apenas pessoas com link especial
     - ✋ **Manual** - Vendas controladas pelo organizador
   - Valor padrão: `public`

**Validações Step 1:**
- Evento obrigatório
- Nome obrigatório (mínimo 3 caracteres)

---

**Step 2: Preços e Taxas** 💰

**Campos:**
1. **Preço Base** (currency input obrigatório)
   - Label: "Preço do ingresso"
   - Prefixo: "R$"
   - Placeholder: "0,00"
   - Help text: "Valor que você deseja receber por ingresso"

2. **Taxa de Serviço** (radio buttons obrigatório)
   - Label: "Como será cobrada a taxa de serviço?"
   - Opções:
     - 💼 **Absorvo a taxa** - Você paga a taxa (comprador paga apenas o preço base)
     - 👤 **Repassar para o comprador** - Comprador paga preço + taxa
   - Info card dinâmico mostrando cálculo:
     ```
     ┌─────────────────────────────────────┐
     │ 📊 Simulação de Valores             │
     │                                     │
     │ Preço base: R$ 100,00               │
     │ Taxa de serviço (5%): R$ 5,00       │
     │ ────────────────────────────         │
     │ Você recebe: R$ 95,00               │
     │ Comprador paga: R$ 100,00           │
     └─────────────────────────────────────┘
     ```

3. **Preço Final para o Comprador** (read-only, calculado automaticamente)
   - Label: "Preço final"
   - Valor dinâmico baseado na escolha da taxa
   - Destaque visual (fundo cinza claro)

**Seção: Parcelamento Pix** (collapsible/expandable)

4. **Permitir Parcelamento?** (toggle switch)
   - Label: "Permitir parcelamento via Pix"
   - Help text: "Compradores poderão parcelar em até X vezes sem juros"

5. **Máximo de Parcelas** (number input)
   - Label: "Até quantas parcelas?"
   - Min: 2, Max: 12
   - Placeholder: "4"
   - Aparece apenas se toggle ativado

6. **Valor Mínimo para Parcelar** (currency input)
   - Label: "Valor mínimo para permitir parcelamento"
   - Placeholder: "R$ 50,00"
   - Help text: "Ingressos abaixo deste valor não poderão ser parcelados"
   - Aparece apenas se toggle ativado

**Validações Step 2:**
- Preço base obrigatório e > 0
- Se parcelamento ativo: máximo de parcelas entre 2-12
- Se parcelamento ativo: valor mínimo > 0

---

**Step 3: Disponibilidade** 📦

**Campos:**
1. **Quantidade Total** (number input obrigatório)
   - Label: "Quantos ingressos deseja vender?"
   - Placeholder: "100"
   - Min: 1
   - Help text: "Total de ingressos disponíveis para venda"

2. **Quantidade Mínima por Compra** (number input opcional)
   - Label: "Mínimo por compra"
   - Placeholder: "1"
   - Min: 1
   - Help text: "Deixe em branco para sem limite mínimo"

3. **Quantidade Máxima por Compra** (number input opcional)
   - Label: "Máximo por compra"
   - Placeholder: "10"
   - Min: 1
   - Help text: "Deixe em branco para sem limite máximo"

4. **Quantidade Vendida** (read-only, apenas em edição)
   - Label: "Quantidade já vendida"
   - Valor calculado automaticamente
   - Não editável
   - Fundo cinza claro

**Info Card:**
```
┌─────────────────────────────────────┐
│ 📊 Resumo de Disponibilidade        │
│                                     │
│ Total: 100 ingressos                │
│ Vendidos: 45 ingressos              │
│ Disponíveis: 55 ingressos           │
│ ●●●●●○○○○○ 45%                     │
└─────────────────────────────────────┘
```

**Validações Step 3:**
- Quantidade total obrigatória e >= quantidade vendida (em edição)
- Se mínimo e máximo preenchidos: máximo >= mínimo

---

**Step 4: Período de Vendas** 📅

**Campos:**
1. **Data de Início das Vendas** (datetime picker opcional)
   - Label: "Quando começam as vendas?"
   - Placeholder: "Selecione data e hora"
   - Help text: "Deixe em branco para começar imediatamente"
   - Validação: Não pode ser posterior à data de fim

2. **Data de Encerramento das Vendas** (datetime picker opcional)
   - Label: "Quando encerram as vendas?"
   - Placeholder: "Selecione data e hora"
   - Help text: "Deixe em branco para vender até o evento começar"
   - Validação: Não pode ser anterior à data de início

**Info Card Condicional:**
- Se início no futuro: "⏰ Vendas iniciarão em DD/MM/AAAA às HH:MM"
- Se início no passado e fim no futuro: "✅ Vendas abertas até DD/MM/AAAA às HH:MM"
- Se fim no passado: "🔒 Período de vendas encerrado"
- Se ambos vazios: "✅ Vendas abertas até o evento começar"

**Referência Visual do Evento:**
```
┌─────────────────────────────────────┐
│ 🎉 Evento: [Nome do Evento]         │
│ 📍 Local: [Local]                   │
│ 📅 Data: DD/MM/AAAA às HH:MM        │
└─────────────────────────────────────┘
```

**Validações Step 4:**
- Se data início preenchida: deve ser anterior à data de fim
- Se data fim preenchida: deve ser anterior à data do evento

---

#### 3.4.3 Footer do Drawer

**Botões:**
- **Esquerda:**
  - "Cancelar" (text button, secundário) - Fecha drawer com confirmação se houver alterações
  - "Salvar como Rascunho" (button secundário) - Salva com status `inactive`

- **Direita:**
  - "Voltar" (button secundário) - Volta para step anterior (exceto no step 1)
  - "Próximo" (button primário) - Avança para próximo step (steps 1-3)
  - "Publicar Ingresso" (button primário) - Salva com status `active` (step 4)

**Comportamento:**
- Validação ao clicar em "Próximo" - impede avanço se campos obrigatórios vazios
- Exibir mensagens de erro inline e highlight nos campos problemáticos
- Ao salvar com sucesso:
  - Toast de confirmação: "✅ Ingresso [nome] criado com sucesso!"
  - Fechar drawer
  - Atualizar lista de ingressos
  - Scroll até o novo ingresso (destaque temporário)

---

## 4. Estados e Feedbacks

### 4.1 Estados de Loading

**Ao carregar lista:**
- Skeleton loading na tabela (5 linhas)
- Filtros desabilitados

**Ao salvar ingresso:**
- Botões desabilitados
- Spinner no botão primário
- Texto: "Salvando..."

### 4.2 Estados Vazios

**Sem ingressos cadastrados:**
```
┌─────────────────────────────────────┐
│                                     │
│         🎫                          │
│                                     │
│    Nenhum ingresso cadastrado       │
│                                     │
│    Crie seu primeiro ingresso       │
│    para começar a vender!           │
│                                     │
│    [+ Criar Primeiro Ingresso]      │
│                                     │
└─────────────────────────────────────┘
```

**Busca sem resultados:**
```
🔍 Nenhum resultado encontrado para "[termo]"

Tente:
- Verificar a ortografia
- Usar palavras-chave diferentes
- Limpar os filtros aplicados
```

### 4.3 Mensagens de Erro

**Erro ao carregar:**
```
❌ Erro ao carregar ingressos
Não foi possível carregar a lista. Tente novamente.
[Tentar Novamente]
```

**Erro ao salvar:**
```
❌ Não foi possível salvar o ingresso
[Mensagem de erro específica do backend]
[Tentar Novamente] [Cancelar]
```

**Validação de campos:**
- Destaque vermelho no campo
- Ícone de erro
- Mensagem específica abaixo do campo

---

## 5. Interações e Comportamentos

### 5.1 Ações Rápidas

**Duplicar Ingresso:**
- Abre drawer com todos os dados pré-preenchidos
- Título alterado para "[Nome do Ingresso] - Cópia"
- Quantidade vendida zerada

**Ativar/Desativar:**
- Toggle rápido sem abrir drawer
- Confirmação inline (toast)
- Atualização imediata da lista

**Excluir:**
- Modal de confirmação:
  ```
  🗑️ Excluir ingresso?

  Tem certeza que deseja excluir o ingresso "[Nome]"?

  ⚠️ Esta ação não pode ser desfeita.
  [X vendido(s)] serão mantidos, mas novas vendas serão impedidas.

  [Cancelar] [Excluir Permanentemente]
  ```

### 5.2 Validações em Tempo Real

**Campo de preço:**
- Formatação automática: R$ 1.234,56
- Impede caracteres não numéricos
- Atualização dinâmica do cálculo de taxas

**Quantidade:**
- Impede valores negativos
- Impede decimais
- Destaque se quantidade < quantidade vendida (em edição)

**Datas:**
- Desabilita datas passadas (para início de vendas)
- Destaca conflitos (início > fim)
- Mostra contador regressivo se vendas próximas

### 5.3 Responsividade

**Desktop (≥1024px):**
- Tabela completa
- Drawer lateral
- Filtros inline

**Tablet (768px - 1023px):**
- Tabela simplificada (menos colunas)
- Drawer ocupa 70% da tela
- Filtros colapsáveis

**Mobile (<768px):**
- Cards ao invés de tabela
- Drawer fullscreen
- Filtros em accordion
- Bottom sheet para ações rápidas

---

## 6. Acessibilidade (a11y)

**Navegação por Teclado:**
- Tab order lógico
- Skip links ("Pular para conteúdo")
- Foco visível em todos os elementos interativos

**Screen Readers:**
- Labels descritivos em todos os inputs
- ARIA labels em ícones
- Anúncio de mudanças de estado (toast)
- Landmark roles apropriados

**Contraste:**
- Mínimo 4.5:1 para textos
- 3:1 para elementos gráficos
- Badges com cores acessíveis

**Validação:**
- Mensagens de erro associadas aos campos (aria-describedby)
- Role="alert" em mensagens críticas

---

## 7. Performance

**Otimizações:**
- Paginação server-side
- Lazy loading de dropdowns (eventos)
- Debounce em busca (300ms)
- Cache de listagens (1 minuto)
- Imagens otimizadas (thumbnails WebP)

**Métricas Alvo:**
- FCP (First Contentful Paint): < 1.5s
- LCP (Largest Contentful Paint): < 2.5s
- TTI (Time to Interactive): < 3s

---

## 8. Fluxos de Usuário

### 8.1 Fluxo Principal: Criar Novo Ingresso

```
1. Usuário clica em "+ Novo Ingresso"
   ↓
2. Drawer abre no Step 1
   ↓
3. Preenche informações básicas
   ↓
4. Clica em "Próximo" → Step 2
   ↓
5. Define preços e taxas
   ↓
6. Clica em "Próximo" → Step 3
   ↓
7. Configura disponibilidade
   ↓
8. Clica em "Próximo" → Step 4
   ↓
9. Define período de vendas (opcional)
   ↓
10. Clica em "Publicar Ingresso"
    ↓
11. Sistema valida e salva
    ↓
12. Toast de sucesso + drawer fecha
    ↓
13. Novo ingresso aparece na lista (highlight temporário)
```

### 8.2 Fluxo Alternativo: Edição Rápida

```
1. Usuário clica no ícone de editar
   ↓
2. Drawer abre com dados preenchidos
   ↓
3. Usuário vai direto ao step desejado (progress bar clicável)
   ↓
4. Edita campo(s)
   ↓
5. Clica em "Salvar Alterações"
   ↓
6. Sistema valida e atualiza
   ↓
7. Toast de sucesso + drawer fecha
```

### 8.3 Fluxo de Erro: Ingresso Esgotado

```
1. Sistema detecta quantity_sold >= quantity
   ↓
2. Status automaticamente muda para "sold_out"
   ↓
3. Badge na lista atualiza para "Esgotado" (vermelho)
   ↓
4. Ao editar: Warning banner no topo:
   "⚠️ Este ingresso está esgotado. Aumente a quantidade para reativá-lo."
   ↓
5. Se usuário aumenta quantity > quantity_sold:
   ↓
6. Sugestão automática: "Deseja reativar este ingresso?" [Sim] [Não]
```

---

## 9. Considerações Técnicas

### 9.1 Campos Calculados (Read-only)

**`buyer_price`** - Calculado automaticamente:
```typescript
buyer_price = service_fee_type === 'absorbed'
  ? price
  : price + (price * SERVICE_FEE_PERCENTAGE);
```

**`quantity_sold`** - Agregação de vendas:
```typescript
quantity_sold = SUM(event_registrations.tickets_purchased
  WHERE ticket_id = current_ticket.id);
```

### 9.2 Validações Backend

- `sale_start_date` < `sale_end_date`
- `sale_end_date` < `event.start_date`
- `quantity` >= `quantity_sold`
- `max_quantity_per_purchase` >= `min_quantity_per_purchase`
- `price` > 0
- Se `allow_installments = true`: `max_installments` BETWEEN 2 AND 12

### 9.3 Permissões

**Regras:**
- Organizador só pode gerenciar ingressos de seus próprios eventos
- Admin pode gerenciar todos os ingressos
- Query filtrado automaticamente por `event.organizer_id = current_user.id`

---

## 10. Próximos Passos (Roadmap Futuro)

**Fase 2:**
- [ ] Importação em massa via CSV
- [ ] Duplicação de ingressos entre eventos
- [ ] Histórico de alterações (audit log)
- [ ] Relatórios de vendas por ingresso

**Fase 3:**
- [ ] Cupons de desconto específicos por ingresso
- [ ] Vendas privadas com senha
- [ ] Waitlist para ingressos esgotados
- [ ] Notificações push quando ingresso voltar ao estoque

---

## 11. Referências de Design

**Inspirações:**
- Sympla (cadastro de ingressos)
- Eventbrite (gestão de tickets)
- AbacatePay Dashboard (UX de formulários complexos)

**Design System:**
- Shadcn/ui components
- Tailwind CSS utilities
- Radix UI primitives

**Tipografia:**
- Headings: Inter Bold
- Body: Inter Regular
- Numbers: Inter Medium (tabular-nums)

**Paleta de Status:**
- Ativo: `green-500` (#22C55E)
- Esgotado: `red-500` (#EF4444)
- Inativo: `gray-400` (#9CA3AF)
- Draft: `yellow-500` (#EAB308)

---

## 12. Critérios de Sucesso

**Métricas de UX:**
- ✅ Tempo médio para criar ingresso: < 2 minutos
- ✅ Taxa de erro em validações: < 5%
- ✅ NPS (Net Promoter Score): > 8/10
- ✅ Taxa de abandono no cadastro: < 15%

**Métricas Técnicas:**
- ✅ Lighthouse Score: > 90
- ✅ Tempo de resposta API: < 500ms
- ✅ 0 erros críticos em produção

---

**Última atualização:** 13/10/2025
**Versão:** 1.0
**Autor:** Especificação UX baseada na análise da collection `event_tickets`
