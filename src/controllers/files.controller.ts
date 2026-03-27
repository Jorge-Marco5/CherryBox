import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { isValidPath } from "../utils/multer";
import path from "path";
import fs from "fs/promises";
import { getSetting, getBaseDir } from "../utils/settings";
import dotenv from "dotenv";
import { AuthRequest } from "../middlewares/auth.middleware";

dotenv.config();

const BASE_DIR = getBaseDir();

/**
 * Renderiza la vista principal del administrador de archivos.
 * 
 * @param req Petición de Express
 * @param res Respuesta que envía el archivo index.html
 */
export const dashboard = (req: Request, res: Response) => {
  try {
    res.sendFile(path.join(__dirname, '../views/index.html'));
  } catch (error: any) {
    logger.error('Error al cargar la página dashboard: ' + error.message);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body>
          <h1>Error al cargar la página</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
}

/**
 * Lista los archivos y carpetas de un directorio específico.
 * Registra quién accedió a qué ruta para auditoría de navegación.
 * 
 * @param req Petición con la ruta relativa en query.path
 * @param res JSON con la lista de archivos y metadatos
 */
export const listFiles = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  try {
    const relativePath = (req.query.path as string) || '';

    if (!isValidPath(relativePath)) {
      logger.error(`[AUDIT] Intento de acceso a ruta no válida por usuario ${user?.id}: ${relativePath}`);
      return res.status(403).json({ error: 'Ruta no válida' });
    }

    const fullPath = path.join(BASE_DIR, relativePath);
    const items = await fs.readdir(fullPath, { withFileTypes: true });

    logger.info(`[AUDIT] Usuario ${user?.id} listó el directorio: ${relativePath || '/'}`);

    const results = await Promise.allSettled(
      items.map(async (item) => {
        const itemPath = path.join(fullPath, item.name);
        try {
          const stats = await fs.stat(itemPath);
          return {
            name: item.name,
            type: item.isDirectory() ? 'folder' : 'file',
            size: stats.size,
            modified: stats.mtime,
            path: path.join(relativePath, item.name)
          };
        } catch (err: any) {
          logger.warn(`No se pudo obtener info de ${item.name}: ${err.message}`);
          return null;
        }
      })
    );

    const files = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);

    res.json({ files, currentPath: relativePath });
  } catch (error: any) {
    logger.error('Error al listar archivos: ' + error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Realiza una búsqueda recursiva de archivos que coincidan con un criterio.
 * 
 * @param req Petición con el término de búsqueda en query.q
 * @param res JSON con los resultados encontrados
 */
export const searchFiles = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  try {
    const q = req.query.q as string;
    if (!q) {
      return res.json([]);
    }

    logger.info(`[AUDIT] Usuario ${user?.id} realizó búsqueda: "${q}"`);

    const results: any[] = [];
    const searchRecursive = async (currentDir: string) => {
      const fullPath = path.join(BASE_DIR, currentDir);
      const items = await fs.readdir(fullPath, { withFileTypes: true });

      for (const item of items) {
        const relativePath = path.join(currentDir, item.name);

        if (item.name.toLowerCase().includes(q.toLowerCase())) {
          try {
            const stats = await fs.stat(path.join(BASE_DIR, relativePath));
            results.push({
              name: item.name,
              type: item.isDirectory() ? 'folder' : 'file',
              size: stats.size,
              modified: stats.mtime,
              path: relativePath
            });
          } catch (err: any) {
            logger.warn(`No se pudo obtener info durante búsqueda: ${err.message}`);
          }
        }

        if (item.isDirectory()) {
          await searchRecursive(relativePath);
        }
      }
    };

    await searchRecursive('');
    res.json(results);
  } catch (error: any) {
    logger.error('Error al buscar archivos: ' + error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Crea una nueva carpeta en la ruta especificada.
 * 
 * @param req Petición con el nombre y ruta de la nueva carpeta
 * @param res Respuesta de confirmación
 */
export const createFolder = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  try {
    const { path: relativePath, name } = req.body;

    if (!isValidPath(relativePath)) {
      logger.error(`[AUDIT] Intento de creación de carpeta en ruta no válida por ${user?.id}: ${relativePath}`);
      return res.status(403).json({ error: 'Ruta no válida' });
    }

    const fullPath = path.join(BASE_DIR, relativePath, name);
    await fs.mkdir(fullPath, { recursive: true });

    logger.info(`[AUDIT] Usuario ${user?.id} creó la carpeta: ${path.join(relativePath, name)}`);
    res.json({ success: true, message: 'Carpeta creada' });
  } catch (error: any) {
    logger.error(`Error al crear carpeta (Usuario: ${user?.id}): ` + error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Gestiona la subida de múltiples archivos.
 * 
 * @param req Petición con los archivos en req.files
 * @param res JSON con la lista de archivos subidos exitosamente
 */
export const uploadFiles = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se subieron archivos' });
    }

    const files = req.files as Express.Multer.File[];
    const uploadedFiles = files.map(file => {
      logger.info(`[AUDIT] Usuario ${user?.id} subió archivo: ${file.filename} (${file.size} bytes)`);
      return {
        name: file.filename,
        size: file.size,
        path: file.path
      };
    });

    logger.info(`[AUDIT] Usuario ${user?.id} completó subida de ${uploadedFiles.length} archivo(s) a: ${req.query.path || '/'}`);
    res.json({
      success: true,
      message: `${uploadedFiles.length} archivo(s) subido(s) correctamente`,
      files: uploadedFiles
    });
  } catch (error: any) {
    logger.error(`Error al subir archivos (Usuario: ${user?.id}):`, error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Cambia el nombre de un archivo o carpeta existente.
 * 
 * @param req Petición con oldPath y newName en el body
 * @param res Respuesta de confirmación
 */
export const renameFile = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  try {
    const { oldPath, newName } = req.body;

    if (!oldPath || !newName) {
      return res.status(400).json({ error: 'Faltan parámetros (oldPath o newName)' });
    }

    if (!isValidPath(oldPath)) {
      logger.error(`[AUDIT] Intento de renombrado no válido por ${user?.id}: ${oldPath}`);
      return res.status(403).json({ error: 'Ruta no válida' });
    }

    const oldFullPath = path.join(BASE_DIR, oldPath);
    const newFullPath = path.join(path.dirname(oldFullPath), newName);

    try {
      await fs.access(oldFullPath);
    } catch {
      return res.status(404).json({ error: 'El archivo o carpeta no existe' });
    }

    try {
      await fs.access(newFullPath);
      return res.status(409).json({ error: 'Ya existe un archivo con ese nombre' });
    } catch {
      // Nombre disponible
    }

    await fs.rename(oldFullPath, newFullPath);
    logger.info(`[AUDIT] Usuario ${user?.id} renombró: ${oldPath} -> ${newName}`);

    res.json({ success: true, message: 'Renombrado exitosamente' });
  } catch (error: any) {
    logger.error(`Error al renombrar (Usuario: ${user?.id}): ` + error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Elimina un archivo o una carpeta (recursivamente) del sistema.
 * 
 * @param req Petición con la ruta en body o query
 * @param res Respuesta de confirmación
 */
export const deleteFile = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  try {
    const relativePath = req.body?.path || (req.query?.path as string);

    if (!relativePath) {
      return res.status(400).json({ error: 'No se proporcionó la ruta del archivo' });
    }

    if (!isValidPath(relativePath)) {
      logger.error(`[AUDIT] Intento de eliminación en ruta no válida por ${user?.id}: ${relativePath}`);
      return res.status(403).json({ error: 'Ruta no válida' });
    }

    const fullPath = path.join(BASE_DIR, relativePath);

    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({ error: 'El archivo o carpeta no existe' });
    }

    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
      logger.warn(`[AUDIT] Usuario ${user?.id} ELIMINÓ CARPETA: ${relativePath}`);
    } else {
      await fs.unlink(fullPath);
      logger.warn(`[AUDIT] Usuario ${user?.id} ELIMINÓ ARCHIVO: ${relativePath}`);
    }
    res.json({ success: true, message: 'Eliminado exitosamente' });
  } catch (error: any) {
    logger.error(`Error al eliminar (Usuario: ${user?.id}): ` + error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Obtiene el contenido de un archivo para vista previa.
 * Registra el acceso a contenidos específicos para auditoría de privacidad.
 * 
 * @param req Petición con la ruta del archivo en query.path
 * @param res JSON con el contenido (texto) o el archivo directamente (media)
 */
export const getFileContent = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  try {
    const relativePath = (req.query.path as string) || '';

    if (!isValidPath(relativePath)) {
      return res.status(403).json({ error: 'Ruta no válida' });
    }

    const fullPath = path.join(BASE_DIR, relativePath);
    const ext = path.extname(fullPath).toLowerCase();

    logger.info(`[AUDIT] Usuario ${user?.id} previsualizó el archivo: ${relativePath}`);

    // Archivos de texto
    const textExtensions = ['.txt', '.md', '.json', '.js', '.css', '.html', '.xml', '.csv'];
    if (textExtensions.includes(ext)) {
      const content = await fs.readFile(fullPath, 'utf-8');
      return res.json({ type: 'text', content });
    }

    // Imágenes, videos, audio - servir el archivo directamente
    const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mp3', '.wav', '.pdf'];
    if (mediaExtensions.includes(ext)) {
      return res.sendFile(fullPath);
    }
    res.status(400).json({ error: 'Tipo de archivo no soportado para vista previa' });
  } catch (error: any) {
    logger.error(`Error al obtener contenido (Usuario: ${user?.id}): ` + error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Inicia la descarga de un archivo.
 * Registra la descarga para control de fuga de información.
 * 
 * @param req Petición con la ruta del archivo en query.path
 * @param res Stream de descarga del archivo
 */
export const downloadFile = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  try {
    const relativePath = (req.query.path as string) || '';

    if (!isValidPath(relativePath)) {
      return res.status(403).json({ error: 'Ruta no válida' });
    }

    const fullPath = path.join(BASE_DIR, relativePath);
    logger.info(`[AUDIT] Usuario ${user?.id} DESCARGÓ el archivo: ${relativePath}`);
    res.download(fullPath);
  } catch (error: any) {
    logger.error(`Error al descargar (Usuario: ${user?.id}): ` + error.message);
    res.status(500).json({ error: error.message });
  }
}


