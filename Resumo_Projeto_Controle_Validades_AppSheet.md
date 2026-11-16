# Projeto: Controle de Validades – Casas Pedro (AppSheet + Google Sheets)

> Documento de contexto para continuidade do projeto em outro chat de IA.
> Idioma de trabalho: português do Brasil. Última atualização: outubro/2026.
> Legenda de status: ✅ concluído e verificado | 🟡 feito pelo usuário, não verificado ou a confirmar | ⏳ pendente

---

## 0. Instruções para a IA que for continuar este projeto

**Perfil do usuário:** não tem familiaridade com programação. Trabalha na área de Nutrição Corporativa da Casas Pedro. Precisa de **passo a passo detalhado, clique a clique**, nomeando menus e botões exatos.

**Como conduzir:**
- Dar um passo (ou poucos) por vez e pedir confirmação ou print antes de avançar.
- Pedir **prints** das telas do AppSheet quando houver dúvida de configuração. A IA não enxerga o editor do AppSheet.
- Ao dar fórmulas, entregar em bloco de código e **sem o sinal `=` inicial** nos campos do AppSheet.
- Apontar riscos antes de ações que possam bloquear o acesso do próprio usuário (ex.: filtro de segurança).
- Assumir que o usuário pode ter feito um passo parcialmente; conferir antes de seguir.

**Lições técnicas já aprendidas neste projeto (evitar repetir erros):**
1. `ROUND()` no AppSheet aceita **apenas 1 argumento** (arredonda para inteiro). `ROUND(x, 0)` gera erro.
2. Em AppSheet, `[Data] - TODAY()` retorna **Duration** (horas), não número. Para obter dias use: `ROUND(TOTALHOURS([Data_Validade] - TODAY()) / 24)`.
3. No Google Sheets, `RANDBETWEEN` é volátil: recalcula a cada edição. PINs gerados com ele precisam ser convertidos em valores fixos com **Colar especial > Somente valores** (Ctrl+Shift+V).
4. Colunas formatadas como "Texto simples" no Sheets não calculam fórmulas digitadas depois.
5. Uma **Slice não é segurança de dados**: só filtra o que é exibido. A proteção real é o **Security filter** da tabela.
6. `Show if` de uma view esconde o menu, mas não impede o download dos dados.

---

## 1. Objetivo

Desenvolver um aplicativo no **AppSheet** (com dados no **Google Sheets**) para gerenciar e controlar validades de produtos em uma rede de **75 lojas** da Casas Pedro (inicialmente a rede foi descrita como 71 lojas; hoje a planilha tem 75).

Dois focos:

| Perfil | Necessidade |
|---|---|
| **Operação (lojas)** | Funcionários (ex.: estagiários) registram produtos e consultam a lista de validades **somente da própria loja**, de forma simples e à prova de erros. Devem poder gerar uma lista de trabalho diária. |
| **Gestão (Nutrição Corporativa)** | Dashboard consolidado, em tempo real, com todas as lojas, sem restrições. |

---

## 2. Tecnologias e plataformas

| Componente | Uso |
|---|---|
| **Google Sheets** | Banco de dados (planilha "Mapeamento Lojas"). |
| **AppSheet** (appsheet.com, no-code) | Aplicativo mobile/web, regras de negócio, segurança, views e automações. |
| **Conta Google** | Autenticação dos usuários (login obrigatório planejado). |
| **Funções AppSheet usadas** | `USERSETTINGS()`, `USEREMAIL()`, `TODAY()`, `TOTALHOURS()`, `ROUND()`, `IN()`, `SELECT()`, `UNIQUEID()`, `IFS()` (planejado). |

Planilha: **Mapeamento Lojas** (ID do arquivo: `1R9qoNEh89B4SaIZkT49ncw0a53PAazNmBvCznJED68I`).
App no AppSheet: **Mapeamento Lojas** (status: *Not Deployed*, ou seja, ainda não publicado).

---

## 3. Estrutura de dados (abas do Google Sheets)

### 3.1 `CONFIG_LOJAS` (A1:C76)
Dados mestre das lojas. **75 lojas.**

| Coluna | Descrição |
|---|---|
| `ID_Loja` | Código da loja (ex.: 101024). |
| `Nome_Loja` | Nome (ex.: ALCANTARA 1). |
| `PIN_Acesso` | PIN de 6 dígitos, único por loja, usado no login por PIN. |

Estado:
- ✅ Duplicatas removidas (ARARUAMA e MARICA); loja PEDRINHO incluída (ID 101000).
- ✅ PINs de 6 dígitos gerados com `RANDBETWEEN`, sem repetição na última leitura.
- 🟡 **Congelar os PINs** (trocar fórmula por valores). Em leitura posterior os PINs ainda mudavam. Confirmar se foi feito: clicar num PIN e verificar que a barra de fórmulas mostra só o número.
- 🟡 Remover espaço sobrando no nome "PEDRINHO " (Dados > Limpeza de dados > Cortar espaços em branco).
- ⚠️ Esta tabela é lida pelo app; os PINs não devem aparecer em nenhuma view.

### 3.2 `CADASTRO_PRODUTOS` (A1:C1116)
Catálogo de SKUs. **1.115 produtos.**

| Coluna | Descrição |
|---|---|
| `SKU` | Código do produto (chave). |
| `Item` | Nome do produto. |
| `Categoria` | Ex.: Chocolates, Conservas, Doceria, Doces & Balas, Ervas & Chás, Farinhas, Fitoterápicos & Florais, Freezer, Frios, Frutas, Granolas, Grãos, Guloseimas (e outras mais abaixo na lista). |

Conferências pendentes (🟡):
- Remover SKUs duplicados.
- Padronizar `FREEZER` para `Freezer`.
- Verificar nomes possivelmente truncados com "..." (SKUs 16112 e 15981).

### 3.3 `CONTROLE_VALIDADES` (registros)
Cada linha é um produto registrado por uma loja. Hoje há 1 registro de teste.

| Coluna | Descrição |
|---|---|
| `ID_Registro` | Identificador único (chave; deve usar `UNIQUEID()` como valor inicial). |
| `Loja` | Preenchida automaticamente via `USERSETTINGS("Loja")`, bloqueada para edição. |
| `SKU` | Produto (Ref para `CADASTRO_PRODUTOS`). |
| `Item` | Nome do produto (preenchimento automático). |
| `Quantidade` | Quantidade em loja. |
| `Data_Validade` | Data de validade (tipo Date). |
| `Dias_a_Vencer` | ⚠️ **Legada e desatualizada**: valor gravado fixo na planilha (mostrou 15 quando o correto era 14). **Não usar** em regras; será ocultada. |
| `Status` | Hoje "Em Monitoramento" (fluxo de baixa será implementado). |
| `Data_Atualizacao` | Data/hora do registro. |
| `Dias_Restantes` | **Coluna virtual** (existe só no AppSheet): dias até o vencimento calculados na hora. |

### 3.4 `CONFIG_ADMIN` (nova)
Lista de e-mails dos administradores corporativos. Coluna `Email` (A1) com um e-mail Google por linha. **O e-mail do dono do projeto precisa estar na lista.**

Estado: ✅ aba criada e conectada ao AppSheet (aparece na lista de tabelas). 🟡 Conferir: e-mails reais preenchidos; tabela como **Read-Only**; `Email` marcado como chave.

---

## 4. Funcionalidades implementadas até agora

### 4.1 Segurança e login (relatado pelo usuário; configuração das User Settings **ainda não foi verificada**)
- 🟡 **User Settings** pedem um PIN; o sistema valida contra `CONFIG_LOJAS` e define a loja do usuário.
- 🟡 Campo `Loja` em `CONTROLE_VALIDADES` bloqueado, com App formula `USERSETTINGS("Loja")`.
- 🟡 **Slice `Estoque_da_Loja`** sobre `CONTROLE_VALIDADES`, com filtro `[Loja] = USERSETTINGS("Loja")`. Ações limitadas: Add, Edit, Delete, View Ref.
- ⏳ Importante: a slice só filtra a exibição. Falta o **Security filter** (ver seção 5).

### 4.2 Exportação para impressão
- 🟡 Ação `Gerar Lista para Impressão` (tipo: *App: export this view to a CSV file*), criada na tabela `CONTROLE_VALIDADES` e liberada na slice `Estoque_da_Loja`; exibida em destaque.

### 4.3 Dashboard corporativo
- 🟡 Dashboard `Dashboard Controle de Validades Lojas`, alimentado por view de tabela "Todas as Lojas" (dados completos, sem slice).
- 🟡 `Show if` atual com lista fixa de e-mails dentro de `IN(USEREMAIL(), {...})`. **Será substituída** pela lista dinâmica de `CONFIG_ADMIN`.

### 4.4 Ajustes feitos nesta fase de correções
- ✅ Remoção de lojas duplicadas e inclusão da loja faltante (75 lojas).
- ✅ Catálogo completo de SKUs carregado (1.115).
- ✅ Coluna virtual `Dias_Restantes` criada, com a fórmula `ROUND(TOTALHOURS([Data_Validade] - TODAY()) / 24)`. Valor esperado para validade em 23/10/2026 no dia 09/10/2026: **14**. 🟡 Confirmar que o erro vermelho sumiu e que o valor aparece.
- ✅ Chave da tabela `CONTROLE_VALIDADES` trocada de `_RowNumber` para `ID_Registro`, e *Label* trocado para `Item` (informado pelo usuário).
- ✅ Tabela `CONFIG_ADMIN` adicionada ao AppSheet.

---

## 5. Funcionalidades a implementar (roadmap)

### Fase 0: Correções de base e segurança (em andamento)
1. 🟡 Congelar PINs (valores fixos) e proteger o intervalo C2:C76 contra edição (Dados > Proteger planilhas e intervalos).
2. 🟡 Conferências do catálogo (duplicatas, `Freezer`, nomes truncados).
3. ⏳ **6.1/6.2** Finalizar `CONFIG_ADMIN` (e-mails reais, Read-Only, `Email` como chave).
4. ⏳ Remover do app quaisquer views automáticas de `CONFIG_ADMIN` e `CONFIG_LOJAS` (UX > Views).
5. ⏳ **6.3** Ligar *Require user sign-in* (Security), provedor Google. Sem isso `USEREMAIL()` vem vazio.
6. ⏳ **Verificar a aba User Settings** (nomes, tipos, fórmulas): confirmar como o PIN vira `USERSETTINGS("Loja")`. Se a Loja for escolhida de lista livre, o PIN não protege nada.
7. ⏳ **6.4** Trocar o `Show if` do dashboard para:
   ```
   IN(USEREMAIL(), SELECT(CONFIG_ADMIN[Email], TRUE))
   ```
8. ⏳ **6.5** Aplicar **Security filter** em `CONTROLE_VALIDADES`:
   ```
   OR(
     IN(USEREMAIL(), SELECT(CONFIG_ADMIN[Email], TRUE)),
     [Loja] = USERSETTINGS("Loja")
   )
   ```
   Só aplicar depois de validar as User Settings (risco de bloquear todos, inclusive o administrador).
9. ⏳ **6.6** Teste obrigatório: conta admin vê tudo e o dashboard; conta comum com PIN de uma loja vê só os registros dela e não vê o dashboard. Se falhar, desfazer o filtro.
10. ⏳ Resolver a divergência 71 vs 75 lojas (confirmar se há lojas que não deveriam estar na lista) e o ID da PEDRINHO.

### Fase 1: Alertas visuais e lista limpa
- Coluna virtual `Faixa_Alerta`:
  ```
  IFS(
    [Status]<>"Em Monitoramento", "BAIXADO",
    [Dias_Restantes]<0, "VENCIDO",
    [Dias_Restantes]<=7, "CRITICO",
    [Dias_Restantes]<=30, "ATENCAO",
    TRUE, "OK"
  )
  ```
- **Format Rules** (UX > Format Rules): vermelho (VENCIDO, CRITICO), amarelo (ATENCAO), verde (OK). Limites de 7 e 30 dias a validar com a Nutrição; podem variar por categoria.
- Trocar a view `Estoque_da_Loja` de tabela para **Deck**: título = Item; secundários = validade e quantidade; ordenada por `Dias_Restantes` crescente; agrupada por `Faixa_Alerta`.
- Slice **`Vence_em_Breve`** (até 7 dias) como atalho.
- Melhorar o formulário de cadastro: SKU como Ref para `CADASTRO_PRODUTOS` com `Item` automático (lista de 1.115 itens, usar busca); validação da data; ordem dos campos: SKU, Quantidade, Validade.
- Ocultar a coluna legada `Dias_a_Vencer` e passar a usar `Dias_Restantes`.

### Fase 2: Fluxo de baixa
- `Status` como lista fixa: *Em Monitoramento, Retirado, Vendido, Descartado*.
- Ações de um toque ("Retirar", "Descartar") que gravam status, data e responsável.
- Lista da loja exibe só itens "Em Monitoramento".

### Fase 3: Dashboard corporativo
- Coluna virtual `Categoria` em `CONTROLE_VALIDADES` (buscada em `CADASTRO_PRODUTOS`).
- Slice `Criticos_Global` (VENCIDO e CRITICO, todas as lojas).
- Gráficos: críticos por loja, por categoria, descartes por loja; tabela de itens críticos.
- Opcional: **Automation** diária com e-mail à Nutrição (resumo de críticos por loja) e relatório em PDF para a lista de trabalho diária (alternativa ao CSV).

### Fase 4: Identidade visual (UX > Brand)
- Cor principal, logotipo e launch image da Casas Pedro.

### Fase 5: Piloto e lançamento
- Piloto de 1 semana com 3 a 5 lojas variadas; ajustes.
- Guia de uma página (PIN, cadastro, baixa) e distribuição de PINs **somente após** o piloto, em lista separada e confidencial.
- Publicar o app (*Deploy*), convidar usuários e lançar por ondas.
- Definir contas Google para os funcionários (individuais ou uma por loja).
- Confirmar o **plano/licenciamento do AppSheet** e as funções disponíveis (incluindo Security filter) na documentação atual.

---

## 6. Riscos e pontos de atenção

- **PINs expostos na tabela:** como o app lê `CONFIG_LOJAS`, tecnicamente os PINs são baixados para o aparelho. Risco baixo para este caso, aceito por ora.
- **Dependência de conta Google:** login obrigatório exige conta Google por usuário.
- **Dados antigos:** `Dias_a_Vencer` (legada) não deve ser usada em alertas nem no dashboard.
- **Segurança em camadas:** Slice + Show if não bastam; o Security filter é a proteção real.
- **Cópia confidencial dos PINs:** se foi feita antes de congelar os valores, está desatualizada e deve ser refeita com *Somente valores*.
- **Discrepância de lojas:** 75 hoje vs 71 no escopo original.

---

## 7. Próximo passo imediato

1. Terminar as configurações de `CONFIG_ADMIN` (Read-Only, chave `Email`) e remover views automáticas.
2. Ligar o login obrigatório (Security).
3. Enviar print da aba **Data > User Settings** para validar como o PIN define a loja e, só então, escrever e aplicar o Security filter.
