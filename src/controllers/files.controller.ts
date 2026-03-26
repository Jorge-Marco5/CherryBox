import { Request, Response } from "express";
import { logger } from "../utils/logger";
import { isValidPath } from "../utils/multer";
import path from "path";
import fs from "fs/promises";
import { getSetting, getBaseDir } from "../utils/settings";
import dotenv from "dotenv";

dotenv.config();

const BASE_DIR = getBaseDir();

export const dashboard = (req: Request, res: Response) => {
  try {
    res.render('dashboard');
  } catch (error: any) {
    logger.error('Error al cargar la página: ' + error.message);
    res.status(500).send(`
      <html>
        <head>
          <title>Error</title>
        </head>
        <body>
          <h1>Error al cargar la página</h1>
          <p>${error.message}</p>
        </body>
      </html>
      `);
  }
}

export const listFiles = async (req: Request, res: Response) => {
  try {
    const relativePath = (req.query.path as string) || '';

    if (!isValidPath(relativePath)) {
      logger.error('Ruta no válida: ' + relativePath);
      return res.status(403).json({ error: 'Ruta no válida' });
    }

    const fullPath = path.join(BASE_DIR, relativePath);
    const items = await fs.readdir(fullPath, { withFileTypes: true });

    // Usamos Promise.allSettled para que un error en un archivo no falle todo el listado
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
          // Si falla stat (permisos, symlink roto, race condition), lo ignoramos o logueamos warning
          // Retornamos null para filtrarlo después
          logger.warn(`No se pudo obtener info de ${item.name}: ${err.message}`);
          return null;
        }
      })
    );

    const files = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);

    res.json({ files, currentPath: relativePath });
  } catch (error) {
    const err = error as Error;
    logger.error('Error al listar archivos: ' + err.message);
    res.status(500).json({ error: err.message });
  }
}

export const searchFiles = async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q) {
      return res.json([]);
    }

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
          } catch (err) {
            const error = err as Error;
            logger.warn(`No se pudo obtener info de ${item.name} durante búsqueda: ${error.message}`);
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

export const createFolder = async (req: Request, res: Response) => {
  try {
    const { path: relativePath, name } = req.body;

    if (!isValidPath(relativePath)) {
      logger.error('Ruta no válida: ' + relativePath);
      return res.status(403).json({ error: 'Ruta no válida' });
    }

    const fullPath = path.join(BASE_DIR, relativePath, name);
    await fs.mkdir(fullPath, { recursive: true });

    res.json({ success: true, message: 'Carpeta creada' });
  } catch (error: any) {
    logger.error('Error al crear carpeta: ' + error.message);
    res.status(500).json({ error: error.message });
  }
}

export const uploadFiles = async (req: Request, res: Response) => {
  try {
    console.log('Recibiendo archivos...');
    console.log('Query path:', req.query.path as string);
    console.log('Archivos recibidos:', req.files?.length || 0);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se subieron archivos' });
    }

    const files = req.files as Express.Multer.File[];
    const uploadedFiles = files.map(file => {
      console.log('Archivo guardado:', file.path);
      return {
        name: file.filename,
        size: file.size,
        path: file.path
      };
    });

    res.json({
      success: true,
      message: `${uploadedFiles.length} archivo(s) subido(s) correctamente`,
      files: uploadedFiles
    });
  } catch (error: any) {
    console.error('Error al subir archivos:', error);
    res.status(500).json({ error: error.message });
  }
}

export const renameFile = async (req: Request, res: Response) => {
  try {
    const { oldPath, newName } = req.body;

    if (!oldPath || !newName) {
      return res.status(400).json({ error: 'Faltan parámetros (oldPath o newName)' });
    }

    if (!isValidPath(oldPath)) {
      logger.error('Ruta no válida: ' + oldPath);
      return res.status(403).json({ error: 'Ruta no válida' });
    }

    const oldFullPath = path.join(BASE_DIR, oldPath);
    const newFullPath = path.join(path.dirname(oldFullPath), newName);

    // Verificar que el archivo/carpeta original existe
    try {
      await fs.access(oldFullPath);
    } catch {
      return res.status(404).json({ error: 'El archivo o carpeta no existe' });
    }

    // Verificar que el nuevo nombre no existe ya
    try {
      await fs.access(newFullPath);
      return res.status(409).json({ error: 'Ya existe un archivo con ese nombre' });
    } catch {
      // No existe, podemos continuar
    }

    await fs.rename(oldFullPath, newFullPath);
    logger.info('Renombrado:', oldFullPath, '->', newFullPath);

    res.json({ success: true, message: 'Renombrado exitosamente' });
  } catch (error: any) {
    logger.error('Error al renombrar:', error);
    res.status(500).json({ error: error.message });
  }
}

export const deleteFile = async (req: Request, res: Response) => {
  try {
    // Intentar obtener la ruta desde body o query
    const relativePath = req.body?.path || (req.query?.path as string);

    if (!relativePath) {
      return res.status(400).json({ error: 'No se proporcionó la ruta del archivo' });
    }

    if (!isValidPath(relativePath)) {
      return res.status(403).json({ error: 'Ruta no válida' });
    }

    const fullPath = path.join(BASE_DIR, relativePath);

    // Verificar que el archivo/carpeta existe
    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({ error: 'El archivo o carpeta no existe' });
    }

    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
      logger.info('Carpeta eliminada:', fullPath);
    } else {
      await fs.unlink(fullPath);
      logger.info('Archivo eliminado:', fullPath);
    }

    res.json({ success: true, message: 'Eliminado exitosamente' });
  } catch (error: any) {
    logger.error('Error al eliminar:', error);
    res.status(500).json({ error: error.message });
  }
}

export const getFileContent = async (req: Request, res: Response) => {
  try {
    const relativePath = (req.query.path as string) || '';

    if (!isValidPath(relativePath)) {
      return res.status(403).json({ error: 'Ruta no válida' });
    }

    const fullPath = path.join(BASE_DIR, relativePath);
    const ext = path.extname(fullPath).toLowerCase();

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
    logger.error('Error al obtener contenido de archivo:', error);
    res.status(500).json({ error: error.message });
  }
}

export const downloadFile = async (req: Request, res: Response) => {
  try {
    const relativePath = (req.query.path as string) || '';

    if (!isValidPath(relativePath)) {
      return res.status(403).json({ error: 'Ruta no válida' });
    }

    const fullPath = path.join(BASE_DIR, relativePath);
    res.download(fullPath);
  } catch (error: any) {
    logger.error('Error al descargar archivo:', error);
    res.status(500).json({ error: error.message });
  }
}


