# Parish API (NestJS + Prisma) — imagem única para o Railway.
# Build multi-stage: instala deps + gera Prisma + compila; runtime enxuto roda
# as migrations e sobe a API.

# ---- build ----
FROM node:20-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
# npm ci quando o lockfile estiver em sincronia; cai para install se divergir
RUN npm ci || npm install
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runtime ----
FROM node:20-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
# O Railway injeta PORT; o main.ts o lê (default 3000).
EXPOSE 3000
# Aplica as migrations e sobe a API. migrate deploy é idempotente e seguro.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
