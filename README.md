# 📁 Administrador de Archivos Web

Sistema completo de gestión de archivos con interfaz web responsive, compatible con móviles, tablets y computadoras.

## 🚀 Instalación Rápida

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar carpeta a administrar

En `src/persistent/config.json`, modifica la ruta según tu preferencia:

```json
{
    "BASE_DIR": "/home/jorgemarcos/Documentos/archivos",
    "STORAGE_DIR": "",
    "LIMIT_STORAGE": 10737418240
}
```

Ejemplos de rutas:

- **Windows**: `'C:\\Users\\TuUsuario\\Documentos\\MisCarpetas'`
- **Linux/Mac**: `'/home/usuario/documentos'`
- **Relativa**: `path.join(__dirname, 'archivos')` (carpeta en el proyecto)

### 4. Iniciar el servidor

```bash
npm start
```

El servidor se iniciará en `http://localhost:3000`

### 5. Acceder a la aplicación

- **Desde el mismo PC**: `http://localhost:3000`
- **Desde otros dispositivos** (móvil, tablet): `http://[IP-DE-TU-PC]:3000`

Para encontrar tu IP:

- **Windows**: `ipconfig` (busca "Dirección IPv4")
- **Linux/Mac**: `ifconfig` o `ip addr`

## ✨ Características

### Operaciones básicas

- ✅ **Navegar**: Explora carpetas haciendo doble clic/tap
- ✅ **Crear carpetas**: Organiza tus archivos
- ✅ **Subir archivos**: Múltiples archivos a la vez
- ✅ **Drag & Drop**: Arrastra archivos para subirlos
- ✅ **Renombrar**: Cambia nombres de archivos y carpetas
- ✅ **Eliminar**: Borra con confirmación
- ✅ **Descargar**: Descarga cualquier archivo

### Vista previa nativa

- 📄 **Texto**: .txt, .md, .json, .js, .css, .html, .xml, .csv
- 🖼️ **Imágenes**: .jpg, .jpeg, .png, .gif, .svg, .webp
- 🎬 **Video**: .mp4, .webm, .ogg
- 🎵 **Audio**: .mp3, .wav, .ogg, .m4a
- 📕 **PDF**: Vista directa en el navegador

### Responsive Design

- 📱 **Móviles**: Interfaz optimizada con botones táctiles
- 📲 **Tablets**: Diseño adaptativo intermedio
- 💻 **Desktop**: Interfaz completa con hover effects

## 🎯 Uso

### En Computadora

- **Navegar**: Doble clic en carpetas
- **Subir**: Arrastra archivos o usa el botón "Subir Archivos"
- **Acciones**: Botones con texto e iconos

### En Móvil/Tablet

- **Navegar**: Doble tap en carpetas
- **Subir**: Toca el área de subida o botón
- **Acciones**: Botones compactos con iconos

## 🔧 Configuración Avanzada

### Cambiar puerto

En `server.js`, línea 9:

```javascript
const PORT = 3000; // Cambia a tu puerto preferido
```

### Límite de tamaño de archivo

En `server.js`, línea 26:

```javascript
fileSize: 100 * 1024 * 1024; // 100MB por archivo
```

### Límite de archivos simultáneos

En `server.js`, línea 74:

```javascript
app.post('/api/upload', upload.array('files', 20), // Máximo 20 archivos
```

## 🛡️ Seguridad

- ✅ Validación de rutas para prevenir acceso fuera del directorio base
- ✅ Verificación de existencia de archivos antes de operaciones
- ✅ Límites de tamaño de archivo configurables
- ⚠️ **Importante**: Para producción, agrega autenticación y cifrado HTTPS

## 📱 Acceso desde dispositivos móviles

### Asegurar que ambos dispositivos estén en la misma red WiFi

1. Inicia el servidor en tu PC
2. Encuentra la IP de tu PC (ver paso 5 arriba)
3. En tu móvil/tablet, abre el navegador
4. Accede a `http://[IP-DE-TU-PC]:3000`

Ejemplo: `http://192.168.1.100:3000`

## 🐛 Solución de Problemas

### El servidor no inicia

- Verifica que el puerto 3000 no esté en uso
- Ejecuta `npm install` nuevamente
- Revisa los logs en la consola

### No puedo subir archivos

- Verifica permisos de escritura en la carpeta `BASE_DIR`
- Revisa el tamaño del archivo (límite: 100MB)
- Abre la consola del navegador (F12) para ver errores

### No puedo acceder desde móvil

- Asegura que estén en la misma red WiFi
- Verifica que el firewall no bloquee el puerto 3000
- En Windows: Panel de Control → Firewall → Permitir aplicación

### Los modales se salen de la pantalla

- Ya está corregido con `100dvh`
- Si persiste, actualiza el navegador
- Reporta el navegador/dispositivo específico

## 📝 Dependencias

- **express**: Servidor web
- **cors**: Soporte para peticiones cross-origin
- **multer**: Manejo de subida de archivos

## 📄 Licencia

Proyecto educativo de código abierto. Úsalo y modifícalo libremente para tus necesidades.

## 🤝 Contribuciones

Este es un proyecto escolar. Siéntete libre de mejorarlo y adaptarlo a tus necesidades.

---

**Desarrollado como proyecto escolar** 🎓
