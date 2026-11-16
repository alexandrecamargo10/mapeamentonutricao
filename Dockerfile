# ==============================================================================
# Dockerfile - Controle de Validades (Casas Pedro)
# ==============================================================================
FROM node:20-bookworm-slim

# Instala OpenSSL e certificados necessários para o Prisma ORM
RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cria diretório dedicado para persistência do banco de dados SQLite (caso utilizado)
RUN mkdir -p /app/data

# Copia arquivos de dependências e schema do banco de dados
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Instala as dependências e gera o Prisma Client
RUN npm install

# Copia o restante do código-fonte e dados base de importação
COPY . .

# Variáveis de ambiente padrão (podem ser sobrescritas na execução do container)
ENV NODE_ENV="production"
ENV PORT="3000"
ENV DATABASE_URL="file:/app/data/prod.db"
ENV JWT_SECRET="casas-pedro-super-secret-key-2026-qualidade-token"

# Compila a aplicação Next.js para produção
RUN npx prisma generate && npm run build

# Expõe a porta padrão da aplicação
EXPOSE 3000

# Comando de inicialização automática:
# Sincroniza o banco, importa carga inicial (se vazio) e inicia o servidor Next.js
CMD ["node", "scripts/docker-start.js"]
