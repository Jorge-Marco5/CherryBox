#!/bin/sh
set -e

# Sincronizar el esquema de Prisma con la base de datos PostgreSQL
if [ -n "$DATABASE_URL" ]; then
  if [ -d "prisma/migrations" ] && [ -n "$(find prisma/migrations -name "migration.sql" 2>/dev/null)" ]; then
    echo "🍒 Aplicando migraciones de Prisma (migrate deploy)..."
    npx prisma migrate deploy || echo "⚠️ Advertencia: Falló migrate deploy, intentando db push..."
  else
    echo "🍒 Sincronizando esquema de base de datos con Prisma (db push)..."
    npx prisma db push || echo "⚠️ Advertencia: No se pudo sincronizar Prisma en el inicio."
  fi
  
  # Ejecutar seed de usuario inicial de forma segura e idempotente (upsert)
  if [ -f "dist/lib/seed.js" ]; then
    echo "🌱 Asegurando usuario inicial en la base de datos..."
    node dist/seed.js || echo "⚠️ Advertencia: No se pudo ejecutar el seed inicial."
  fi
fi

# Iniciar la aplicación
echo "🚀 Iniciando CherryBox..."
exec "$@"
