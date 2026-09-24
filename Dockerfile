FROM node:22-alpine AS builder

WORKDIR /app

# Habilitar pnpm
RUN corepack enable && corepack prepare pnpm@12.6.0 --activate

# Copiar archivos de dependencias y esquema Prisma
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Instalar dependencias
RUN pnpm install

# Copiar el resto del código de la aplicación
COPY . .

# Generar cliente de Prisma y compilar TypeScript
RUN npx prisma generate
RUN pnpm run build

# Imagen final de producción
FROM node:22-alpine AS runner

WORKDIR /app

# Dependencias del sistema necesarias para Prisma, SSL y multimedia en Alpine
RUN apk add --no-cache openssl ca-certificates ffmpeg && corepack enable && corepack prepare pnpm@12.6.0 --activate

ENV NODE_ENV=production
ENV PORT=3000
ENV BASE_DIR=/app/files

# Copiar package.json y prisma
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

# Instalar dependencias de producción
RUN pnpm install --prod

# Copiar archivos compilados y recursos estáticos
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/generated ./src/generated
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Crear carpetas de almacenamiento y logs, y asignar permisos de ejecución
RUN mkdir -p /app/files /app/logs /app/dist/logs && chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
