# ShoDumo web — production Dockerfile (Angular 19 SSR: public site + cabinet/admin)
# Місце: apps/web/Dockerfile
# Multi-stage: build → легкий runner. Серверний bundle самодостатній
# (esbuild інлайнить express та залежності), тому в runtime node_modules не потрібні.

# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

# спершу маніфести — кращий кеш шарів
COPY package*.json ./
RUN npm ci

# збираємо production (fileReplacements → environment.production.ts)
COPY . .
RUN npm run build

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# самодостатній SSR-вивід: browser/ (статика) + server/server.mjs (Express + SSR)
COPY --from=builder /app/dist/web ./dist/web

EXPOSE 4000
CMD ["node", "dist/web/server/server.mjs"]
