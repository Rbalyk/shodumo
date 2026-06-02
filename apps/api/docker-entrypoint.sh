#!/bin/sh
set -e

# Застосувати міграції до БД (ідемпотентно — безпечно на кожен старт)
echo "→ Running prisma migrate deploy..."
npx prisma migrate deploy

# Передати керування основній команді (CMD: node dist/main.js)
echo "→ Starting API..."
exec "$@"
