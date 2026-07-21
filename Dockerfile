FROM node:20-alpine AS builder

WORKDIR /app

# Habilitar pnpm
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate

# Copiar archivos de dependencias y esquema Prisma
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# Instalar dependencias
RUN pnpm install

# Copiar el resto del código de la aplicación
COPY . .

# Generar cliente de Prisma y compilar TypeScript
RUN npx prisma generate
RUN pnpm run build

# Imagen final de producción
FROM node:20-alpine AS runner

WORKDIR /app

# Dependencias del sistema necesarias para Prisma en Alpine / ARM
RUN apk add --no-cache openssl ca-certificates && corepack enable && corepack prepare pnpm@11.8.0 --activate

ENV NODE_ENV=production
ENV PORT=3000
ENV BASE_DIR=/app/archivos

# Copiar package.json y prisma
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma/

# Instalar dependencias necesarias para ejecución
RUN pnpm install --prod

# Copiar compilación y assets necesarios
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Crear carpeta de almacenamiento de archivos y asignar permisos al script
RUN mkdir -p /app/archivos && chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
