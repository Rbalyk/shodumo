# ShoDumo API — production Dockerfile (NestJS + Prisma)
# Місце: apps/api/Dockerfile
# Multi-stage: build → легкий runner. На старті прогоняє prisma migrate deploy.

# ---------- builder ----------
FROM node:20-alpine AS builder
# Prisma на alpine потребує openssl
RUN apk add --no-cache openssl
WORKDIR /app

# спершу маніфести — кращий кеш шарів
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# генеруємо Prisma client + збираємо Nest
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- runner ----------
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

# тягнемо вже встановлені залежності (з .prisma client) і білд
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# entrypoint: міграції → старт
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
