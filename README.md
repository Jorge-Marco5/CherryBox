# 🍒 CherryBox

**CherryBox** es un sistema inteligente y robusto de gestión de archivos y nube personal, diseñado con un enfoque en la seguridad, la auditoría y la experiencia de usuario. Permite no solo almacenar y organizar archivos, sino también controlar granularmente quién tiene acceso a ellos a través de un sistema avanzado de **Permisos ACL**.

---

## 🌟 Características Principales

### 📁 Gestión de Archivos Completa
- **Operaciones Inteligentes**: Navega, crea, renombra, elimina y descarga archivos o carpetas.
- **Descarga Masiva**: Selecciona múltiples archivos y descárgalos instantáneamente en un archivo `.zip` generado al vuelo.
- **Drag & Drop**: Sube múltiples archivos simplemente arrastrándolos a la interfaz.
- **Búsqueda Recursiva**: Encuentra cualquier archivo en segundos mediante el motor de búsqueda integrado.

### 🛡️ Seguridad y Control de Acceso (ACL)
- **Roles de Usuario**:
  - 🥇 **SUPERADMIN**: Control total del sistema, gestión de configuraciones globales y jerarquía suprema.
  - 🥈 **ADMIN**: Gestión de usuarios y archivos. Acceso de solo lectura a configuraciones globales.
  - 🥉 **USER**: Acceso restringido a archivos propios y compartidos.
- **Permisos Granulares**: Define permisos de `LECTURA`, `ESCRITURA`, `ELIMINACIÓN` o `GESTIÓN` para cualquier usuario en cualquier archivo o carpeta.
- **Enlaces Compartidos Temporales**: Generación de links públicos firmados y protegidos con expiración temporal.

### 📋 Auditoría y Monitoreo
- **Logs de Acciones**: Registro detallado de cada operación (Creación, Eliminación, Renombrado, Descarga).
- **Logs de Seguridad**: Seguimiento de intentos de inicio de sesión, accesos fallidos y bloqueos de cuenta.
- **Inspector de Logs**: Visualizador de logs integrado en la interfaz administrativa con resaltado de sintaxis.

### 🖼️ Previsualización Nativa
- **Media**: Imágenes (`jpg`, `png`, `gif`, `svg`, `webp`), Video (`mp4`, `webm`) y Audio (`mp3`, `wav`, `flac`, `aac`).
- **Documentos**: PDF y archivos de texto plano (`txt`, `md`, `js`, `ts`, `css`, `html`, `json`, etc.) con resaltado de código.
- **Transcodificación / Faststart**: Optimización asíncrona de videos en segundo plano con FFmpeg.

---

## 🐳 Despliegue con Docker (Recomendado)

Docker Compose gestiona la base de datos PostgreSQL y la aplicación NodeJS de forma aislada y persistente.

### 1. Variables de Entorno y Configuración
Copia el archivo de ejemplo y ajusta las variables según tus necesidades:

```bash
cp .env.example .env
```

Revisa las credenciales en `.env` o en [docker-compose.yml](docker-compose.yml):
- `POSTGRES_USER`: Usuario de PostgreSQL (por defecto `postgres`).
- `POSTGRES_PASSWORD`: Contraseña de PostgreSQL.
- `POSTGRES_DB`: Nombre de la base de datos (`cherrybox_db`).
- `JWT_SECRET`: Clave secreta para la firma de tokens JWT.
- `PORT`: Puerto expuesto en el host (por defecto `3000`).

### 2. Levantamiento Inicial (Primer despliegue)
Ejecuta:

```bash
docker compose up --build -d
```

> **¿Qué ocurre automáticamente en el inicio?**
> 1. Se construye la imagen con Node.js, compilando TypeScript y generando el cliente de Prisma (`src/generated/prisma`).
> 2. Se inicia el contenedor de base de datos (`cherrybox_db`) y se verifica su estado de salud (`healthcheck`).
> 3. El script [docker-entrypoint.sh](docker-entrypoint.sh) sincroniza el esquema de tablas en PostgreSQL y crea el usuario inicial (`SUPERADMIN`).
> 4. El servidor queda disponible en **`http://localhost:3000`**.

### 3. Monitoreo de Logs
```bash
docker compose logs -f app
```

### 4. Detener Contenedores
```bash
# Detener sin borrar datos
docker compose down

# Detener y reiniciar limpiando datos de la base de datos (¡CUIDADO!)
docker compose down -v
```

---

## 💻 Instalación Local (Desarrollo sin Docker)

### 1. Requisitos Previos
- Node.js (v20 o superior)
- pnpm (`corepack enable && corepack prepare pnpm@12.6.0 --activate`)
- PostgreSQL instalado y en ejecución

### 2. Pasos de Instalación
```bash
# 1. Clonar el repositorio
git clone https://github.com/Jorge-Marco5/CherryBox.git
cd CherryBox

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Instalar dependencias
pnpm install

# 4. Generar cliente de Prisma
pnpm prisma:generate

# 5. Cargar las tablas a la base de datos local
pnpm prisma:push

# 6. Crear el usuario Administrador inicial
pnpm seed

# 7. Iniciar en modo desarrollo
pnpm dev
```

---

## 🔄 Flujo para Aplicar Cambios en Producción

### Caso A: Cambios solo en Código (Frontend, Backend, Estilos, Rutas)
Cuando **no** se realizan cambios en la base de datos:

```bash
# 1. Descargar los últimos cambios del repositorio
git pull origin main

# 2. Reconstruir e iniciar solo el contenedor de la app (la BD sigue corriendo sin interrupción)
docker compose up -d --build app

# 3. Verificar que la aplicación levantó sin errores
docker compose logs -f app
```

---

### Caso B: Cambios en la Base de Datos (Modelos en `prisma/schema.prisma`)

#### Paso 1: En tu entorno local de desarrollo
1. Modifica [prisma/schema.prisma](prisma/schema.prisma).
2. Genera el archivo SQL de migración versionado:
   ```bash
   npx prisma migrate dev --name descripcion_del_cambio
   ```
3. Realiza commit y sube la nueva migración:
   ```bash
   git add prisma/
   git commit -m "feat: migración descripcion_del_cambio"
   git push origin main
   ```

#### Paso 2: En el servidor de Producción con Docker
1. Descarga el código y reconstruye la app:
   ```bash
   git pull origin main
   docker compose up -d --build app
   ```
2. **Aplicación automática:**
   [docker-entrypoint.sh](docker-entrypoint.sh) detectará automáticamente las nuevas migraciones y ejecutará `npx prisma migrate deploy` antes de iniciar el servidor web, garantizando la consistencia de los datos.

---

## 🛠️ Comandos de Mantenimiento y Operaciones

| Acción | Comando Docker | Comando Local |
| :--- | :--- | :--- |
| **Ver estado de migraciones** | `docker compose exec app npx prisma migrate status` | `npx prisma migrate status` |
| **Ejecutar Seed manualmente** | `docker compose exec app node dist/lib/seed.js` | `pnpm seed` |
| **Respaldo de Base de Datos (Backup)** | `docker compose exec -T db pg_dump -U postgres cherrybox_db > backup.sql` | `pg_dump -U postgres cherrybox_db > backup.sql` |
| **Restaurar Respaldo** | `cat backup.sql \| docker compose exec -T db psql -U postgres cherrybox_db` | `psql -U postgres cherrybox_db < backup.sql` |
| **Acceder a la consola de PostgreSQL** | `docker compose exec db psql -U postgres -d cherrybox_db` | `psql -U postgres -d cherrybox_db` |

---

## 👤 Usuario Inicial por Defecto (Seed)

Al realizar la primera instalación o despliegue, se genera automáticamente el usuario:

* **Email:** `system_admin@example.com`
* **Contraseña:** `123456789`
* **Rol:** `SUPERADMIN`

*(**Recomendado:*** Puedes personalizar estas credenciales en [src/lib/seed.ts](src/lib/seed.ts) o mediante las variables de entorno `ADMIN_EMAIL` y `ADMIN_PASSWORD`).*

---

## 🛠️ Stack Tecnológico
- **Backend**: Node.js, Express.js (v5), TypeScript.
- **ORM & Base de Datos**: Prisma con driver `@prisma/adapter-pg` y PostgreSQL 16.
- **Frontend**: Vanilla JavaScript (ES6+), CSS3 (Modern Dark Glassmorphism UI).
- **Seguridad**: JWT, Cookies HTTP-Only, Bcrypt, Control de acceso ACL.
- **Multimedia & Archivos**: FFmpeg, Multer, Archiver (ZIP).
- **Logging & Auditoría**: Winston.

---

## 🛡️ Recomendaciones de Seguridad en Producción
1. **HTTPS / Proxy Inverso**: Utiliza un proxy inverso como Nginx, Traefik o Caddy para servir CherryBox mediante SSL/TLS.
2. **Cambio de Secretos**: Modifica `JWT_SECRET`, cambia a usuarios y las contraseñas mas robustas de la base de datos y aplicación antes de exponer el servidor a redes públicas.
3. **Copia de Seguridad**: Configura tareas programadas (cron jobs) para respaldar el directorio de archivos y la base de datos periódicamente.

---
**CherryBox** - *Tu nube personal segura, rápida y auto-alojada.* 🍒
