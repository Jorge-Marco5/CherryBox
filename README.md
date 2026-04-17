# 🍒 CherryBox

**CherryBox** es un sistema inteligente y robusto de gestión de archivos y nube personal, diseñado con un enfoque en la seguridad, la auditoría y la experiencia de usuario. Permite no solo almacenar y organizar archivos, sino también controlar granularmente quién tiene acceso a ellos a través de un sistema avanzado de **Permisos ACL**.

---

## 🌟 Características Principales

### 📁 Gestión de Archivos Completa
-   **Operaciones Inteligentes**: Navega, crea, renombra, elimina y descarga archivos o carpetas.
-   **Descarga Masiva**: Selecciona múltiples archivos y descárgalos instantáneamente en un archivo `.zip` generado al vuelo (límite de 100MB).
-   **Drag & Drop**: Sube archivos múltiples simplemente arrastrándolos a la interfaz.
-   **Búsqueda Recursiva**: Encuentra cualquier archivo en segundos mediante el motor de búsqueda integrado.

### 🛡️ Seguridad y Control de Acceso (ACL)
-   **Roles de Usuario**:
    -   🥇 **SUPERADMIN**: Control total del sistema, gestión de configuraciones globales y jerarquía suprema (intocable por otros administradores).
    -   🥈 **ADMIN**: Gestión de usuarios y archivos. Acceso de solo lectura a configuraciones globales.
    -   🥉 **USER**: Acceso restringido a archivos propios y compartidos.
-   **Permisos Granulares**: Define permisos de `LECTURA`, `ESCRITURA`, `ELIMINACIÓN` o `GESTIÓN` para cualquier usuario en cualquier archivo o carpeta.
-   **Bloqueo Visual Preventivo**: Sistema de "Guarda de Vistas" que bloquea el acceso a nivel de interfaz basado en el rol de `localStorage`, optimizado para despliegues con Nginx.

### 📋 Auditoría y Monitoreo
-   **Logs de Acciones**: Registro detallado de cada operación (Creación, Eliminación, Renombrado, Descarga).
-   **Logs de Seguridad**: Seguimiento de intentos de inicio de sesión, accesos fallidos y bloqueos de cuenta.
-   **Inspector de Logs**: Visualizador de logs integrado en la interfaz administrativa con resaltado de sintaxis.

### 🖼️ Previsualización Nativa
-   **Media**: Imágenes (jpg, png, gif, svg, webp), Video (mp4, webm) y Audio (mp3, wav, flac, aac).
-   **Documentos**: PDF y archivos de texto plano (txt, md, js, css, etc.) con resaltado de código.

---

## 🚀 Instalación y Despliegue

### 1. Requisitos Previos
-   Node.js (v18+)
-   PostgreSQL
-   pnpm (Recomendado)

### 2. Configuración Inicial
Clona el repositorio y configura tu entorno:

```bash
git clone https://github.com/Jorge-Marco5/CherryBox.git
cd CherryBox
cp .env.example .env
pnpm install
```

### 3. Configuración del Sistema
Edita el archivo `.env` con tus credenciales de base de datos y secretos:
-   `DATABASE_URL`: Conexión de Prisma a PostgreSQL.
-   `JWT_SECRET`: Llave para el cifrado de sesiones.
-   `MAX_FILE_SIZE`: Límite por archivo (default: 100MB).

Para configurar la ruta física de los archivos, edita `src/persistent/config.json`:
```json
{
  "BASE_DIR": "/ruta/a/tus/archivos",
  "LIMIT_STORAGE": 10737418240
}
```

### 4. Construcción y Ejecución
**Modo Desarrollo:**
```bash
pnpm dev
```

**Producción:**
```bash
pnpm build
pnpm start
```

---

## 🛠️ Stack Tecnológico
-   **Backend**: Node.js, Express.js (v5), TypeScript.
-   **ORM**: Prisma con PostgreSQL.
-   **Frontend**: Vanilla JavaScript (ES6+), CSS3 (Modern UI/UX).
-   **Seguridad**: JWT (JSON Web Tokens), Bcrypt para hash de contraseñas.
-   **Utilidades**: Archiver (Compresión ZIP), Winston (Logging avanzado), Zod (Validación de esquemas).

---

## 🛡️ Seguridad y Buenas Prácticas
-   **Protección de Rutas**: Middlewares de autenticación robustos a nivel de API y de Vistas.
-   **Auditoría de Navegación**: Cada acceso a una carpeta es registrado para control de fuga de información.
-   **Integridad**: El sistema Admin/Superadmin garantiza que la infraestructura crítica no sea modificada por usuarios no autorizados.

> ⚠️ **IMPORTANTE**: Para despliegues en producción, se recomienda encarecidamente el uso de HTTPS y un servidor proxy inverso como Nginx.

---
**CherryBox** - *Tu caja de herramientas para la gestión segura de archivos.* 🍒
