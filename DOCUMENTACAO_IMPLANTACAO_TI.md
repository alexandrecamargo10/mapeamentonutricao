# Especificação Técnica para Implantação (TI / Infraestrutura)
**Sistema:** Mapeamento e Controle de Validades – Nutrição Corporativa (Casas Pedro)  
**URL / Identificador Desejado:** `mapeamentonutricao` (ex: `https://mapeamentonutricao.casaspedro.com.br`)

---

## 1. Resumo da Finalidade da Aplicação e Processo de Negócio

### Finalidade da Aplicação
O sistema **Controle de Validades – Casas Pedro** é uma aplicação web responsiva (Desktop e Mobile/PWA) desenvolvida para digitalizar, padronizar e centralizar o monitoramento de datas de vencimento de produtos nas **75 lojas** da rede, substituindo controles manuais em planilhas.

### Processo de Negócio Atendido
1. **Operação nas Lojas (Prevenção de Perdas e Segurança Alimentar):**
   - Estagiários e operadores realizam a conferência física de gôndolas e registram os lotes de produtos com suas quantidades e datas de validade (contando com busca rápida no catálogo de **1.115 SKUs**).
   - O sistema classifica automaticamente os produtos em faixas críticas de alerta: **Vencido** (< 0 dias), **Crítico** (≤ 7 dias), **Atenção** (8 a 30 dias) e **Em Dia** (> 30 dias).
   - Permite a emissão de **Checklist Diário em formato A4** para conferência em prancheta no salão e o registro rápido de **baixas** (*Vendido em promoção, Descartado por avaria/vencimento, Retirado para o CD ou Doado*).
2. **Controle de Acesso e Isolamento (RBAC):**
   - Novos usuários realizam auto-cadastro e ficam bloqueados no status `PENDENTE` até aprovação pela equipe de Nutrição.
   - **Estagiário Padrão:** Acesso restrito exclusivamente aos dados da sua loja vinculada.
   - **Estagiário 360:** Auditor volante com permissão de alternar entre múltiplas lojas autorizadas.
3. **Gestão Corporativa (Nutrição e Qualidade):**
   - Dashboard em tempo real com indicadores consolidados da rede, ranking das lojas com maior volume de itens críticos/vencidos, gráficos por categoria de produto, trilha de auditoria e exportação de relatórios gerenciais em **Excel (.xlsx)** e **CSV**.

---

## 2. Dockerfile e Inicialização Automática do Container

Os arquivos de containerização já estão disponíveis na raiz do projeto:
- **`Dockerfile`**: Constrói a imagem de produção utilizando `node:20-bookworm-slim`, instala o cliente Prisma + dependências, executa o build otimizado do Next.js (`npm run build`) e expõe a porta `3000`.
- **`scripts/docker-start.js`**: Script de *entrypoint* executado automaticamente quando o container é iniciado (`CMD ["node", "scripts/docker-start.js"]`). Ele realiza 3 ações sem necessidade de intervenção manual:
  1. Sincroniza o schema do banco de dados (`npx prisma db push`).
  2. Verifica se o banco está vazio; caso esteja no primeiro deploy, importa automaticamente as **75 lojas**, os **1.115 produtos** e os **5 administradores** iniciais a partir da pasta `Mapeamento Lojas/`.
  3. Inicia automaticamente o servidor de produção Next.js na porta `3000`.
- **`docker-compose.yml`**: Arquivo pronto para orquestração com volume persistente (`mapeamento_data:/app/data`) e política `restart: unless-stopped`.

### Comandos para Subir o Container
```bash
# Opção A: Via Docker Compose (Recomendado)
docker compose up -d --build

# Opção B: Via Docker CLI puro
docker build -t mapeamentonutricao .
docker run -d \
  --name mapeamentonutricao \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV="production" \
  -e PORT="3000" \
  -e DATABASE_URL="file:/app/data/prod.db" \
  -e JWT_SECRET="DEFINIR_CHAVE_SECRETA_AQUI" \
  -v mapeamento_data:/app/data \
  mapeamentonutricao
```

---

## 3. Variáveis de Ambiente Necessárias

| Variável | Obrigatória | Valor Padrão / Exemplo | Descrição |
|---|---|---|---|
| `NODE_ENV` | Sim | `production` | Define o modo de execução otimizado do Next.js. |
| `PORT` | Não | `3000` | Porta HTTP interna na qual o container escuta. |
| `DATABASE_URL` | Sim | `file:/app/data/prod.db` | String de conexão do banco de dados (SQLite em volume persistente ou URL PostgreSQL). |
| `JWT_SECRET` | Sim | *(String aleatória de 32+ bytes)* | Segredo criptográfico usado para assinar e validar os tokens de sessão JWT (`HttpOnly`). |

---

## 4. Arquivos de Configuração do Projeto

Os principais arquivos de configuração presentes no repositório são:
- **`Dockerfile` / `docker-compose.yml` / `.dockerignore`**: Configuração de empacotamento, imagem e execução em container.
- **`prisma/schema.prisma`**: Modelagem de dados relacional e configuração do provedor de banco de dados (`sqlite` por padrão, compatível com `postgresql`).
- **`next.config.mjs`**: Configurações do framework Next.js 15.
- **`package.json`**: Definição de dependências, scripts de build (`npm run build`) e start (`npm run start`).
- **`tailwind.config.ts` / `postcss.config.mjs` / `tsconfig.json`**: Configurações de estilização e compilação TypeScript.

---

## 5. Segredos, Chaves de API e Certificados

1. **Segredos da Aplicação (`Secrets`):**
   - **`JWT_SECRET`**: Único segredo interno exigido pela aplicação. Recomenda-se que a equipe de TI gere uma chave forte exclusiva para produção (ex.: `openssl rand -base64 48`) e injete via variável de ambiente no container.
2. **Chaves de API Externas:**
   - **Nenhuma.** A aplicação é 100% autônoma (*self-contained*) e não depende de APIs pagas de terceiros.
3. **Certificados SSL/TLS (HTTPS):**
   - O container expõe tráfego HTTP padrão na porta `3000`.
   - O certificado SSL/TLS (HTTPS) deve ser gerenciado no **Reverse Proxy / Ingress Controller / Load Balancer** da infraestrutura da empresa (ex.: Nginx, Traefik, Cloudflare, AWS ALB), fazendo o redirecionamento de `https://mapeamentonutricao...` para `http://mapeamentonutricao:3000`.

---

## 6. URL Desejada e Roteamento de Rede

- **Identificador / Subdomínio solicitado:** `mapeamentonutricao`
  - Exemplo em domínio corporativo: `https://mapeamentonutricao.casaspedro.com.br` (ou `http://mapeamentonutricao` na intranet).
- **Porta Interna do Container:** `3000` (TCP).
